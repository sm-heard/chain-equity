import Database from 'better-sqlite3'
import { format } from 'node:util'
import { env } from '../env.js'
import { getClients } from '../onchain.js'

type EventRow = {
  block: number
  log_index: number
  from_address: string
  to_address: string
  value: string
}

export type SnapshotRow = {
  address: string
  balance: bigint
  ownershipPct: number
  onChainBalance: bigint
}

export type SnapshotResult = {
  block: number
  totalSupply: bigint
  rows: SnapshotRow[]
  discrepancies: Array<{ address: string; indexed: bigint; onChain: bigint }>
}

function getLastProcessedBlock(db: Database) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('last_processed_block') as { value: string } | undefined
  return row ? Number(row.value) : null
}

function loadEventsUpTo(db: Database, block: number): EventRow[] {
  return db
    .prepare(
      'SELECT block, log_index, from_address, to_address, value FROM events WHERE block <= ? ORDER BY block ASC, log_index ASC'
    )
    .all(block) as EventRow[]
}

function applyEvents(events: EventRow[]) {
  const balances = new Map<string, bigint>()
  const add = (address: string, delta: bigint) => {
    if (address === '0x0000000000000000000000000000000000000000') return
    const key = address.toLowerCase()
    const current = balances.get(key) ?? 0n
    const next = current + delta
    if (next === 0n) balances.delete(key)
    else if (next > 0n) balances.set(key, next)
    else throw new Error(`Negative balance for ${key}`)
  }

  for (const evt of events) {
    const value = BigInt(evt.value)
    add(evt.from_address, -value)
    add(evt.to_address, value)
  }

  return balances
}

export async function generateSnapshot(requestedBlock?: number): Promise<SnapshotResult> {
  const db = new Database(env.dbPath, { readonly: true })
  const lastProcessed = getLastProcessedBlock(db)
  if (lastProcessed === null) {
    throw new Error('Indexer has not processed any blocks yet')
  }

  const block = requestedBlock !== undefined ? Math.min(requestedBlock, lastProcessed) : lastProcessed
  const events = loadEventsUpTo(db, block)
  const balances = applyEvents(events)

  const { publicClient, tokenAddress, tokenAbi } = getClients()

  const rows: SnapshotRow[] = []
  let totalSupply = 0n
  const discrepancies: Array<{ address: string; indexed: bigint; onChain: bigint }> = []

  for (const [address, balance] of balances.entries()) {
    const onChainBalance = (await publicClient.readContract({
      abi: tokenAbi,
      address: tokenAddress,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
      blockNumber: BigInt(block),
    })) as bigint

    rows.push({ address, balance, onChainBalance, ownershipPct: 0 })
    totalSupply += balance
    if (onChainBalance !== balance) {
      discrepancies.push({ address, indexed: balance, onChain: onChainBalance })
    }
  }

  rows.sort((a, b) => Number(b.balance - a.balance))

  if (totalSupply > 0n) {
    for (const row of rows) {
      const pct = Number((row.balance * 10000n) / totalSupply) / 100
      row.ownershipPct = pct
    }
  }

  return { block, totalSupply, rows, discrepancies }
}

export function snapshotToCsv(snapshot: SnapshotResult) {
  const header = 'wallet,balance,ownership_pct,on_chain_balance'
  const lines = snapshot.rows.map((row) =>
    [row.address, row.balance.toString(), row.ownershipPct.toFixed(4), row.onChainBalance.toString()].join(',')
  )
  return [header, ...lines].join('\n')
}
