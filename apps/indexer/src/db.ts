import Database from 'better-sqlite3'

export type HolderRow = { address: string; balance: string }

export function openDb(path: string) {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block INTEGER NOT NULL,
      txhash TEXT NOT NULL,
      topic0 TEXT NOT NULL,
      data BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_block_idx ON events(block);
    CREATE TABLE IF NOT EXISTS holders (
      address TEXT PRIMARY KEY,
      balance TEXT NOT NULL
    );
  `)
  return db
}

