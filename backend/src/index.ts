import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { scValToNative, rpc, xdr } from "@stellar/stellar-sdk";
import { z } from "zod";

const envSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(8787),
  STELLAR_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  STELLAR_RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  STELLAR_CONTRACT_ID: z.string().default(""),
  LOAN_MANAGER_CONTRACT_ID: z.string().default(""),
  START_LEDGER: z.coerce.number().int().nonnegative().optional(),
  POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  DATABASE_PATH: z.string().default("./data/stellarsettle.sqlite"),
  METADATA_API_KEY: z.string().default(""),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  HEALTH_RPC_TIMEOUT_MS: z.coerce.number().int().min(500).default(5000),
  WEBHOOK_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
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
  CREATE TABLE IF NOT EXISTS loan_manager_events (
    id TEXT PRIMARY KEY,
    ledger INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS loan_manager_events_ledger_idx ON loan_manager_events(ledger DESC);
  CREATE TABLE IF NOT EXISTS shipment_metadata (
    shipment_id TEXT NOT NULL,
    metadata_key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shipment_id, metadata_key)
  );
  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    shipment_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    delivered_at TEXT,
    failed_at TEXT,
    last_error TEXT,
    UNIQUE(webhook_id, event_id)
  );
  CREATE INDEX IF NOT EXISTS webhook_deliveries_pending_idx
    ON webhook_deliveries(delivered_at, failed_at);
`);

type EscalationEvent = {
  id: string;
  ledger: number;
  type: "dispute_escalated";
  shipmentId: string;
  milestoneIndex: number;
  openedLedger: number;
  currentLedger: number;
};

type LoanManagerEvent = {
  id: string;
  ledger: number;
  type: string;
  payload: unknown;
};

const app = Fastify({ logger: true });
const streams = new Set<(event: EscalationEvent) => void>();
const rpcServer = new rpc.Server(config.STELLAR_RPC_URL);
let lastScannedLedger = config.START_LEDGER;
let lastScannedLoanLedger: number | undefined = config.START_LEDGER;
let pollTimer: NodeJS.Timeout | undefined;
let loanPollTimer: NodeJS.Timeout | undefined;
let webhookTimer: NodeJS.Timeout | undefined;
let pollRunning = false;
let loanPollRunning = false;
let rpcHealthy = false;

await app.register(cors, { origin: config.WEB_ORIGIN });

// ---------------------------------------------------------------------------
// Issue #73 – Deep health check covering DB and RPC reachability
// ---------------------------------------------------------------------------
app.get("/api/health", async (_request, reply) => {
  const checks: Record<string, "ok" | "error"> = {};

  // DB connectivity check
  try {
    database.prepare("SELECT 1").get();
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  // Bounded RPC connectivity check
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.HEALTH_RPC_TIMEOUT_MS);
    await Promise.race([
      rpcServer.getLatestLedger(),
      new Promise<never>((_, reject) =>
        controller.signal.addEventListener("abort", () => reject(new Error("rpc_timeout")))
      ),
    ]);
    clearTimeout(timer);
    checks.rpc = "ok";
  } catch {
    checks.rpc = "error";
  }

  const healthy = checks.db === "ok" && (checks.rpc === "ok" || !config.STELLAR_CONTRACT_ID);
  const status = healthy ? "healthy" : "degraded";

  return reply.code(healthy ? 200 : 503).send({
    status,
    network: config.STELLAR_NETWORK,
    contractConfigured: Boolean(config.STELLAR_CONTRACT_ID),
    loanManagerConfigured: Boolean(config.LOAN_MANAGER_CONTRACT_ID),
    eventMonitor: config.STELLAR_CONTRACT_ID ? (rpcHealthy ? "connected" : "connecting") : "disabled",
    lastScannedLedger: lastScannedLedger ?? null,
    checks,
  });
});

app.get<{ Querystring: { after?: string; limit?: string } }>("/api/events", async (request) => {
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
app.get<{ Querystring: { after?: string; limit?: string } }>("/api/loan-events", async (request) => {
  const after = Math.max(0, Number(request.query.after ?? 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));
  const rows = database.prepare(`
    SELECT id, ledger, event_type AS type, payload
    FROM loan_manager_events WHERE ledger > ? ORDER BY ledger DESC LIMIT ?
  `).all(after, limit) as Array<{ id: string; ledger: number; type: string; payload: string }>;
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
    void after; void limit;
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
    void id;
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
    void id;
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

// ---------------------------------------------------------------------------
// Escrow contract event scanner
// ---------------------------------------------------------------------------
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

        // Register webhooks from contract events
        if (topics[0] === "webhook_registered") {
          const webhookId = event.id;
          const webhookUrl = String(topics[1] ?? "");
          const webhookShipmentId = topics[2] != null ? String(topics[2]) : null;
          if (webhookUrl.startsWith("http")) {
            database.prepare(`
              INSERT OR IGNORE INTO webhooks (id, url, shipment_id)
              VALUES (?, ?, ?)
            `).run(webhookId, webhookUrl, webhookShipmentId);
          }
          continue;
        }

        if (topics[0] !== "dispute_escalated") continue;
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
        if (Number(inserted.changes) > 0) {
          streams.forEach((write) => write(parsed));
          // Enqueue webhook deliveries for this event
          enqueueWebhookDeliveries(parsed.id, parsed.shipmentId);
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

// ---------------------------------------------------------------------------
// Issue #74 – Loan manager event indexer
// ---------------------------------------------------------------------------
async function scanLoanManagerEvents(): Promise<void> {
  if (loanPollRunning || !config.LOAN_MANAGER_CONTRACT_ID) return;
  loanPollRunning = true;
  try {
    const latestLedger = (await rpcServer.getLatestLedger()).sequence;
    if (lastScannedLoanLedger === undefined) {
      lastScannedLoanLedger = Math.max(1, latestLedger - 10);
    }
    const startLedger = Math.max(1, lastScannedLoanLedger + 1);
    if (startLedger > latestLedger) return;

    const filters = [{ type: "contract" as const, contractIds: [config.LOAN_MANAGER_CONTRACT_ID] }];
    let cursor: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const page = cursor
        ? await rpcServer.getEvents({ cursor, filters, limit: 100 })
        : await rpcServer.getEvents({ startLedger, endLedger: latestLedger, filters, limit: 100 });

      for (const event of page.events) {
        const topics = event.topic.map((topic) => decodeScVal(topic));
        const eventType = String(topics[0] ?? "unknown");
        const rawPayload = decodeScVal(event.value);
        const parsed: LoanManagerEvent = {
          id: event.id,
          ledger: event.ledger,
          type: eventType,
          payload: rawPayload,
        };
        database.prepare(`
          INSERT OR IGNORE INTO loan_manager_events (id, ledger, event_type, payload)
          VALUES (?, ?, ?, ?)
        `).run(parsed.id, parsed.ledger, parsed.type, JSON.stringify(parsed));
      }

      hasMore = page.events.length === 100 && page.cursor !== cursor;
      cursor = page.cursor;
    }

    lastScannedLoanLedger = latestLedger;
  } catch (error) {
    app.log.error({ err: error }, "Loan manager RPC event poll failed");
  } finally {
    loanPollRunning = false;
  }
}

// ---------------------------------------------------------------------------
// Issue #80 – Webhook dispatcher for confirmation_webhooks
// ---------------------------------------------------------------------------
function enqueueWebhookDeliveries(eventId: string, shipmentId: string | null): void {
  const hooks = database.prepare(`
    SELECT id FROM webhooks WHERE shipment_id IS NULL OR shipment_id = ?
  `).all(shipmentId) as Array<{ id: string }>;

  for (const hook of hooks) {
    database.prepare(`
      INSERT OR IGNORE INTO webhook_deliveries (webhook_id, event_id)
      VALUES (?, ?)
    `).run(hook.id, eventId);
  }
}

async function dispatchWebhooks(): Promise<void> {
  const pending = database.prepare(`
    SELECT wd.id, wd.webhook_id, wd.event_id, wd.attempts,
           w.url, ce.payload
    FROM webhook_deliveries wd
    JOIN webhooks w ON w.id = wd.webhook_id
    JOIN contract_events ce ON ce.id = wd.event_id
    WHERE wd.delivered_at IS NULL AND wd.failed_at IS NULL
      AND wd.attempts < ?
    ORDER BY wd.id
    LIMIT 50
  `).all(config.WEBHOOK_MAX_ATTEMPTS) as Array<{
    id: number;
    webhook_id: string;
    event_id: string;
    attempts: number;
    url: string;
    payload: string;
  }>;

  for (const row of pending) {
    // Exponential backoff: skip if too soon since last attempt
    const backoffMs = Math.min(30_000, 1_000 * Math.pow(2, row.attempts));
    const lastAttemptResult = database.prepare(`
      SELECT last_attempt_at FROM webhook_deliveries WHERE id = ?
    `).get(row.id) as { last_attempt_at: string | null } | undefined;
    const lastAttemptAt = lastAttemptResult?.last_attempt_at;
    if (lastAttemptAt) {
      const elapsed = Date.now() - new Date(lastAttemptAt).getTime();
      if (elapsed < backoffMs) continue;
    }

    const body = row.payload;
    let success = false;
    let lastError: string | null = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(row.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      success = res.ok;
      if (!res.ok) lastError = `http_${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    const newAttempts = row.attempts + 1;
    const isFinalFailure = !success && newAttempts >= config.WEBHOOK_MAX_ATTEMPTS;

    if (success) {
      database.prepare(`
        UPDATE webhook_deliveries
        SET attempts = ?, delivered_at = CURRENT_TIMESTAMP, last_attempt_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newAttempts, row.id);
      app.log.info({ webhookId: row.webhook_id, eventId: row.event_id }, "Webhook delivered");
    } else if (isFinalFailure) {
      database.prepare(`
        UPDATE webhook_deliveries
        SET attempts = ?, last_attempt_at = CURRENT_TIMESTAMP,
            failed_at = CURRENT_TIMESTAMP, last_error = ?
        WHERE id = ?
      `).run(newAttempts, lastError, row.id);
      app.log.error(
        { webhookId: row.webhook_id, eventId: row.event_id, error: lastError },
        "Webhook delivery permanently failed after max attempts",
      );
    } else {
      database.prepare(`
        UPDATE webhook_deliveries
        SET attempts = ?, last_attempt_at = CURRENT_TIMESTAMP, last_error = ?
        WHERE id = ?
      `).run(newAttempts, lastError, row.id);
      app.log.warn(
        { webhookId: row.webhook_id, eventId: row.event_id, attempt: newAttempts, error: lastError },
        "Webhook delivery attempt failed, will retry",
      );
    }
  }
}

if (config.STELLAR_CONTRACT_ID) {
  await scanEvents();
  pollTimer = setInterval(() => void scanEvents(), config.POLL_INTERVAL_MS);
  webhookTimer = setInterval(() => void dispatchWebhooks(), config.POLL_INTERVAL_MS);
}

if (config.LOAN_MANAGER_CONTRACT_ID) {
  await scanLoanManagerEvents();
  loanPollTimer = setInterval(() => void scanLoanManagerEvents(), config.POLL_INTERVAL_MS);
}

app.addHook("onClose", async () => {
  if (pollTimer) clearInterval(pollTimer);
  if (loanPollTimer) clearInterval(loanPollTimer);
  if (webhookTimer) clearInterval(webhookTimer);
  database.close();
});

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
