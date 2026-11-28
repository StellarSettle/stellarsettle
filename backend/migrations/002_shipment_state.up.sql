CREATE TABLE IF NOT EXISTS shipment_state (
  shipment_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  total_amount TEXT,
  released_amount TEXT NOT NULL DEFAULT '0',
  milestone_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS shipment_state_status_idx ON shipment_state(status);