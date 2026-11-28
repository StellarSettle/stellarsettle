import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { createRpcCursorStore } from "./sorobanRpcCursor.ts";
import { createCheckpointStore } from "./scanCheckpoint.ts";
import { DatabaseSync } from "node:sqlite";

test("RPC event cursor persists across restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "ss-cursor-"));
  try {
    const fileStore = createRpcCursorStore(join(dir, "rpc-cursor.json"));
    fileStore.save({ ledgerCursor: 42, pageCursor: "abc" });
    const restored = fileStore.load();
    assert.equal(restored?.ledgerCursor, 42);
    assert.equal(restored?.pageCursor, "abc");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("scan checkpoint seeds event monitor from stored ledger", () => {
  const db = new DatabaseSync(":memory:");
  const store = createCheckpointStore(db, "testnet", "CONTRACT123");
  store.save({ lastScannedLedger: 880 });
  const reloaded = store.load();
  assert.equal(reloaded.lastScannedLedger, 880);
  db.close();
});