import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { EventMonitor, type ContractEvent } from "./eventMonitor.ts";
import { migrateDatabase } from "./migrate.ts";
import { createCheckpointStore } from "./scanCheckpoint.ts";

type Options = ConstructorParameters<typeof EventMonitor>[0];

test("restart replays only events after the persisted cursor", async () => {
  // Mock RPC with predefined events on ledgers 101..110.
  const predefined = Array.from({ length: 10 }, (_, i) => ({ ledger: 101 + i, id: `e${101 + i}` }) as ContractEvent);
  const health = { status: "healthy", oldestLedger: 1, latestLedger: 105, ledgerRetentionWindow: 1000 };
  const rpc = {
    getHealth: async () => health,
    getEvents: async ({ startLedger, endLedger }: { startLedger: number; endLedger: number }) => ({
      events: predefined.filter((e) => e.ledger >= startLedger && e.ledger < endLedger),
    }),
  } as unknown as Options["rpc"];

  const db = new DatabaseSync(":memory:");
  migrateDatabase(db);
  const store = createCheckpointStore(db, "testnet", "contract");
  const processed: string[] = [];
  const make = () => new EventMonitor({
    rpc, contractId: "contract", checkpoint: store.load(), maxPages: 10,
    save: (state) => store.save(state), process: (e) => { processed.push(e.id); },
    log: { info: () => {}, warn: () => {} }, retry: { maxAttempts: 1, baseDelayMs: 0 },
  });

  // First run processes events up to cursor C = 105.
  store.save({ lastScannedLedger: 100 });
  await make().scan();
  assert.equal(store.load().lastScannedLedger, 105);
  const beforeRestart = processed.length;

  // Restart: new monitor loads the persisted cursor; chain has advanced to 110.
  health.latestLedger = 110;
  await make().scan();

  const replayed = processed.slice(beforeRestart);
  assert.deepEqual(replayed, ["e106", "e107", "e108", "e109", "e110"]);
  assert.deepEqual(processed, predefined.map((e) => e.id));
  assert.equal(new Set(processed).size, processed.length);
  assert.equal(store.load().lastScannedLedger, 110);
});
