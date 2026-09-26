CREATE TABLE IF NOT EXISTS records (
  store TEXT NOT NULL,
  id INTEGER NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  PRIMARY KEY (store, id)
);
CREATE INDEX IF NOT EXISTS idx_records_store ON records(store);
CREATE INDEX IF NOT EXISTS idx_records_updated ON records(store, updated_at);
