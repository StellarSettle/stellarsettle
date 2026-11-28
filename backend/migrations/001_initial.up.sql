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
CREATE TABLE IF NOT EXISTS event_scan_checkpoints (
  scope TEXT PRIMARY KEY,
  last_scanned_ledger INTEGER,
  retention_gap TEXT
);
