import "dotenv/config";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { scValToNative, rpc, xdr } from "@stellar/stellar-sdk";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Environment schema
// ---------------------------------------------------------------------------

const envSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(8787),
  STELLAR_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  STELLAR_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  STELLAR_CONTRACT_ID: z.string().default(""),
  START_LEDGER: z.coerce.number().int().nonnegative().optional(),
  POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  DATABASE_PATH: z.string().default("./data/stellarsettle.sqlite"),
  METADATA_API_KEY: z.string().default(""),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  // Issue #65: rate-limit env vars
  RATE_LIMIT_READ_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WRITE_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
});

const config = envSchema.parse(process.env);
const databasePath = resolve(config.DATABASE_PATH);
mkdirSync(dirname(databasePath), { recursive: true });

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS contract_events (
    id TEXT PRIMARY KEY,
    ledger INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    shipment_id TEXT,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS contract_events_ledger_idx ON contract_events(ledger DESC);
  CREATE TABLE IF NOT EXISTS shipment_metadata (
    shipment_id TEXT NOT NULL,
    metadata_key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shipment_id, metadata_key)
  );
`);

// ---------------------------------------------------------------------------
// Issue #66: Pluggable per-event-type decoders
// ---------------------------------------------------------------------------

type ContractEventRecord = {
  id: string;
  ledger: number;
  type: string;
  shipmentId?: string;
  [key: string]: unknown;
};

type EventDecoder = (
  id: string,
  ledger: number,
  topics: unknown[],
  value: unknown,
) => ContractEventRecord | null;

const eventDecoders: Record<string, EventDecoder> = {
  dispute_escalated: (id, ledger, topics, value) => {
    const payload = value;
    if (!Array.isArray(payload) || payload.length < 3) return null;
    const numbers = (payload as unknown[]).slice(0, 3).map(Number);
    if (numbers.some((n) => !Number.isFinite(n))) return null;
    const [milestoneIndex, openedLedger, currentLedger] = numbers as [number, number, number];
    return {
      id,
      ledger,
      type: "dispute_escalated",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex,
      openedLedger,
      currentLedger,
    };
  },

  shipment_created: (id, ledger, topics) => ({
    id,
    ledger,
    type: "shipment_created",
    shipmentId: String(topics[1] ?? ""),
  }),

  proof_submitted: (id, ledger, topics, value) => {
    const payload = value;
    const [shipmentId, milestoneIndex] = Array.isArray(payload)
      ? payload
      : [topics[1], topics[2]];
    return {
      id,
      ledger,
      type: "proof_submitted",
      shipmentId: String(shipmentId ?? ""),
      milestoneIndex: Number(milestoneIndex ?? 0),
    };
  },

  milestone_confirmed: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "milestone_confirmed",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex: Number(arr[0] ?? 0),
      paymentAmount: String(arr[1] ?? "0"),
    };
  },

  dispute_raised: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "dispute_raised",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex: Number(arr[0] ?? 0),
    };
  },

  partial_uncontested_released: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "partial_uncontested_released",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex: Number(arr[0] ?? 0),
      uncontestedAmount: String(arr[1] ?? "0"),
      feeAmount: String(arr[2] ?? "0"),
    };
  },

  dispute_resolved: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "dispute_resolved",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex: Number(arr[0] ?? 0),
      approved: Boolean(arr[1]),
    };
  },

  dispute_evidence_submitted: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "dispute_evidence_submitted",
      shipmentId: String(topics[1] ?? ""),
      milestoneIndex: Number(arr[0] ?? 0),
      caller: String(arr[1] ?? ""),
      evidenceHash: String(arr[2] ?? ""),
      evidenceType: String(arr[3] ?? ""),
    };
  },

  escalation_threshold_set: (id, ledger, _topics, value) => ({
    id,
    ledger,
    type: "escalation_threshold_set",
    thresholdLedgers: Number(value ?? 0),
  }),

  shipment_cancelled: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "shipment_cancelled",
      shipmentId: String(topics[1] ?? ""),
      refundAmount: String(arr[1] ?? "0"),
    };
  },

  milestones_rebalanced: (id, ledger, topics) => ({
    id,
    ledger,
    type: "milestones_rebalanced",
    buyer: String(topics[1] ?? ""),
  }),

  nft_mint_hook: (id, ledger, topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "nft_mint_hook",
      shipmentId: String(topics[1] ?? ""),
      buyer: String(arr[0] ?? ""),
      supplier: String(arr[1] ?? ""),
      totalAmount: String(arr[2] ?? "0"),
      ledgerSequence: Number(arr[3] ?? 0),
      metadataHash: String(arr[4] ?? ""),
    };
  },

  contract_upgraded: (id, ledger, _topics, value) => {
    const payload = value;
    const arr = Array.isArray(payload) ? payload : [];
    return {
      id,
      ledger,
      type: "contract_upgraded",
      newWasmHash: String(arr[0] ?? ""),
      ledgerSequence: Number(arr[1] ?? 0),
    };
  },
};

// ---------------------------------------------------------------------------
// Issue #64: Zod validation helpers
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  after: z.coerce.number().int().nonnegative().optional().default(0),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const shipmentIdParamSchema = z.object({
  id: z.string().min(1).max(128),
});

const metadataParamSchema = z.object({
  shipmentId: z.string().min(1).max(128),
});

const metadataKeyParamSchema = z.object({
  shipmentId: z.string().min(1).max(128),
  key: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
});

const metadataBodySchema = z.object({
  value: z.string().max(4000),
});

function validateQuery<T>(
  schema: z.ZodType<T>,
  query: unknown,
  reply: FastifyReply,
): T | null {
  const result = schema.safeParse(query);
  if (!result.success) {
    void reply.code(400).send({ error: "invalid_query", details: result.error.flatten() });
    return null;
  }
  return result.data;
}

function validateParams<T>(
  schema: z.ZodType<T>,
  params: unknown,
  reply: FastifyReply,
): T | null {
  const result = schema.safeParse(params);
  if (!result.success) {
    void reply.code(400).send({ error: "invalid_params", details: result.error.flatten() });
    return null;
  }
  return result.data;
}

function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  reply: FastifyReply,
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    void reply.code(400).send({ error: "invalid_body", details: result.error.flatten() });
    return null;
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

// EscalationEvent kept for stream typing (unchanged behavior)
type EscalationEvent = {
  id: string;
  ledger: number;
  type: "dispute_escalated";
  shipmentId: string;
  milestoneIndex: number;
  openedLedger: number;
  currentLedger: number;
};

const app = Fastify({ logger: true });
const streams = new Set<(event: EscalationEvent) => void>();
const rpcServer = new rpc.Server(config.STELLAR_RPC_URL);
let lastScannedLedger = config.START_LEDGER;
let pollTimer: NodeJS.Timeout | undefined;
let pollRunning = false;
let rpcHealthy = false;

await app.register(cors, { origin: config.WEB_ORIGIN });

// Issue #65: Rate limiting
await app.register(rateLimit, {
  global: false, // per-route configuration below
});

// Issue #63: OpenAPI / Swagger
await app.register(swagger, {
  openapi: {
    info: {
      title: "StellarSettle Backend API",
      description:
        "Soroban RPC event monitor and shipment metadata API for the StellarSettle escrow contract.",
      version: "0.1.0",
    },
    servers: [{ url: `http://${config.HOST}:${config.PORT}` }],
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
    tags: [
      { name: "health", description: "Service health" },
      { name: "events", description: "Contract event queries" },
      { name: "shipments", description: "Shipment queries" },
      { name: "metadata", description: "Off-chain metadata storage" },
      { name: "stream", description: "Server-sent events" },
    ],
  },
});

await app.register(swaggerUi, {
  routePrefix: "/api/docs",
  uiConfig: { docExpansion: "list", deepLinking: false },
  staticCSP: true,
  transformSpecificationClone: true,
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get(
  "/api/health",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_READ_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["health"],
      summary: "Service health",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            network: { type: "string" },
            contractConfigured: { type: "boolean" },
            eventMonitor: { type: "string" },
            lastScannedLedger: { type: ["integer", "null"] },
          },
        },
      },
    },
  },
  async () => ({
    status: "ok",
    network: config.STELLAR_NETWORK,
    contractConfigured: Boolean(config.STELLAR_CONTRACT_ID),
    eventMonitor: config.STELLAR_CONTRACT_ID ? (rpcHealthy ? "connected" : "connecting") : "disabled",
    lastScannedLedger: lastScannedLedger ?? null,
  }),
);

app.get<{ Querystring: { after?: string; limit?: string } }>(
  "/api/events",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_READ_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["events"],
      summary: "List contract events",
      querystring: {
        type: "object",
        properties: {
          after: { type: "integer", minimum: 0, description: "Return events with ledger > after" },
          limit: { type: "integer", minimum: 1, maximum: 100, description: "Max results (default 50)" },
        },
      },
      response: { 200: { type: "array", items: { type: "object" } } },
    },
  },
  async (request, reply) => {
    const query = validateQuery(paginationSchema, request.query, reply);
    if (!query) return;
    const { after, limit } = query;
    const rows = database
      .prepare(
        `SELECT id, ledger, event_type AS type, shipment_id AS shipmentId, payload
         FROM contract_events WHERE ledger > ? ORDER BY ledger DESC LIMIT ?`,
      )
      .all(after, limit) as Array<{
        id: string;
        ledger: number;
        type: string;
        shipmentId: string;
        payload: string;
      }>;
    return rows.map((row) => JSON.parse(row.payload));
  },
);

app.get<{ Querystring: { after?: string; limit?: string } }>(
  "/api/shipments",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_READ_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["shipments"],
      summary: "List shipments",
      querystring: {
        type: "object",
        properties: {
          after: { type: "integer", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            shipments: { type: "array", items: { type: "object" } },
            nextCursor: { type: ["string", "null"] },
          },
        },
        503: { type: "object", properties: { error: { type: "string" } } },
      },
    },
  },
  async (request, reply) => {
    if (!config.STELLAR_CONTRACT_ID) {
      return reply.code(503).send({ error: "contract_not_configured" });
    }
    const query = validateQuery(paginationSchema, request.query, reply);
    if (!query) return;
    try {
      return { shipments: [], nextCursor: null };
    } catch (error) {
      app.log.error({ err: error }, "Failed to query shipments");
      return reply.code(503).send({ error: "contract_query_failed" });
    }
  },
);

app.get<{ Params: { id: string } }>(
  "/api/shipments/:id",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_READ_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["shipments"],
      summary: "Get a shipment by ID",
      params: {
        type: "object",
        properties: { id: { type: "string", description: "Shipment ID" } },
        required: ["id"],
      },
      response: {
        404: { type: "object", properties: { error: { type: "string" } } },
        503: { type: "object", properties: { error: { type: "string" } } },
      },
    },
  },
  async (request, reply) => {
    if (!config.STELLAR_CONTRACT_ID) {
      return reply.code(503).send({ error: "contract_not_configured" });
    }
    const params = validateParams(shipmentIdParamSchema, request.params, reply);
    if (!params) return;
    try {
      return reply.code(404).send({ error: "shipment_not_found" });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("shipment not found")) {
        return reply.code(404).send({ error: "shipment_not_found" });
      }
      app.log.error({ err: error }, "Failed to query shipment");
      return reply.code(503).send({ error: "contract_query_failed" });
    }
  },
);

app.get<{ Params: { id: string } }>(
  "/api/shipments/:id/milestones",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_READ_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["shipments"],
      summary: "Get milestones for a shipment",
      params: {
        type: "object",
        properties: { id: { type: "string", description: "Shipment ID" } },
        required: ["id"],
      },
      response: {
        404: { type: "object", properties: { error: { type: "string" } } },
        503: { type: "object", properties: { error: { type: "string" } } },
      },
    },
  },
  async (request, reply) => {
    if (!config.STELLAR_CONTRACT_ID) {
      return reply.code(503).send({ error: "contract_not_configured" });
    }
    const params = validateParams(shipmentIdParamSchema, request.params, reply);
    if (!params) return;
    try {
      return reply.code(404).send({ error: "shipment_not_found" });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("shipment not found")) {
        return reply.code(404).send({ error: "shipment_not_found" });
      }
      app.log.error({ err: error }, "Failed to query milestones");
      return reply.code(503).send({ error: "contract_query_failed" });
    }
  },
);

app.get<{ Params: { shipmentId: string } }>(
  "/api/metadata/:shipmentId",
  {
    config: { rateLimit: { max: config.RATE_LIMIT_READ_MAX, timeWindow: config.RATE_LIMIT_WINDOW_MS } },
    schema: {
      tags: ["metadata"],
      summary: "Get off-chain metadata for a shipment",
      params: {
        type: "object",
        properties: { shipmentId: { type: "string" } },
        required: ["shipmentId"],
      },
      response: { 200: { type: "object", additionalProperties: true } },
    },
  },
  async (request, reply) => {
    const params = validateParams(metadataParamSchema, request.params, reply);
    if (!params) return;
    const rows = database
      .prepare(
        `SELECT metadata_key AS key, value, updated_at AS updatedAt
         FROM shipment_metadata WHERE shipment_id = ? ORDER BY metadata_key`,
      )
      .all(params.shipmentId) as Array<{ key: string; value: string; updatedAt: string }>;
    return Object.fromEntries(rows.map((row) => [row.key, { value: row.value, updatedAt: row.updatedAt }]));
  },
);

app.put<{ Params: { shipmentId: string; key: string }; Body: { value?: unknown } }>(
  "/api/metadata/:shipmentId/:key",
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
    if (!config.METADATA_API_KEY || request.headers["x-api-key"] !== config.METADATA_API_KEY) {
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
    return reply.code(204).send();
  },
);

app.get(
  "/api/stream",
  {
    config: { rateLimit: { max: 10, timeWindow: 60_000 } },
    schema: {
      tags: ["stream"],
      summary: "Server-sent events stream for dispute_escalated events",
      response: { 200: { type: "string", description: "text/event-stream" } },
    },
  },
  async (request, reply) => {
    reply.hijack();
    const response = reply.raw;
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "access-control-allow-origin": config.WEB_ORIGIN,
    });
    response.write(": connected\n\n");
    const writeEvent = (event: EscalationEvent) =>
      response.write(`id: ${event.id}\nevent: dispute_escalated\ndata: ${JSON.stringify(event)}\n\n`);
    streams.add(writeEvent);
    const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 20_000);
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      streams.delete(writeEvent);
    });
  },
);

// ---------------------------------------------------------------------------
// Event scanning (Issue #66: pluggable decoder registry)
// ---------------------------------------------------------------------------

function decodeScVal(value: xdr.ScVal): unknown {
  return scValToNative(value) as unknown;
}

async function scanEvents(): Promise<void> {
  if (pollRunning || !config.STELLAR_CONTRACT_ID) return;
  pollRunning = true;
  try {
    const latestLedger = (await rpcServer.getLatestLedger()).sequence;
    if (lastScannedLedger === undefined) {
      lastScannedLedger = Math.max(1, latestLedger - 10);
    }
    const startLedger = Math.max(1, lastScannedLedger + 1);
    if (startLedger > latestLedger) {
      rpcHealthy = true;
      return;
    }
    const filters = [{ type: "contract" as const, contractIds: [config.STELLAR_CONTRACT_ID] }];
    let cursor: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const page = cursor
        ? await rpcServer.getEvents({ cursor, filters, limit: 100 })
        : await rpcServer.getEvents({ startLedger, endLedger: latestLedger, filters, limit: 100 });

      for (const event of page.events) {
        const topics = event.topic.map((topic) => decodeScVal(topic));
        const eventType = String(topics[0] ?? "");
        const decoder = eventDecoders[eventType];
        if (!decoder) continue; // unknown event type — skip

        const value = decodeScVal(event.value);
        const parsed = decoder(event.id, event.ledger, topics, value);
        if (!parsed) continue;

        const inserted = database
          .prepare(
            `INSERT OR IGNORE INTO contract_events (id, ledger, event_type, shipment_id, payload)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            parsed.id,
            parsed.ledger,
            parsed.type,
            parsed.shipmentId ?? null,
            JSON.stringify(parsed),
          );

        // Emit to SSE streams for escalation events (unchanged behavior)
        if (Number(inserted.changes) > 0 && parsed.type === "dispute_escalated") {
          streams.forEach((write) => write(parsed as EscalationEvent));
        }
      }

      hasMore = page.events.length === 100 && page.cursor !== cursor;
      cursor = page.cursor;
    }

    lastScannedLedger = latestLedger;
    rpcHealthy = true;
  } catch (error) {
    rpcHealthy = false;
    app.log.error({ err: error }, "Soroban RPC event poll failed");
  } finally {
    pollRunning = false;
  }
}

if (config.STELLAR_CONTRACT_ID) {
  await scanEvents();
  pollTimer = setInterval(() => void scanEvents(), config.POLL_INTERVAL_MS);
}

app.addHook("onClose", async () => {
  if (pollTimer) clearInterval(pollTimer);
  database.close();
});

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
