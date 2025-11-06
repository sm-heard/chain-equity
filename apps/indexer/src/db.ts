import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

export type HolderRow = { address: string; balance: string }

export function openDb(path: string) {
  mkdirSync(dirname(path), { recursive: true })
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
      log_index INTEGER NOT NULL,
      txhash TEXT NOT NULL,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      value TEXT NOT NULL,
      topic0 TEXT NOT NULL,
      data BLOB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_block_idx ON events(block);
    CREATE INDEX IF NOT EXISTS events_tx_idx ON events(txhash);
    CREATE TABLE IF NOT EXISTS holders (
      address TEXT PRIMARY KEY,
      balance TEXT NOT NULL
    );
  `)
  return db
}

export function getMeta(db: any, key: string) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setMeta(db: any, key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run(key, value)
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function adjustBalance(db: any, address: string, delta: bigint) {
  if (address === ZERO_ADDRESS) return
  const normalized = address.toLowerCase()
  const row = db.prepare('SELECT balance FROM holders WHERE address = ?').get(normalized) as HolderRow | undefined
  const current = row ? BigInt(row.balance) : 0n
  const updated = current + delta
  if (updated === 0n) {
    if (row) db.prepare('DELETE FROM holders WHERE address = ?').run(normalized)
  } else if (updated > 0n) {
    db.prepare('INSERT OR REPLACE INTO holders(address, balance) VALUES(?, ?)').run(normalized, updated.toString())
  } else {
    throw new Error(`Negative balance for ${normalized}`)
  }
}

export function applyTransfer(db: any, from: string, to: string, value: bigint) {
  adjustBalance(db, from, -value)
  adjustBalance(db, to, value)
}

export function recordEvent(
  db: any,
  params: {
    block: number
    logIndex: number
    txHash: string
    from: string
    to: string
    value: bigint
    topic0: string
    data: string
  }
) {
  db.prepare(
    'INSERT INTO events(block, log_index, txhash, from_address, to_address, value, topic0, data) VALUES(?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    params.block,
    params.logIndex,
    params.txHash,
    params.from.toLowerCase(),
    params.to.toLowerCase(),
    params.value.toString(),
    params.topic0,
    params.data
  )
}

export function listHolders(db: any): HolderRow[] {
  return db.prepare('SELECT address, balance FROM holders ORDER BY address').all() as HolderRow[]
}
