import "dotenv/config";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import { registerSchemaValidation } from "./schemaValidation.js";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scValToNative, rpc, xdr } from "@stellar/stellar-sdk";
import { z } from "zod";
import { EventMonitor } from "./eventMonitor.js";
import { createCheckpointStore } from "./scanCheckpoint.js";
import { migrateDatabase } from "./migrate.js";
import { monitorConfig } from "./monitorConfig.js";
import { isAllowedWebOrigin, webOriginsSchema } from "./webOrigins.js";
import { inc, observeRequestDuration, renderMetrics } from "./metrics.js";
import { ContractCache } from "./contractCache.js";
import { registerWalletMutationRateLimit } from "./walletRateLimit.js";
import { registerStellarSignatureAuth } from "./stellarSignatureAuth.js";
import { registerShipmentPagination } from "./shipmentsPagination.js";
import { registerHealthz } from "./healthz.js";
import { globalAgent as httpAgent } from "node:http";
import { globalAgent as httpsAgent } from "node:https";

/**
 * Make a read-only Soroban contract call via RPC simulation.
 *
 * Uses `rpc.Server.queryContract`, which builds a simulated transaction
 * (no signatures required) and returns the decoded return value.
 *
 * @param method  Contract function name (e.g. "get_contract_stats")
 * @param args    Arguments object keyed by parameter name (empty for no-arg calls)
 * @returns       Decoded native JS value from the contract's return ScVal
 */
async function readContract<T = unknown>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  try {
    const { result } = await rpcServer.queryContract(config.STELLAR_CONTRACT_ID, method, args);
    return result as T;
  } catch (error) {
    inc("rpc_errors_total");
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Environment schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(8787),
  STELLAR_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  STELLAR_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  STELLAR_CONTRACT_ID: z.string().default(""),
  ...monitorConfig.shape,
  POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  DATABASE_PATH: z.string().default("./data/stellarsettle.sqlite"),
  METADATA_API_KEY: z.string().default(""),
  WEB_ORIGIN: webOriginsSchema,
  // Issue #65: rate-limit env vars
  RATE_LIMIT_READ_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  CONTRACT_CACHE_TTL_MS: z.coerce.number().int().nonnegative().default(5_000),
});

const config = envSchema.parse(process.env);
const databasePath = config.DATABASE_PATH === ":memory:" ? ":memory:" : resolve(config.DATABASE_PATH);
if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

export function initDatabase(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL");
  migrateDatabase(db);
}

export const database = new DatabaseSync(databasePath);
initDatabase(database);
initApiKeys(database, config.METADATA_API_KEY);

export type EscalationEvent = {
  id: string;
  ledger: number;
  type: "dispute_escalated";
  shipmentId: string;
  milestoneIndex: number;
  openedLedger: number;
  currentLedger: number;
};

const app = Fastify({
  logger: true,
  requestIdHeader: "x-request-id",
  genReqId: (request) => request.headers["x-request-id"]?.toString() || randomUUID(),
});
registerSchemaValidation(app);
const streams = new Set<(event: EscalationEvent) => void>();
// Tracks the raw ServerResponse of every live SSE connection so onClose can drain them.
const sseResponses = new Set<ServerResponse>();
// Bound concurrent sockets to the RPC endpoint; keep-alive reuses them (see BACKEND_CONFIG.md).
const rpcMaxSockets = Number(process.env.RPC_MAX_SOCKETS ?? 10);
httpAgent.maxSockets = rpcMaxSockets;
httpsAgent.maxSockets = rpcMaxSockets;
const rpcServer = new rpc.Server(config.STELLAR_RPC_URL);
const contractCache = new ContractCache(config.CONTRACT_CACHE_TTL_MS, app.log);
const checkpointStore = createCheckpointStore(database, config.STELLAR_NETWORK, config.STELLAR_CONTRACT_ID);
const rpcCursorStore = createRpcCursorStore(resolve(dirname(databasePath), "soroban-rpc-cursor.json"));
const monitor = new EventMonitor({
  rpc: rpcServer,
  contractId: config.STELLAR_CONTRACT_ID,
  checkpoint: checkpointStore.load(),
  startLedger: config.START_LEDGER,
  backfillFromLedger: config.BACKFILL_FROM_LEDGER,
  maxPages: config.BACKFILL_MAX_PAGES,
  save: (state) => {
    checkpointStore.save(state);
    rpcCursorStore.save({ ledgerCursor: state.lastScannedLedger });
  },
  log: app.log,
  process: (event) => {
    const topics = event.topic.map((topic) => decodeScVal(topic));
    if (topics[0] === "shipment_created") inc("shipments_total");
    if (topics[0] === "milestone_confirmed") inc("milestones_confirmed_total");
    if (topics[0] !== "dispute_escalated") return;
    const payload = decodeScVal(event.value);
    if (!Array.isArray(payload) || payload.length < 3) return;
    const numbers = payload.slice(0, 3).map(Number);
    if (numbers.some((number) => !Number.isFinite(number))) return;
    const [milestoneIndex, openedLedger, currentLedger] = numbers as [number, number, number];
    const parsed: EscalationEvent = {
      id: event.id,
      ledger: event.ledger,
      type: "dispute_escalated",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex,
      openedLedger,
      currentLedger,
    };
    const inserted = database.prepare(`
      INSERT OR IGNORE INTO contract_events (id, ledger, event_type, shipment_id, payload)
      VALUES (?, ?, ?, ?, ?)
    `).run(parsed.id, parsed.ledger, parsed.type, parsed.shipmentId, JSON.stringify(parsed));
    if (Number(inserted.changes) > 0) streams.forEach((write) => write(parsed));
  },
});
let pollTimer: NodeJS.Timeout | undefined;
let loanPollTimer: NodeJS.Timeout | undefined;
let webhookTimer: NodeJS.Timeout | undefined;
let pollRunning = false;
let loanPollRunning = false;
let rpcHealthy = false;

await app.register(cors, { origin: config.WEB_ORIGIN, exposeHeaders: ["x-request-id"] });
await registerWalletMutationRateLimit(app, {
  max: config.RATE_LIMIT_WRITE_MAX,
  timeWindow: config.RATE_LIMIT_WINDOW_MS,
});
registerStellarSignatureAuth(app);
registerShipmentPagination(app, database);
registerHealthz(app, () => rpcHealthy);

app.addHook("onRequest", async (request, reply) => {
  reply.header("x-request-id", request.id);
});

app.addHook("onResponse", async (request, reply) => {
  recordRequest(request.method, request.routeOptions.url ?? "unmatched", reply.statusCode, reply.elapsedTime);
  request.log.info({
    requestId: request.id,
    route: request.routeOptions.url,
    statusCode: reply.statusCode,
    durationMs: reply.elapsedTime,
  }, "Request completed");
  observeRequestDuration(reply.elapsedTime / 1000);
});

app.get("/metrics", async (_request, reply) => {
  reply.type("text/plain; version=0.0.4");
  return renderMetrics();
});

app.get("/v1/api/health", async () => ({
  status: "ok",
  network: config.STELLAR_NETWORK,
  contractConfigured: Boolean(config.STELLAR_CONTRACT_ID),
  eventMonitor: config.STELLAR_CONTRACT_ID ? (rpcHealthy ? "connected" : "connecting") : "disabled",
  lastScannedLedger: monitor.lastScannedLedger ?? null,
  backfill: config.STELLAR_CONTRACT_ID ? monitor.backfill : null,
}));

// #52: GET /api/shipments/:id/fees endpoint (must come before /api/shipments to avoid route collision)
app.get<{ Params: { shipmentId: string } }>("/v1/api/shipments/:shipmentId/fees", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  const { shipmentId } = request.params;

  try {
    // In production, this would fetch shipment and fee data from contract
    // For now, return the endpoint structure
    return {
      shipmentId,
      platformFeeBps: 0,
      platformFee: 0,
      arbiterFeeBps: 0,
      logisticsFeeBps: 0,
      buyerCancelFeeBps: 0,
      disputeBondAmount: 0,
      disputeBondBps: 0,
      note: "contract_query_endpoint_ready_for_rpc_integration",
    };
  } catch (error) {
    app.log.error({ err: error }, "Failed to fetch shipment fees");
    return reply.code(500).send({ error: "fees_query_failed" });
  }
});

// #49: Role-indexed shipment list endpoints
app.get<{ Querystring: { role?: string; address?: string; cursor?: string; limit?: string; tag?: string } }>(
  "/v1/api/shipments",
  async (request, reply) => {
    if (!config.STELLAR_CONTRACT_ID) {
      return reply.code(503).send({ error: "contract_not_configured" });
    }

    const { role, address, cursor, limit, tag } = request.query;
    
    if (!role) {
      return reply.code(400).send({ error: "role parameter is required (supplier|buyer|arbiter|logistics|jurisdiction)" });
    }

    if (role !== "jurisdiction" && !address) {
      return reply.code(400).send({ error: "address parameter is required for this role" });
    }

    if (role === "jurisdiction" && !tag) {
      return reply.code(400).send({ error: "tag parameter is required for jurisdiction role" });
    }

    const pageSize = Math.min(100, Math.max(1, Number(limit ?? 50) || 50));
    const pageOffset = Math.max(0, Number(cursor ?? 0) || 0);

    try {
      let shipmentIds: string[] = [];

      if (role === "jurisdiction" && tag) {
        // For jurisdiction queries, return from database or indicate not cached
        // In production, would query the contract or cache layer
        return {
          shipmentIds: [],
          cursor: null,
          limit: pageSize,
          total: 0,
          note: "jurisdiction_queries_not_yet_cached",
        };
      } else if (["supplier", "buyer", "arbiter", "logistics"].includes(role) && address) {
        // For now, return empty result indicating these would query the contract
        // In production, this would invoke RPC to query contract storage or call contract methods
        return {
          role,
          address,
          shipmentIds: [],
          cursor: null,
          limit: pageSize,
          total: 0,
          note: "contract_query_endpoint_ready_for_rpc_integration",
        };
      }

      return reply.code(400).send({ error: "invalid_parameters" });
    } catch (error) {
      app.log.error({ err: error }, "Failed to fetch shipments");
      return reply.code(500).send({ error: "shipment_query_failed" });
    }
  }
);

app.get<{ Querystring: { after?: string; limit?: string } }>("/v1/api/events", async (request) => {
  const after = Math.max(0, Number(request.query.after ?? 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));
  const rows = database.prepare(`
    SELECT id, ledger, event_type AS type, shipment_id AS shipmentId, payload
    FROM contract_events WHERE ledger > ? ORDER BY ledger DESC LIMIT ?
  `).all(after, limit) as Array<{ id: string; ledger: number; type: string; shipmentId: string; payload: string }>;
  return rows.map((row) => JSON.parse(row.payload));
});

// ---------------------------------------------------------------------------
// Issue #74 – Loan manager event indexer endpoint
// ---------------------------------------------------------------------------
app.get<{ Querystring: { after?: string; limit?: string } }>("/v1/api/loan-events", async (request) => {
  const after = Math.max(0, Number(request.query.after ?? 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));
  const rows = database.prepare(`
    SELECT id, ledger, event_type AS type, payload
    FROM loan_manager_events WHERE ledger > ? ORDER BY ledger DESC LIMIT ?
  `).all(after, limit) as Array<{ id: string; ledger: number; type: string; payload: string }>;
  return rows.map((row) => JSON.parse(row.payload));
});

app.get<{ Querystring: { after?: string; limit?: string } }>("/v1/api/shipments", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  try {
    const after = Math.max(0, Number(request.query.after ?? 0) || 0);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));

    // Query contract for paginated shipment list
    // Returns array [shipment_ids, next_cursor]
    void after; void limit;
    return {
      shipments: [],
      nextCursor: null,
    };
  } catch (error) {
    request.log.error({ err: error }, "Failed to query shipments");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

await app.register(swaggerUi, {
  routePrefix: "/api/docs",
  uiConfig: { docExpansion: "list", deepLinking: false },
  staticCSP: true,
  transformSpecificationClone: true,
});


app.get<{ Params: { id: string } }>("/v1/api/shipments/:id/milestones", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  try {
    const { id } = request.params;
    void id;
    return reply.code(404).send({ error: "shipment_not_found" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("shipment not found")) {
      return reply.code(404).send({ error: "shipment_not_found" });
    }
    request.log.error({ err: error }, "Failed to query milestones");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

app.get<{ Params: { id: string } }>("/v1/api/shipments/:id/warranty", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  try {
    const { id } = request.params;
    const [claim, balance, endLedger] = await Promise.all([
      simulateContractRead("get_warranty_claim", [id]),
      simulateContractRead("get_warranty_balance", [id]),
      simulateContractRead("get_warranty_end_ledger", [id]),
    ]);
    return {
      shipmentId: id,
      claim: claim ?? null,
      balance: balance ?? null,
      warrantyEndLedger: endLedger ?? null,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("shipment not found")) {
      return reply.code(404).send({ error: "shipment_not_found" });
    }
    app.log.error({ err: error }, "Failed to query warranty");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

app.get<{ Querystring: { buyer?: string; address?: string } }>("/v1/api/standing-orders", async (request) => {
  const buyer = (request.query.buyer ?? request.query.address ?? "").trim();
  if (!buyer) {
    return [];
  }
  return [];
});

app.get<{ Params: { address: string } }>("/v1/api/standing-orders/:address", async (request, reply) => {
  const buyer = request.params.address.trim();
  if (!buyer) {
    return reply.code(400).send({ error: "invalid_buyer_address" });
  }
  return [];
});

const KNOWN_EVENT_TYPES = new Set([
  "dispute_escalated",
  "milestone_confirmed",
  "proof_submitted",
  "dispute_resolved",
  "shipment_completed",
  "shipment_cancelled",
]);
app.get<{ Params: { shipmentId: string } }>("/v1/api/metadata/:shipmentId", async (request) => {
  const rows = database.prepare(`
    SELECT metadata_key AS key, value, updated_at AS updatedAt
    FROM shipment_metadata WHERE shipment_id = ? ORDER BY metadata_key
  `).all(request.params.shipmentId) as Array<{ key: string; value: string; updatedAt: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, { value: row.value, updatedAt: row.updatedAt }]));
});

app.put<{ Params: { shipmentId: string; key: string }; Body: { value?: unknown } }>(
  "/v1/api/metadata/:shipmentId/:key",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_WRITE_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["metadata"],
      summary: "Set a metadata key for a shipment (requires API key)",
      security: [{ apiKey: [] }],
      params: {
        type: "object",
        properties: {
          shipmentId: { type: "string" },
          key: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,64}$" },
        },
        required: ["shipmentId", "key"],
      },
      body: {
        type: "object",
        required: ["value"],
        properties: { value: { type: "string", maxLength: 4000 } },
      },
      response: {
        204: { type: "null" },
        400: { type: "object", properties: { error: { type: "string" } } },
        401: { type: "object", properties: { error: { type: "string" } } },
      },
    },
  },
  async (request, reply) => {
    const apiKeyName = findApiKey(database, request.headers["x-api-key"]);
    if (!apiKeyName) {
      return reply.code(401).send({ error: "metadata_write_unauthorized" });
    }
    const params = validateParams(metadataKeyParamSchema, request.params, reply);
    if (!params) return;
    const body = validateBody(metadataBodySchema, request.body, reply);
    if (!body) return;
    database
      .prepare(
        `INSERT INTO shipment_metadata (shipment_id, metadata_key, value, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(shipment_id, metadata_key)
         DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      )
      .run(params.shipmentId, params.key, body.value);
    recordMetadataWrite(database, params.shipmentId, params.key, apiKeyName);
    return reply.code(204).send();
  },
);

app.get<{ Querystring: { types?: string } }>("/v1/api/stream", async (request, reply) => {
  const rawTypes = request.query.types;
  let typeFilter: Set<string> | null = null;
  if (rawTypes !== undefined && rawTypes !== "") {
    const requested = rawTypes.split(",").map((t) => t.trim()).filter(Boolean);
    for (const t of requested) {
      if (!KNOWN_EVENT_TYPES.has(t)) {
        return reply.code(400).send({ error: "unknown_event_type", type: t });
      }
    }
    typeFilter = new Set(requested);
  }

  reply.hijack();
  const response = reply.raw;
  const requestOrigin = request.headers.origin;
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    ...(isAllowedWebOrigin(requestOrigin, config.WEB_ORIGIN)
      ? { "access-control-allow-origin": requestOrigin }
      : {}),
  });
  response.write(": connected\n\n");
  const writeEvent = (event: EscalationEvent) =>
    response.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  streams.add(writeEvent);
  sseResponses.add(response);
  const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 20_000);
  request.raw.on("close", () => {
    clearInterval(heartbeat);
    streams.delete(writeEvent);
    sseResponses.delete(response);
  });
});

// --- Issue #62: short-TTL in-memory cache for read-only contract queries ---
type CacheEntry = { data: unknown; expiry: number };
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): unknown | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) { cache.delete(key); return undefined; }
  return entry.data;
}

function cacheSet(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

const TTL = { templates: 60_000, deadlines: 30_000, adminLog: 15_000 };

// --- Issue #59: GET /api/templates ---
app.get<{ Querystring: { owner?: string; nocache?: string } }>("/v1/api/templates", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }
  const { owner, nocache } = request.query;
  const cacheKey = `templates:${owner ?? ""}`;
  if (!nocache) {
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) return cached;
  }
  try {
    // list_milestone_templates(owner?: Address) -> Vec<MilestoneTemplate>
    // Stubbed: real implementation would call rpcServer.simulateTransaction(...)
    const templates: unknown[] = [];
    const result = { templates };
    cacheSet(cacheKey, result, TTL.templates);
    return result;
  } catch (error) {
    app.log.error({ err: error }, "Failed to query milestone templates");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

// --- Issue #60: GET /api/deadlines/upcoming ---
app.get<{ Querystring: { withinLedgers?: string; nocache?: string } }>("/v1/api/deadlines/upcoming", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }
  const withinLedgers = Math.max(1, Number(request.query.withinLedgers ?? 200) || 200);
  const nocache = request.query.nocache;
  const cacheKey = `deadlines:${withinLedgers}`;
  if (!nocache) {
    const cached = cacheGet(cacheKey);
    if (cached !== undefined) return cached;
  }
  try {
    // get_upcoming_deadlines(within_ledgers: u32) -> Vec<MilestoneDeadline>
    // check_deadline_warning is called per milestone to flag near-expiry items
    // Sorted by nearest deadline first (ascending deadline_ledger)
    const milestones: unknown[] = [];
    const result = { withinLedgers, milestones };
    cacheSet(cacheKey, result, TTL.deadlines);
    return result;
  } catch (error) {
    app.log.error({ err: error }, "Failed to query upcoming deadlines");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

// --- Issue #61: GET /api/admin-log ---
app.get<{ Querystring: { action?: string; fromLedger?: string; toLedger?: string; nocache?: string } }>(
  "/v1/api/admin-log",
  async (request, reply) => {
    if (!findApiKey(database, request.headers["x-api-key"])) {
      return reply.code(401).send({ error: "admin_log_unauthorized" });
    }
    if (!config.STELLAR_CONTRACT_ID) {
      return reply.code(503).send({ error: "contract_not_configured" });
    }
    const { action, fromLedger, toLedger, nocache } = request.query;
    const from = fromLedger !== undefined ? Math.max(0, Number(fromLedger) || 0) : undefined;
    const to = toLedger !== undefined ? Math.max(0, Number(toLedger) || 0) : undefined;
    const cacheKey = `adminlog:${action ?? ""}:${from ?? ""}:${to ?? ""}`;
    if (!nocache) {
      const cached = cacheGet(cacheKey);
      if (cached !== undefined) return cached;
    }
    try {
      // get_admin_log() -> Vec<AdminAction>
      // get_admin_log_filtered(action_type, from_ledger, to_ledger) -> Vec<AdminAction>
      const entries: unknown[] = [];
      const result = { entries, filters: { action: action ?? null, fromLedger: from ?? null, toLedger: to ?? null } };
      cacheSet(cacheKey, result, TTL.adminLog);
      return result;
    } catch (error) {
      app.log.error({ err: error }, "Failed to query admin log");
      return reply.code(503).send({ error: "contract_query_failed" });
    }
  },
);

function decodeScVal(value: xdr.ScVal): unknown {
  return scValToNative(value) as unknown;
}

/**
 * Simulates a read-only contract function call via Soroban RPC and returns
 * the decoded native value. Returns null when the contract returns void/None.
 */
async function simulateContractRead(fn: string, args: string[]): Promise<unknown> {
  return contractCache.get(`${fn}:${args.join(",")}`, () => simulateContractReadUncached(fn, args));
}

async function simulateContractReadUncached(fn: string, args: string[]): Promise<unknown> {
  const { Account, Contract, TransactionBuilder, BASE_FEE, Networks, nativeToScVal } =
    await import("@stellar/stellar-sdk");
  const networkPassphrase = config.STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
  // Simulation requires a source account; a well-known zero-balance key is sufficient for read-only calls.
  const source = new Account("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHMO", "0");
  const contract = new Contract(config.STELLAR_CONTRACT_ID);
  const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call(fn, ...args.map((arg) => nativeToScVal(arg, { type: "string" }))))
    .setTimeout(30)
    .build();
  const sim = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!retval) return null;
  const native = decodeScVal(retval);
  return native === undefined ? null : native;
}

async function scanEvents(): Promise<void> {
  if (pollRunning || !config.STELLAR_CONTRACT_ID) return;
  pollRunning = true;
  try {
  await monitor.scan();
    rpcHealthy = true;
    for (const event of response.events) {
      const payload = decodeScVal(event.value) as Record<string, unknown>;
      const shipmentId = String(payload.shipmentId ?? payload.shipment_id ?? "");
      const escalation: EscalationEvent = {
        id: event.id,
        ledger: event.ledger,
        type: "dispute_escalated",
        shipmentId,
        milestoneIndex: Number(payload.milestoneIndex ?? payload.milestone_index ?? 0),
        openedLedger: Number(payload.openedLedger ?? payload.opened_ledger ?? event.ledger),
        currentLedger: event.ledger,
      };
      database.prepare(`
        INSERT OR IGNORE INTO contract_events (id, ledger, event_type, shipment_id, payload)
        VALUES (?, ?, ?, ?, ?)
      `).run(escalation.id, escalation.ledger, escalation.type, shipmentId, JSON.stringify(escalation));
      for (const stream of streams) {
        stream(escalation);
      }
    }
    lastScannedLedger = latest.sequence;
    recordPoll(true);
  } catch (error) {
    rpcHealthy = false;
    inc("rpc_errors_total");
    app.log.error({ err: error }, "contract event poll failed");
  } finally {
    pollRunning = false;
  }
}

if (config.STELLAR_CONTRACT_ID) {
  const restored = rpcCursorStore.load();
  if (restored?.ledgerCursor) {
    app.log.info({ ledgerCursor: restored.ledgerCursor }, "Resuming Soroban RPC subscription from stored cursor");
  }
  pollTimer = setInterval(() => { void scanEvents(); }, config.POLL_INTERVAL_MS);
  void scanEvents();
}

app.addHook("onClose", async () => {
  if (pollTimer) clearInterval(pollTimer);
  if (loanPollTimer) clearInterval(loanPollTimer);
  if (webhookTimer) clearInterval(webhookTimer);
  // Send a final SSE comment then end each live connection so clients receive
  // a clean EOF rather than an abrupt socket drop.
  for (const res of sseResponses) {
    try { res.end(": server shutting down\n\n"); } catch { /* already closed */ }
  }
  sseResponses.clear();
  streams.clear();
  database.close();
});

// Trigger Fastify's close lifecycle (runs onClose hooks) on SIGTERM and SIGINT.
async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Received shutdown signal; closing server");
  // Give in-flight requests up to 10 s to finish before forcing exit.
  setTimeout(() => process.exit(1), 10_000).unref();
  try {
    await app.close();
  } catch (err) {
    app.log.error({ err }, "Error during shutdown");
    process.exitCode = 1;
  }
}
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("SIGINT",  () => { void shutdown("SIGINT"); });

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
