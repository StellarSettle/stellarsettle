// Named, individually revocable API keys (issue #83).
import { createHash, randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

const hash = (key: string) => createHash("sha256").update(key).digest("hex");

export function initApiKeys(db: DatabaseSync, legacyKey: string): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      name TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TEXT
    );
    CREATE TABLE IF NOT EXISTS metadata_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id TEXT NOT NULL,
      metadata_key TEXT NOT NULL,
      api_key_name TEXT NOT NULL,
      written_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  // Migration path: an existing METADATA_API_KEY is kept working as the "legacy" key.
  if (legacyKey) {
    db.prepare(
      "INSERT INTO api_keys (name, key_hash) VALUES ('legacy', ?) " +
        "ON CONFLICT(name) DO UPDATE SET key_hash = excluded.key_hash WHERE revoked_at IS NULL",
    ).run(hash(legacyKey));
  }
}

export function createApiKey(db: DatabaseSync, name: string): string {
  const key = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO api_keys (name, key_hash) VALUES (?, ?)").run(name, hash(key));
  return key;
}

export function revokeApiKey(db: DatabaseSync, name: string): boolean {
  const result = db.prepare("UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE name = ? AND revoked_at IS NULL").run(name);
  return Number(result.changes) > 0;
}

/** Returns the name of the active key matching `key`, or null. */
export function findApiKey(db: DatabaseSync, key: unknown): string | null {
  if (typeof key !== "string" || !key) return null;
  const row = db.prepare("SELECT name FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL").get(hash(key)) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}

export function recordMetadataWrite(db: DatabaseSync, shipmentId: string, metadataKey: string, apiKeyName: string): void {
  db.prepare("INSERT INTO metadata_audit_log (shipment_id, metadata_key, api_key_name) VALUES (?, ?, ?)").run(
    shipmentId,
    metadataKey,
    apiKeyName,
  );
}
