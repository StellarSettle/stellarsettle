import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventMonitor, type ContractEvent, type ScanCheckpoint } from "../src/eventMonitor.js";
import { createCheckpointStore } from "../src/scanCheckpoint.js";
import { monitorConfig } from "../src/monitorConfig.js";

type Options = ConstructorParameters<typeof EventMonitor>[0];
function fixture(overrides: Partial<Options> = {}) {
  const requests: any[] = [];
  const events: ContractEvent[] = [];
  const warnings: object[] = [];
  const saved: ScanCheckpoint[] = [];
  const health = { status: "healthy", oldestLedger: 1, latestLedger: 2500, ledgerRetentionWindow: 2500 };
  const pages: Array<{ events: ContractEvent[]; cursor?: string } | Error> = [];
  const rpc = {
    getHealth: async () => health,
    getEvents: async (request: unknown) => {
      requests.push(request);
      const page = pages.shift() ?? { events: [] };
      if (page instanceof Error) throw page;
      return page;
    },
  } as Options["rpc"];
  const options: Options = {
    rpc, contractId: "contract", checkpoint: { lastScannedLedger: 100 }, maxPages: 1,
    process: (event) => { events.push(event); }, save: (state) => { saved.push(state); },
    log: { info: () => {}, warn: (data) => { warnings.push(data); } }, ...overrides,
  };
  return { monitor: new EventMonitor(options), options, requests, events, warnings, saved, health, pages };
}
const event = (ledger: number, id = String(ledger)) => ({ ledger, id } as ContractEvent);

test("retained backlog is bounded per pass and includes the latest ledger", async () => {
  const f = fixture();
  await f.monitor.scan();
  assert.equal(f.requests.length, 1);
  assert.equal(f.monitor.lastScannedLedger, 1100);
  assert.equal(f.monitor.backfill.status, "running");
  await f.monitor.scan();
  f.pages.push({ events: [event(2500)] });
  await f.monitor.scan();
  assert.deepEqual(f.requests.map(({ startLedger, endLedger }) => [startLedger, endLedger]),
    [[101, 1101], [1101, 2101], [2101, 2501]]);
  assert.deepEqual(f.events.map((e) => e.ledger), [2500]);
  assert.equal(f.monitor.lastScannedLedger, 2500);
  assert.equal(f.monitor.backfill.status, "complete");
  await f.monitor.scan();
  assert.equal(f.requests.length, 3);
  assert.equal(f.warnings.length, 0);
});

test("expired history is explicitly reported and the retained suffix is recovered", async () => {
  const f = fixture({ maxPages: 10 });
  f.health.oldestLedger = 500;
  await f.monitor.scan();
  assert.equal(f.requests[0].startLedger, 500);
  assert.deepEqual(f.warnings, [{ fromLedger: 101, toLedger: 499, oldestLedger: 500, latestLedger: 2500 }]);
  assert.deepEqual(f.monitor.backfill.retentionGap, { fromLedger: 101, toLedger: 499 });
  assert.equal(f.monitor.backfill.status, "complete");
  const restart = new EventMonitor({ ...f.options, checkpoint: f.saved.at(-1)! });
  await restart.scan();
  assert.deepEqual(restart.backfill.retentionGap, { fromLedger: 101, toLedger: 499 });
});

test("inclusive recovery override takes precedence over legacy START_LEDGER and saved position", async () => {
  const f = fixture({ backfillFromLedger: 42, startLedger: 200 });
  await f.monitor.scan();
  assert.equal(f.requests[0].startLedger, 42);
  const legacy = fixture({ startLedger: 200 });
  await legacy.monitor.scan();
  assert.equal(legacy.requests[0].startLedger, 201);
  const fresh = fixture({ checkpoint: {} });
  await fresh.monitor.scan();
  assert.equal(fresh.requests[0].startLedger, 2491);
});

test("full pages resume with cursor only and exclude newer ledgers until the next range", async () => {
  const f = fixture();
  f.pages.push({ events: Array.from({ length: 100 }, (_, i) => event(101, String(i))), cursor: "page-1" });
  await f.monitor.scan();
  assert.equal(f.monitor.lastScannedLedger, 100);
  f.pages.push({ events: [event(1100), event(1101)], cursor: "page-2" });
  await f.monitor.scan();
  assert.deepEqual(f.requests[1], { cursor: "page-1", filters: f.requests[0].filters, limit: 100 });
  assert.equal(f.monitor.lastScannedLedger, 1100);
  assert.equal(f.events.at(-1)?.ledger, 1100);
  f.pages.push({ events: [event(1101)] });
  await f.monitor.scan();
  assert.equal(f.events.at(-1)?.ledger, 1101);
});

test("RPC failures and stuck cursors never advance the checkpoint", async () => {
  const f = fixture();
  const full = Array.from({ length: 100 }, (_, i) => event(101, String(i)));
  f.pages.push({ events: full, cursor: "same" }, new Error("offline"), { events: full, cursor: "same" });
  await f.monitor.scan();
  await assert.rejects(f.monitor.scan(), /offline/);
  await assert.rejects(f.monitor.scan(), /pagination did not advance/);
  assert.equal(f.monitor.lastScannedLedger, 100);
  assert.equal(f.saved.length, 0);
  await f.monitor.scan();
  assert.equal(f.monitor.lastScannedLedger, 1100);
});

test("a failed event write replays the range; a failed checkpoint write does not advance memory", async () => {
  let fail = true;
  const f = fixture({ process: () => { if (fail) throw new Error("write failed"); } });
  f.pages.push({ events: [event(101)] });
  await assert.rejects(f.monitor.scan(), /write failed/);
  assert.equal(f.monitor.lastScannedLedger, 100);
  fail = false;
  f.pages.push({ events: [event(101)] });
  await f.monitor.scan();
  assert.equal(f.requests[1].startLedger, 101);
  const disk = fixture({ save: () => { throw new Error("disk full"); } });
  await assert.rejects(disk.monitor.scan(), /disk full/);
  assert.equal(disk.monitor.lastScannedLedger, 100);
});

test("retention advancing during pagination discards the expired cursor and reports the gap", async () => {
  const f = fixture();
  f.pages.push({ events: Array.from({ length: 100 }, () => event(101)), cursor: "expired" });
  await f.monitor.scan();
  f.health.oldestLedger = 200;
  await f.monitor.scan();
  assert.equal(f.requests[1].startLedger, 200);
  assert.equal(f.requests[1].cursor, undefined);
  assert.deepEqual(f.monitor.backfill.retentionGap, { fromLedger: 101, toLedger: 199 });
});

test("invalid retention information fails without guessing a window", async () => {
  const f = fixture();
  f.health.oldestLedger = NaN;
  await assert.rejects(f.monitor.scan(), /valid retained ledger window/);
  assert.equal(f.requests.length, 0);
  assert.equal(f.saved.length, 0);
});

test("blank environment values are unset and page budgets and ledger overrides are validated", () => {
  assert.deepEqual(monitorConfig.parse({ START_LEDGER: "", BACKFILL_FROM_LEDGER: " ", BACKFILL_MAX_PAGES: "" }),
    { START_LEDGER: undefined, BACKFILL_FROM_LEDGER: undefined, BACKFILL_MAX_PAGES: 10 });
  assert.equal(monitorConfig.parse({ START_LEDGER: "0" }).START_LEDGER, 0);
  for (const values of [{ BACKFILL_FROM_LEDGER: "0" }, { BACKFILL_MAX_PAGES: "101" }, { START_LEDGER: "-1" }]) {
    assert.equal(monitorConfig.safeParse(values).success, false);
  }
});

test("SQLite checkpoints survive restart, include empty ranges and isolate network/contract", async () => {
  const directory = mkdtempSync(join(tmpdir(), "stellarsettle-backfill-"));
  const path = join(directory, "events.sqlite");
  let database = new DatabaseSync(path);
  try {
    let store = createCheckpointStore(database, "testnet", "contract");
    const f = fixture({ save: store.save });
    await f.monitor.scan(); // no events, but progress must still survive
    database.close();
    database = new DatabaseSync(path);
    store = createCheckpointStore(database, "testnet", "contract");
    const restart = new EventMonitor({ ...f.options, checkpoint: store.load(), save: store.save });
    await restart.scan();
    assert.equal(f.requests[1].startLedger, 1101);
    assert.equal(store.load().lastScannedLedger, 2100);
    assert.deepEqual(createCheckpointStore(database, "mainnet", "contract").load(), {});
    assert.deepEqual(createCheckpointStore(database, "testnet", "other").load(), {});
    store.save({ lastScannedLedger: 2100, retentionGap: { fromLedger: 1, toLedger: 100 } });
    database.close();
    database = new DatabaseSync(path);
    assert.deepEqual(createCheckpointStore(database, "testnet", "contract").load().retentionGap,
      { fromLedger: 1, toLedger: 100 });
  } finally {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
