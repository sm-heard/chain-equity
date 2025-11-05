import 'dotenv/config'
import { createPublicClient, http, Hex } from 'viem'
import { sepolia } from 'viem/chains'
import pino from 'pino'
import { openDb } from './db.js'

const log = pino({ level: process.env.LOG_LEVEL || 'info' })

const alchemyKey = process.env.ALCHEMY_API_KEY
const rpcUrl = alchemyKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : 'http://127.0.0.1:8545'

const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })

const DB_PATH = process.env.INDEXER_DB_PATH || './data/indexer.sqlite'
const CONFIRMATIONS = Number(process.env.CONFIRMATIONS || '5')

async function main() {
  const db = openDb(DB_PATH)
  const currentBlock = Number(await publicClient.getBlockNumber())
  log.info({ currentBlock }, 'indexer connected (stub)')
  // TODO: subscribe to logs or poll blocks; store events; compute holders
  // For now, just write the last seen block to meta
  db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run('last_seen_block', String(currentBlock - CONFIRMATIONS))
  log.info('indexer initialization complete')
}

main().catch((err) => {
  log.error(err, 'indexer failed')
  process.exit(1)
})

