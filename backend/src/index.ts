import "dotenv/config";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { scValToNative, rpc, xdr, Address, Contract, nativeToScVal } from "@stellar/stellar-sdk";
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
  CREATE TABLE IF NOT EXISTS loan_liquidations (
    id TEXT PRIMARY KEY,
    ledger INTEGER NOT NULL,
    borrower TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS loan_liquidations_ledger_idx ON loan_liquidations(ledger DESC);
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

app.get<{ Querystring: { after?: string; limit?: string } }>("/api/lending/liquidations", async (request) => {
  const after = Math.max(0, Number(request.query.after ?? 0) || 0);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit ?? 50) || 50));
  const rows = database.prepare(`
    SELECT id, ledger, borrower, payload
    FROM loan_liquidations WHERE ledger > ? ORDER BY ledger DESC LIMIT ?
  `).all(after, limit) as Array<{ id: string; ledger: number; borrower: string; payload: string }>;
  return rows.map((row) => JSON.parse(row.payload));
});

app.get<{ Params: { address: string } }>("/api/lending/positions/:address", async (request, reply) => {
  const { address } = request.params;
  if (!config.LOAN_MANAGER_CONTRACT_ID) {
    return reply.code(503).send({ error: "loan_manager_not_configured" });
  }
  try {
    Address.fromString(address);
  } catch {
    return reply.code(400).send({ error: "invalid_address" });
  }
  try {
    const position = await readContractValue(
      config.LOAN_MANAGER_CONTRACT_ID,
      "get_position",
      [new Address(address).toScVal()],
    );
    return { address, position: position ?? null };
  } catch (error) {
    app.log.error({ err: error }, "loan_manager get_position read failed");
    return reply.code(502).send({ error: "rpc_read_failed" });
  }
});

app.get("/api/lending/pool", async (_request, reply) => {
  if (!config.LOAN_MANAGER_CONTRACT_ID) {
    return reply.code(503).send({ error: "loan_manager_not_configured" });
  }
  try {
    const pool = await readContractValue(config.LOAN_MANAGER_CONTRACT_ID, "get_pool_state", []);
    return { pool: pool ?? null };
  } catch (error) {
    app.log.error({ err: error }, "loan_manager get_pool_state read failed");
    return reply.code(502).send({ error: "rpc_read_failed" });
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

async function readContractValue(contractId: string, method: string, args: xdr.ScVal[]): Promise<unknown> {
  const contract = new Contract(contractId);
  const operation = contract.call(method, ...args);
  const account = await rpcServer.getAccount(
    (await rpcServer.getLatestLedger()).sequence.toString(),
  ).catch(() => undefined);
  if (!account) {
    throw new Error("unable to resolve source account for contract read");
  }
  const transaction = new (await import("@stellar/stellar-sdk")).TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: config.STELLAR_NETWORK === "mainnet"
      ? "Public Global Stellar Network ; September 2015"
      : "Test SDF Network ; September 2015",
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
  const simulation = await rpcServer.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(simulation.error);
  }
  const result = (simulation as rpc.Api.SimulateTransactionSuccessResponse).result;
  return result ? decodeScVal(result.retval) : null;
}

async function pollContractEvents(): Promise<void> {
  if (!config.STELLAR_CONTRACT_ID || pollRunning) {
    return;
  }
  pollRunning = true;
  try {
    const latest = await rpcServer.getLatestLedger();
    const startLedger = lastScannedLedger ?? Math.max(1, latest.sequence - 100);
    const response = await rpcServer.getEvents({
      startLedger,
      filters: [{ type: "contract", contractIds: [config.STELLAR_CONTRACT_ID] }],
      limit: 100,
    });
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
  } catch (error) {
    rpcHealthy = false;
    app.log.error({ err: error }, "contract event poll failed");
  } finally {
    pollRunning = false;
  }
}

if (config.STELLAR_CONTRACT_ID) {
  pollTimer = setInterval(() => {
    void pollContractEvents();
  }, config.POLL_INTERVAL_MS);
  void pollContractEvents();
}

async function shutdown(): Promise<void> {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  await app.close();
  database.close();
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await app.listen({ host: config.HOST, port: config.PORT });
