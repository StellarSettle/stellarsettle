import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { migrateDatabase } from "./migrate.ts";

test("migrations apply once and can be rolled back", () => {
  const database = new DatabaseSync(":memory:");
  try {
    migrateDatabase(database);
    migrateDatabase(database);

    const applied = database.prepare("SELECT name FROM schema_migrations").all() as Array<{ name: string }>;
    assert.deepEqual(applied.map((migration) => migration.name), ["001_initial"]);

    migrateDatabase(database, "down");
    const rolledBack = database.prepare("SELECT name FROM schema_migrations").all();
    assert.deepEqual(rolledBack, []);
    assert.equal(
      database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'contract_events'").get(),
      undefined,
    );
  } finally {
    database.close();
  }
});

test("the initial migration adopts legacy tables without removing their rows", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(`
      CREATE TABLE contract_events (
        id TEXT PRIMARY KEY,
        ledger INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        shipment_id TEXT,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO contract_events (id, ledger, event_type, payload)
      VALUES ('legacy-event', 1, 'shipment_completed', '{}');
      CREATE INDEX contract_events_ledger_idx ON contract_events(ledger DESC);
      CREATE TABLE shipment_metadata (
        shipment_id TEXT NOT NULL,
        metadata_key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (shipment_id, metadata_key)
      );
      INSERT INTO shipment_metadata (shipment_id, metadata_key, value)
      VALUES ('legacy-shipment', 'key', 'value');
    `);

    migrateDatabase(database);

    assert.equal(
      database.prepare("SELECT id FROM contract_events WHERE id = 'legacy-event'").get()?.id,
      "legacy-event",
    );
    assert.equal(
      database.prepare("SELECT value FROM shipment_metadata WHERE shipment_id = 'legacy-shipment'").get()?.value,
      "value",
    );
    assert.ok(
      database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'event_scan_checkpoints'").get(),
    );
  } finally {
    database.close();
  }
});
