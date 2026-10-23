import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scValToNative, rpc, xdr } from "@stellar/stellar-sdk";
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
const databasePath = config.DATABASE_PATH === ":memory:" ? ":memory:" : resolve(config.DATABASE_PATH);
if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

export function initDatabase(db: DatabaseSync): void {
  db.exec(`
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
}

export const database = new DatabaseSync(databasePath);
initDatabase(database);

export type EscalationEvent = {
  id: string;
  ledger: number;
  type: "dispute_escalated";
  shipmentId: string;
  milestoneIndex: number;
  openedLedger: number;
  currentLedger: number;
};

export type ShipmentCompletedEvent = {
  id: string;
  ledger: number;
  type: "shipment_completed";
  shipmentId: string;
  totalPaid: string;
};

export type ShipmentCancelledEvent = {
  id: string;
  ledger: number;
  type: "shipment_cancelled";
  shipmentId: string;
  refundAmount: string;
  reason?: string;
  cancelFee?: string;
  cancelledBy?: string;
};

export type ContractEvent = EscalationEvent | ShipmentCompletedEvent | ShipmentCancelledEvent;

export type RawContractEvent = {
  id: string;
  ledger: number;
  topic: Array<xdr.ScVal | string>;
  value: xdr.ScVal | string;
};

export const app = Fastify({ logger: true });
const streams = new Set<(event: ContractEvent) => void>();
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

app.get<{ Querystring: { after?: string; limit?: string; type?: string; shipmentId?: string } }>(
  "/api/events",
  async (request) => {
    const after = Math.max(0, Number(request.query.after ?? 0) || 0);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));
    const typeFilter = request.query.type?.trim();
    const shipmentIdFilter = request.query.shipmentId?.trim();

    const conditions = ["ledger > ?"];
    const params: Array<number | string> = [after];

    if (typeFilter) {
      conditions.push("event_type = ?");
      params.push(typeFilter);
    }
    if (shipmentIdFilter) {
      conditions.push("shipment_id = ?");
      params.push(shipmentIdFilter);
    }

    params.push(limit);

    const rows = database.prepare(`
      SELECT id, ledger, event_type AS type, shipment_id AS shipmentId, payload
      FROM contract_events
      WHERE ${conditions.join(" AND ")}
      ORDER BY ledger DESC, rowid DESC
      LIMIT ?
    `).all(...params) as Array<{ id: string; ledger: number; type: string; shipmentId: string; payload: string }>;
    return rows.map((row) => JSON.parse(row.payload));
  },
);

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
  const writeEvent = (event: ContractEvent) =>
    response.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  streams.add(writeEvent);
  const heartbeat = setInterval(() => response.write(": keepalive\n\n"), 20_000);
  request.raw.on("close", () => {
    clearInterval(heartbeat);
    streams.delete(writeEvent);
  });
});

export function decodeScVal(value: xdr.ScVal | string): unknown {
  const scVal = typeof value === "string" ? xdr.ScVal.fromXDR(value, "base64") : value;
  return scValToNative(scVal) as unknown;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asAmountString(value: unknown): string | undefined {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return String(value);
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return value.trim();
  }
  return undefined;
}

function normalizeReason(value: unknown): string | undefined {
  const direct = asNonEmptyString(value);
  if (direct && !/^-?\d+$/.test(direct)) {
    return direct;
  }
  if (Array.isArray(value) && value.length > 0) {
    const first = asNonEmptyString(value[0]);
    if (first && !/^-?\d+$/.test(first)) {
      return first;
    }
  }
  return undefined;
}

function extractEventHeader(topics: unknown[]): { eventName: string; topicShipmentId?: string } {
  if (topics[0] === "stellarsettle") {
    return {
      eventName: typeof topics[1] === "string" ? topics[1] : "",
      topicShipmentId: asNonEmptyString(topics[2]),
    };
  }
  return {
    eventName: typeof topics[0] === "string" ? topics[0] : "",
    topicShipmentId: asNonEmptyString(topics[1]),
  };
}

export function decodeDisputeEscalatedEvent(event: RawContractEvent): EscalationEvent | null {
  try {
    const topics = event.topic.map((topic) => decodeScVal(topic));
    const { eventName, topicShipmentId } = extractEventHeader(topics);
    if (eventName !== "dispute_escalated") return null;

    const payload = decodeScVal(event.value);
    if (Array.isArray(payload)) {
      const hasLeadingShipmentId = !topicShipmentId && typeof payload[0] === "string" && payload.length >= 4;
      const shipmentId = topicShipmentId ?? (hasLeadingShipmentId ? asNonEmptyString(payload[0]) : undefined);
      const offset = hasLeadingShipmentId ? 1 : 0;
      if (!shipmentId || payload.length < offset + 3) return null;
      const numbers = payload.slice(offset, offset + 3).map(Number);
      if (numbers.some((number) => !Number.isFinite(number))) return null;
      const [milestoneIndex, openedLedger, currentLedger] = numbers as [number, number, number];
      return {
        id: event.id,
        ledger: event.ledger,
        type: "dispute_escalated",
        shipmentId,
        milestoneIndex,
        openedLedger,
        currentLedger,
      };
    }

    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      const shipmentId = asNonEmptyString(record.shipment_id ?? record.shipmentId ?? topicShipmentId);
      const milestoneIndex = Number(record.milestone_index ?? record.milestoneIndex);
      const openedLedger = Number(record.opened_ledger ?? record.openedLedger);
      const currentLedger = Number(record.current_ledger ?? record.currentLedger ?? event.ledger);
      if (!shipmentId || [milestoneIndex, openedLedger, currentLedger].some((number) => !Number.isFinite(number))) {
        return null;
      }
      return {
        id: event.id,
        ledger: event.ledger,
        type: "dispute_escalated",
        shipmentId,
        milestoneIndex,
        openedLedger,
        currentLedger,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function decodeShipmentCompletedEvent(event: RawContractEvent): ShipmentCompletedEvent | null {
  try {
    const topics = event.topic.map((topic) => decodeScVal(topic));
    const { eventName, topicShipmentId } = extractEventHeader(topics);
    if (eventName !== "shipment_completed") return null;

    const payload = decodeScVal(event.value);
    let shipmentId: string | undefined = topicShipmentId;
    let totalPaid: string | undefined;

    if (Array.isArray(payload)) {
      const firstAsAmount = asAmountString(payload[0]);
      if (shipmentId && firstAsAmount !== undefined) {
        totalPaid = firstAsAmount;
      } else if (payload.length >= 2) {
        shipmentId = asNonEmptyString(payload[0]) ?? shipmentId;
        totalPaid = asAmountString(payload[1]);
      }
    } else if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      shipmentId = asNonEmptyString(record.shipment_id ?? record.shipmentId) ?? shipmentId;
      totalPaid = asAmountString(
        record.total_paid ?? record.totalPaid ?? record.released_amount ?? record.releasedAmount ?? record.amount,
      );
    } else {
      totalPaid = asAmountString(payload);
    }

    if (!shipmentId || totalPaid === undefined) return null;

    return {
      id: event.id,
      ledger: event.ledger,
      type: "shipment_completed",
      shipmentId,
      totalPaid,
    };
  } catch {
    return null;
  }
}

export function decodeShipmentCancelledEvent(event: RawContractEvent): ShipmentCancelledEvent | null {
  try {
    const topics = event.topic.map((topic) => decodeScVal(topic));
    const { eventName, topicShipmentId } = extractEventHeader(topics);
    if (eventName !== "shipment_cancelled") return null;

    const payload = decodeScVal(event.value);
    let shipmentId: string | undefined = topicShipmentId;
    let refundAmount: string | undefined;
    let reason: string | undefined;
    let cancelFee: string | undefined;
    let cancelledBy: string | undefined;

    if (Array.isArray(payload)) {
      const firstAsAmount = asAmountString(payload[0]);
      if (shipmentId && firstAsAmount !== undefined) {
        refundAmount = firstAsAmount;
        const secondAsAmount = asAmountString(payload[1]);
        if (secondAsAmount !== undefined) {
          cancelFee = secondAsAmount;
          cancelledBy = asNonEmptyString(payload[2]);
          reason = normalizeReason(payload[4]);
        } else {
          reason = normalizeReason(payload[1]);
        }
      } else if (payload.length >= 2) {
        shipmentId = asNonEmptyString(payload[0]) ?? shipmentId;
        refundAmount = asAmountString(payload[1]);
        reason = normalizeReason(payload[2]);
      }
    } else if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      shipmentId = asNonEmptyString(record.shipment_id ?? record.shipmentId) ?? shipmentId;
      refundAmount = asAmountString(
        record.refund_amount ?? record.refundAmount ?? record.refund ?? record.amount,
      );
      reason = normalizeReason(record.reason ?? record.cancellation_reason ?? record.cancellationReason);
      cancelFee = asAmountString(record.cancel_fee ?? record.cancelFee);
      cancelledBy = asNonEmptyString(record.cancelled_by ?? record.cancelledBy);
    } else {
      refundAmount = asAmountString(payload);
    }

    if (!shipmentId || refundAmount === undefined) return null;

    return {
      id: event.id,
      ledger: event.ledger,
      type: "shipment_cancelled",
      shipmentId,
      refundAmount,
      ...(reason ? { reason } : {}),
      ...(cancelFee !== undefined ? { cancelFee } : {}),
      ...(cancelledBy ? { cancelledBy } : {}),
    };
  } catch {
    return null;
  }
}

export function decodeContractEvent(event: RawContractEvent): ContractEvent | null {
  return (
    decodeShipmentCompletedEvent(event) ??
    decodeShipmentCancelledEvent(event) ??
    decodeDisputeEscalatedEvent(event)
  );
}

export function handleContractEvent(
  event: RawContractEvent,
  targetDb: DatabaseSync = database,
  listeners: Iterable<(event: ContractEvent) => void> = streams,
): ContractEvent | null {
  const parsed = decodeContractEvent(event);
  if (!parsed) return null;

  const inserted = targetDb.prepare(`
    INSERT OR IGNORE INTO contract_events (id, ledger, event_type, shipment_id, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(parsed.id, parsed.ledger, parsed.type, parsed.shipmentId, JSON.stringify(parsed));

  if (Number(inserted.changes) > 0) {
    for (const write of listeners) {
      write(parsed);
    }
  }

  return parsed;
}

export async function scanEvents(): Promise<void> {
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
        handleContractEvent(event);
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

app.addHook("onClose", async () => {
  if (pollTimer) clearInterval(pollTimer);
  database.close();
});

const isMainModule = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isMainModule) {
  if (config.STELLAR_CONTRACT_ID) {
    await scanEvents();
    pollTimer = setInterval(() => void scanEvents(), config.POLL_INTERVAL_MS);
  }

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}
