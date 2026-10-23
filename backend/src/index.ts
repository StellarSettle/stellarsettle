import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  Account,
  BASE_FEE,
  Contract,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { z } from "zod";

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
});

const config = envSchema.parse(process.env);
const databasePath = resolve(config.DATABASE_PATH);
mkdirSync(dirname(databasePath), { recursive: true });

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
  CREATE TABLE IF NOT EXISTS standing_orders (
    order_id TEXT PRIMARY KEY,
    buyer TEXT NOT NULL,
    template_name TEXT NOT NULL DEFAULT '',
    supplier TEXT NOT NULL DEFAULT '',
    logistics TEXT NOT NULL DEFAULT '',
    arbiter TEXT NOT NULL DEFAULT '',
    token TEXT NOT NULL DEFAULT '',
    amount TEXT NOT NULL,
    interval_ledgers INTEGER NOT NULL,
    max_occurrences INTEGER NOT NULL,
    occurrences INTEGER NOT NULL DEFAULT 0,
    next_ledger INTEGER NOT NULL DEFAULT 0,
    cancelled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS standing_orders_buyer_idx ON standing_orders(buyer);
`);

type StandingOrderStatus = "Active" | "Completed" | "Cancelled";

type StandingOrderRecord = {
  order_id: string;
  orderId: string;
  buyer: string;
  template_name: string;
  templateName: string;
  supplier: string;
  logistics: string;
  arbiter: string;
  token: string;
  amount: string;
  interval_ledgers: number;
  intervalLedgers: number;
  interval: number;
  max_occurrences: number;
  maxOccurrences: number;
  occurrences: number;
  next_ledger: number;
  nextLedger: number;
  next_run: number;
  nextRun: number;
  cancelled: boolean;
  status: StandingOrderStatus;
  schedule: {
    intervalLedgers: number;
    nextLedger: number;
    occurrences: number;
    maxOccurrences: number;
  };
};

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

app.get("/api/health", async () => ({
  status: "ok",
  network: config.STELLAR_NETWORK,
  contractConfigured: Boolean(config.STELLAR_CONTRACT_ID),
  eventMonitor: config.STELLAR_CONTRACT_ID ? (rpcHealthy ? "connected" : "connecting") : "disabled",
  lastScannedLedger: lastScannedLedger ?? null,
}));

app.get<{ Querystring: { after?: string; limit?: string } }>("/api/events", async (request) => {
  const after = Math.max(0, Number(request.query.after ?? 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));
  const rows = database.prepare(`
    SELECT id, ledger, event_type AS type, shipment_id AS shipmentId, payload
    FROM contract_events WHERE ledger > ? ORDER BY ledger DESC LIMIT ?
  `).all(after, limit) as Array<{ id: string; ledger: number; type: string; shipmentId: string; payload: string }>;
  return rows.map((row) => JSON.parse(row.payload));
});

app.get<{ Querystring: { after?: string; limit?: string } }>("/api/shipments", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  try {
    const after = Math.max(0, Number(request.query.after ?? 0) || 0);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));

    // Query contract for paginated shipment list
    // Returns array [shipment_ids, next_cursor]
    return {
      shipments: [],
      nextCursor: null,
    };
  } catch (error) {
    app.log.error({ err: error }, "Failed to query shipments");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

app.get<{ Params: { id: string } }>("/api/shipments/:id", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  try {
    const { id } = request.params;

    // Query contract for full shipment details
    // Returns Shipment struct
    return reply.code(404).send({ error: "shipment_not_found" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("shipment not found")) {
      return reply.code(404).send({ error: "shipment_not_found" });
    }
    app.log.error({ err: error }, "Failed to query shipment");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

app.get<{ Params: { id: string } }>("/api/shipments/:id/milestones", async (request, reply) => {
  if (!config.STELLAR_CONTRACT_ID) {
    return reply.code(503).send({ error: "contract_not_configured" });
  }

  try {
    const { id } = request.params;

    // Query contract for shipment and milestone details with notes
    // Returns { milestones: Array<Milestone & { notes: MilestoneNote[] }> }
    return reply.code(404).send({ error: "shipment_not_found" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("shipment not found")) {
      return reply.code(404).send({ error: "shipment_not_found" });
    }
    app.log.error({ err: error }, "Failed to query milestones");
    return reply.code(503).send({ error: "contract_query_failed" });
  }
});

app.get<{ Querystring: { buyer?: string; address?: string } }>("/api/standing-orders", async (request) => {
  const buyer = (request.query.buyer ?? request.query.address ?? "").trim();
  if (!buyer) {
    return [];
  }
  return listBuyerStandingOrders(buyer);
});

app.get<{ Params: { address: string } }>("/api/standing-orders/:address", async (request, reply) => {
  const buyer = request.params.address.trim();
  if (!buyer) {
    return reply.code(400).send({ error: "invalid_buyer_address" });
  }
  return listBuyerStandingOrders(buyer);
});

app.get<{ Params: { shipmentId: string } }>("/api/metadata/:shipmentId", async (request) => {
  const rows = database.prepare(`
    SELECT metadata_key AS key, value, updated_at AS updatedAt
    FROM shipment_metadata WHERE shipment_id = ? ORDER BY metadata_key
  `).all(request.params.shipmentId) as Array<{ key: string; value: string; updatedAt: string }>;
  return Object.fromEntries(rows.map((row) => [row.key, { value: row.value, updatedAt: row.updatedAt }]));
});

app.put<{ Params: { shipmentId: string; key: string }; Body: { value?: unknown } }>(
  "/api/metadata/:shipmentId/:key",
  async (request, reply) => {
    if (!config.METADATA_API_KEY || request.headers["x-api-key"] !== config.METADATA_API_KEY) {
      return reply.code(401).send({ error: "metadata_write_unauthorized" });
    }
    const { shipmentId, key } = request.params;
    const value = request.body?.value;
    if (!shipmentId || !/^[a-zA-Z0-9_-]{1,64}$/.test(key) || typeof value !== "string" || value.length > 4000) {
      return reply.code(400).send({ error: "invalid_metadata" });
    }
    database.prepare(`
      INSERT INTO shipment_metadata (shipment_id, metadata_key, value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(shipment_id, metadata_key)
      DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(shipmentId, key, value);
    return reply.code(204).send();
  },
);

app.get("/api/stream", async (request, reply) => {
  reply.hijack();
  const response = reply.raw;
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "access-control-allow-origin": config.WEB_ORIGIN,
  });
  response.write(": connected\n\n");
  const writeEvent = (event: EscalationEvent) => response.write(`id: ${event.id}\nevent: dispute_escalated\ndata: ${JSON.stringify(event)}\n\n`);
  streams.add(writeEvent);
  const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 20_000);
  request.raw.on("close", () => {
    clearInterval(heartbeat);
    streams.delete(writeEvent);
  });
});

function decodeScVal(value: xdr.ScVal): unknown {
  return scValToNative(value) as unknown;
}

const STANDING_ORDER_SCAN_LIMIT = 100;
const STANDING_ORDER_SCAN_BATCH = 10;
const SIMULATION_SOURCE_ACCOUNT = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

function deriveStandingOrderStatus(order: {
  cancelled: boolean;
  occurrences: number;
  max_occurrences: number;
}): StandingOrderStatus {
  if (order.cancelled) return "Cancelled";
  if (order.occurrences >= order.max_occurrences) return "Completed";
  return "Active";
}

function formatStandingOrder(raw: Record<string, unknown>): StandingOrderRecord {
  const orderId = String(raw.order_id ?? raw.orderId ?? "");
  const buyer = String(raw.buyer ?? "");
  const templateName = String(raw.template_name ?? raw.templateName ?? "");
  const supplier = String(raw.supplier ?? "");
  const logistics = String(raw.logistics ?? "");
  const arbiter = String(raw.arbiter ?? "");
  const token = String(raw.token ?? "");
  const amount = String(raw.amount ?? "0");
  const intervalLedgers = Number(raw.interval_ledgers ?? raw.intervalLedgers ?? 0);
  const maxOccurrences = Number(raw.max_occurrences ?? raw.maxOccurrences ?? 0);
  const occurrences = Number(raw.occurrences ?? 0);
  const nextLedger = Number(raw.next_ledger ?? raw.nextLedger ?? 0);
  const cancelled = Boolean(raw.cancelled);
  const status = deriveStandingOrderStatus({
    cancelled,
    occurrences,
    max_occurrences: maxOccurrences,
  });

  return {
    order_id: orderId,
    orderId,
    buyer,
    template_name: templateName,
    templateName,
    supplier,
    logistics,
    arbiter,
    token,
    amount,
    interval_ledgers: intervalLedgers,
    intervalLedgers,
    interval: intervalLedgers,
    max_occurrences: maxOccurrences,
    maxOccurrences,
    occurrences,
    next_ledger: nextLedger,
    nextLedger,
    next_run: nextLedger,
    nextRun: nextLedger,
    cancelled,
    status,
    schedule: {
      intervalLedgers,
      nextLedger,
      occurrences,
      maxOccurrences,
    },
  };
}

function upsertStandingOrder(order: StandingOrderRecord): void {
  database.prepare(`
    INSERT INTO standing_orders (
      order_id,
      buyer,
      template_name,
      supplier,
      logistics,
      arbiter,
      token,
      amount,
      interval_ledgers,
      max_occurrences,
      occurrences,
      next_ledger,
      cancelled,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(order_id) DO UPDATE SET
      buyer = excluded.buyer,
      template_name = CASE WHEN excluded.template_name != '' THEN excluded.template_name ELSE standing_orders.template_name END,
      supplier = CASE WHEN excluded.supplier != '' THEN excluded.supplier ELSE standing_orders.supplier END,
      logistics = CASE WHEN excluded.logistics != '' THEN excluded.logistics ELSE standing_orders.logistics END,
      arbiter = CASE WHEN excluded.arbiter != '' THEN excluded.arbiter ELSE standing_orders.arbiter END,
      token = CASE WHEN excluded.token != '' THEN excluded.token ELSE standing_orders.token END,
      amount = excluded.amount,
      interval_ledgers = excluded.interval_ledgers,
      max_occurrences = excluded.max_occurrences,
      occurrences = excluded.occurrences,
      next_ledger = excluded.next_ledger,
      cancelled = excluded.cancelled,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    order.order_id,
    order.buyer,
    order.template_name,
    order.supplier,
    order.logistics,
    order.arbiter,
    order.token,
    order.amount,
    order.interval_ledgers,
    order.max_occurrences,
    order.occurrences,
    order.next_ledger,
    order.cancelled ? 1 : 0,
  );
}

function getStoredStandingOrdersForBuyer(buyer: string): StandingOrderRecord[] {
  const rows = database.prepare(`
    SELECT
      order_id,
      buyer,
      template_name,
      supplier,
      logistics,
      arbiter,
      token,
      amount,
      interval_ledgers,
      max_occurrences,
      occurrences,
      next_ledger,
      cancelled
    FROM standing_orders
    WHERE buyer = ?
    ORDER BY CAST(order_id AS INTEGER) ASC
  `).all(buyer) as Array<Record<string, unknown>>;

  return rows.map((row) =>
    formatStandingOrder({
      ...row,
      cancelled: Boolean(row.cancelled),
    }),
  );
}

async function readStandingOrderFromContract(orderId: number): Promise<StandingOrderRecord | null> {
  if (!config.STELLAR_CONTRACT_ID) return null;
  try {
    const contract = new Contract(config.STELLAR_CONTRACT_ID);
    const account = new Account(SIMULATION_SOURCE_ACCOUNT, "0");
    const networkPassphrase = config.STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(contract.call("get_standing_order", nativeToScVal(BigInt(orderId), { type: "u64" })))
      .setTimeout(30)
      .build();

    const simulated = await rpcServer.simulateTransaction(transaction);
    if ("error" in simulated || !simulated.result?.retval) {
      return null;
    }
    const raw = decodeScVal(simulated.result.retval) as Record<string, unknown> | null;
    if (!raw || typeof raw !== "object") {
      return null;
    }
    return formatStandingOrder(raw);
  } catch {
    return null;
  }
}

async function listBuyerStandingOrders(buyer: string): Promise<StandingOrderRecord[]> {
  if (config.STELLAR_CONTRACT_ID) {
    const matched: StandingOrderRecord[] = [];
    for (let first = 1; first <= STANDING_ORDER_SCAN_LIMIT; first += STANDING_ORDER_SCAN_BATCH) {
      const ids = Array.from({ length: STANDING_ORDER_SCAN_BATCH }, (_, offset) => first + offset);
      const batch = await Promise.all(ids.map((id) => readStandingOrderFromContract(id)));
      for (const order of batch) {
        if (order) {
          upsertStandingOrder(order);
          if (order.buyer === buyer) {
            matched.push(order);
          }
        }
      }
      if (batch.includes(null)) break;
    }
    if (matched.length > 0) {
      return matched;
    }
  }

  return getStoredStandingOrdersForBuyer(buyer);
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
        const eventName = String(topics[0] ?? "");

        if (eventName === "standing_order_created") {
          const orderId = String(topics[1] ?? "");
          const payload = decodeScVal(event.value);
          const onChainOrder = Number.isFinite(Number(orderId))
            ? await readStandingOrderFromContract(Number(orderId))
            : null;
          if (onChainOrder) {
            upsertStandingOrder(onChainOrder);
          } else if (orderId && Array.isArray(payload) && payload.length >= 5) {
            upsertStandingOrder(
              formatStandingOrder({
                order_id: orderId,
                buyer: String(payload[0] ?? ""),
                template_name: String(payload[1] ?? ""),
                amount: String(payload[2] ?? "0"),
                interval_ledgers: Number(payload[3] ?? 0),
                max_occurrences: Number(payload[4] ?? 0),
                occurrences: 0,
                next_ledger: event.ledger,
                cancelled: false,
              }),
            );
          }
          continue;
        }

        if (eventName === "standing_order_executed") {
          const orderId = String(topics[1] ?? "");
          const payload = decodeScVal(event.value);
          if (orderId && Array.isArray(payload) && payload.length >= 3) {
            database.prepare(`
              UPDATE standing_orders
              SET occurrences = ?, next_ledger = ?, updated_at = CURRENT_TIMESTAMP
              WHERE order_id = ?
            `).run(Number(payload[1] ?? 0), Number(payload[2] ?? 0), orderId);
          }
          continue;
        }

        if (eventName === "standing_order_cancelled") {
          const orderId = String(topics[1] ?? "");
          if (orderId) {
            database.prepare(`
              UPDATE standing_orders
              SET cancelled = 1, updated_at = CURRENT_TIMESTAMP
              WHERE order_id = ?
            `).run(orderId);
          }
          continue;
        }

        if (eventName !== "dispute_escalated") continue;
        const payload = decodeScVal(event.value);
        if (!Array.isArray(payload) || payload.length < 3) continue;
        const numbers = payload.slice(0, 3).map(Number);
        if (numbers.some((number) => !Number.isFinite(number))) continue;
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
