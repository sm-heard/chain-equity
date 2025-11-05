import { createPublicClient, http, parseAbiItem } from 'viem'
import pino from 'pino'
import { openDb, applyTransfer, recordEvent, getMeta, setMeta } from './db.js'
import { env } from './env.js'

const log = pino({ level: process.env.LOG_LEVEL || 'info' })

const POLL_INTERVAL_MS = Number(process.env.INDEXER_POLL_MS || '5000')
const BATCH_SIZE = Number(process.env.INDEXER_BATCH_SIZE || '500')

const publicClient = createPublicClient({ transport: http(env.rpcUrl) })
const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)')

async function processRange(db: ReturnType<typeof openDb>, fromBlock: number, toBlock: number) {
  if (fromBlock > toBlock) return
  const logs = await publicClient.getLogs({
    address: env.tokenAddress,
    event: transferEvent,
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock),
  })

  for (const logEntry of logs) {
    const { blockNumber, transactionHash, topics, data, args, logIndex } = logEntry
    if (!blockNumber || !transactionHash || !args) continue
    const from = (args.from as string) ?? '0x0000000000000000000000000000000000000000'
    const to = (args.to as string) ?? '0x0000000000000000000000000000000000000000'
    const value = BigInt(args.value as bigint)
    applyTransfer(db, from, to, value)
    recordEvent(db, {
      block: Number(blockNumber),
      logIndex: typeof logIndex === 'bigint' ? Number(logIndex) : logIndex ?? 0,
      txHash: transactionHash,
      from,
      to,
      value,
      topic0: topics?.[0] ?? '0x',
      data,
    })
  }

  setMeta(db, 'last_processed_block', toBlock.toString())
  log.info({ fromBlock, toBlock, logs: logs.length }, 'processed transfer logs')
}

async function sync(db: ReturnType<typeof openDb>) {
  const latest = Number(await publicClient.getBlockNumber())
  const target = Math.max(latest - env.confirmations, 0)
  const stored = getMeta(db, 'last_processed_block')
  const lastProcessed = stored ? Number(stored) : -1

  if (target <= lastProcessed) {
    log.debug({ latest, target, lastProcessed }, 'no new confirmed blocks yet')
    return
  }

  let from = lastProcessed + 1
  while (from <= target) {
    const to = Math.min(from + BATCH_SIZE - 1, target)
    await processRange(db, from, to)
    from = to + 1
  }
}

async function main() {
  const db = openDb(env.dbPath)
  const chainId = await publicClient.getChainId().catch(() => undefined)
  log.info({ rpc: env.rpcUrl, token: env.tokenAddress, chainId }, 'indexer started')

  await sync(db)
  setInterval(() => {
    sync(db).catch((err) => log.error({ err }, 'sync failed'))
  }, POLL_INTERVAL_MS)
}

main().catch((err) => {
  log.error(err, 'indexer failed')
  process.exit(1)
})
