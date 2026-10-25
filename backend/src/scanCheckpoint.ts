import type { DatabaseSync } from "node:sqlite";
import type { ScanCheckpoint } from "./eventMonitor.js";

export function createCheckpointStore(database: DatabaseSync, network: string, contractId: string) {
  database.exec(`CREATE TABLE IF NOT EXISTS event_scan_checkpoints (
    scope TEXT PRIMARY KEY,
    last_scanned_ledger INTEGER,
    retention_gap TEXT
  )`);
  // Provider URL is deliberately not part of the key: switching to a deeper
  // RPC for the same network/contract must preserve the recovery position.
  const scope = JSON.stringify([network, contractId]);
  return {
    load(): ScanCheckpoint {
      const row = database.prepare("SELECT last_scanned_ledger, retention_gap FROM event_scan_checkpoints WHERE scope = ?")
        .get(scope) as { last_scanned_ledger: number | null; retention_gap: string | null } | undefined;
      return row ? {
        lastScannedLedger: row.last_scanned_ledger ?? undefined,
        retentionGap: row.retention_gap ? JSON.parse(row.retention_gap) : undefined,
      } : {};
    },
    save(state: ScanCheckpoint): void {
      database.prepare(`INSERT INTO event_scan_checkpoints (scope, last_scanned_ledger, retention_gap)
        VALUES (?, ?, ?) ON CONFLICT(scope) DO UPDATE SET
        last_scanned_ledger = excluded.last_scanned_ledger, retention_gap = excluded.retention_gap`)
        .run(scope, state.lastScannedLedger ?? null, state.retentionGap ? JSON.stringify(state.retentionGap) : null);
    },
  };
}
