import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { ShipmentRepository } from "../src/repositories/shipmentRepository.ts";
import { initDatabase } from "../src/index.ts";

test("ShipmentRepository persists shipment state in SQLite", () => {
  const db = new DatabaseSync(":memory:");
  initDatabase(db);
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
  db.exec(readFileSync(join(migrationsDir, "002_shipment_state.up.sql"), "utf8"));

  const repo = new ShipmentRepository(db);
  repo.upsert({
    shipmentId: "SHIP-235",
    status: "active",
    totalAmount: "1000000",
    releasedAmount: "250000",
    milestoneCount: 4,
  });

  const row = repo.get("SHIP-235");
  assert.ok(row);
  assert.equal(row?.releasedAmount, "250000");
  assert.equal(repo.list(10).length, 1);
  db.close();
});