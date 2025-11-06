-- Rename the existing events table
ALTER TABLE events RENAME TO events_old;

-- Create the new schema with log_index and address/value columns
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block INTEGER NOT NULL,
  log_index INTEGER NOT NULL,
  txhash TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  value TEXT NOT NULL,
  topic0 TEXT NOT NULL,
  data BLOB NOT NULL
);

-- Populate the new table, defaulting new columns to sensible values
INSERT INTO events (id, block, log_index, txhash, from_address, to_address, value, topic0, data)
SELECT id, block, 0 AS log_index, txhash, '' AS from_address, '' AS to_address, '0' AS value, topic0, data
FROM events_old;

-- Drop the old table
DROP TABLE events_old;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS events_block_idx ON events(block);
CREATE INDEX IF NOT EXISTS events_tx_idx ON events(txhash);
