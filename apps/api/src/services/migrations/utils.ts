import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'
import pino from 'pino'
import { env } from '../../env.js'
import { getClients, invalidateClients } from '../../onchain.js'
import { generateSnapshot } from '../snapshotService.js'

const log = pino({ level: process.env.LOG_LEVEL || 'info' })

type Artifact = {
  abi: any
  bytecode: `0x${string}`
}

function resolveArtifactPath(relativePath: string): string {
  const candidates = [
    resolve(relativePath),
    resolve(process.cwd(), relativePath),
    resolve(process.cwd(), '..', relativePath),
    resolve(process.cwd(), '..', '..', relativePath),
  ]
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error(`ABI file not found for path ${relativePath}`)
  return found
}

function loadArtifact(): Artifact {
  if (!env.abiPath) throw new Error('Missing GATED_TOKEN_ABI_PATH')
  const artifactPath = resolveArtifactPath(env.abiPath)
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8')) as { abi: any; bytecode: string }
  if (!artifact.bytecode || !artifact.bytecode.startsWith('0x')) {
    throw new Error('Artifact missing bytecode')
  }
  return { abi: artifact.abi, bytecode: artifact.bytecode as `0x${string}` }
}

async function ensureTokenPaused(tokenAddress: `0x${string}`, tokenAbi: any) {
  const { publicClient, walletClient, chain } = getClients()
  const paused = (await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi,
    functionName: 'paused',
    args: [],
  })) as boolean

  if (!paused) {
    const pauseHash = await walletClient.writeContract({
      chain,
      account: walletClient.account!,
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'pause',
      args: [],
    })
    await publicClient.waitForTransactionReceipt({ hash: pauseHash })
    log.info({ tokenAddress, pauseHash }, 'paused original token')
  }
}

async function getTokenMetadata(tokenAddress: `0x${string}`, tokenAbi: any) {
  const { publicClient } = getClients()
  const [name, symbol] = await Promise.all([
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'name', args: [] }),
    publicClient.readContract({ address: tokenAddress, abi: tokenAbi, functionName: 'symbol', args: [] }),
  ])
  return { name: name as string, symbol: symbol as string }
}

async function deployNewToken(name: string, symbol: string, artifact: Artifact) {
  const { walletClient, publicClient, chain } = getClients()
  const deployHash = await walletClient.deployContract({
    chain,
    account: walletClient.account!,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [name, symbol, env.adminWallet],
  })
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
  const newToken = deployReceipt.contractAddress as `0x${string}` | null
  if (!newToken) throw new Error('Failed to retrieve new token address from deployment receipt')
  log.info({ newToken, deployHash }, 'deployed new token contract')
  return newToken
}

async function allowAndMint(
  newToken: `0x${string}`,
  artifact: Artifact,
  holders: Array<{ address: string; balance: bigint }>,
  ratio: bigint
) {
  const { walletClient, publicClient, chain } = getClients()
  let mintedTotal = 0n

  for (const holder of holders) {
    const address = holder.address as `0x${string}`
    const baseBalance = holder.balance
    const minted = baseBalance * ratio

    const allowHash = await walletClient.writeContract({
      chain,
      account: walletClient.account!,
      address: newToken,
      abi: artifact.abi,
      functionName: 'setAllowlistStatus',
      args: [address, true],
    })
    await publicClient.waitForTransactionReceipt({ hash: allowHash })

    if (minted > 0n) {
      const mintHash = await walletClient.writeContract({
        chain,
        account: walletClient.account!,
        address: newToken,
        abi: artifact.abi,
        functionName: 'mint',
        args: [address, minted],
      })
      await publicClient.waitForTransactionReceipt({ hash: mintHash })
      mintedTotal += minted
    }
  }

  return mintedTotal
}

function persistNewTokenAddress(newToken: `0x${string}`) {
  try {
    const db = new Database(env.dbPath)
    const reset = db.transaction(() => {
      db.prepare('DELETE FROM events').run()
      db.prepare('DELETE FROM holders').run()
      db.prepare('DELETE FROM meta WHERE key = ?').run('last_processed_block')
      db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run('current_token_address', newToken)
    })
    reset()
    db.close()
  } catch (error) {
    log.warn({ err: error }, 'failed to persist current token address meta')
  }

  process.env.GATED_TOKEN_ADDRESS = newToken
  invalidateClients()
}

export type MigrationResult = {
  oldToken: `0x${string}`
  newToken: `0x${string}`
  ratio: { numerator: number; denominator: number }
  totalHolders: number
  mintedTotal: string
  timestamp: number
  newName: string
  newSymbol: string
}

export type MigrationOptions = {
  ratio: number
  newName?: string
  newSymbol?: string
}

export async function executeMigration(options: MigrationOptions): Promise<MigrationResult> {
  const { ratio, newName, newSymbol } = options
  if (!Number.isInteger(ratio) || ratio <= 0) throw new Error('Migration ratio must be a positive integer')

  const { tokenAddress, tokenAbi } = getClients()
  const timestamp = Math.floor(Date.now() / 1000)

  await ensureTokenPaused(tokenAddress, tokenAbi)

  const snapshot = await generateSnapshot()
  const holders = snapshot.rows.map((row) => ({ address: row.address, balance: BigInt(row.balance) }))
  log.info({ totalHolders: holders.length }, 'snapshot holders retrieved')

  const metadata = await getTokenMetadata(tokenAddress, tokenAbi)
  const artifact = loadArtifact()
  const name = newName ?? metadata.name
  const symbol = newSymbol ?? metadata.symbol

  const newToken = await deployNewToken(name, symbol, artifact)
  const mintedTotal = await allowAndMint(newToken, artifact, holders, BigInt(ratio))

  persistNewTokenAddress(newToken)

  return {
    oldToken: tokenAddress,
    newToken,
    ratio: { numerator: ratio, denominator: 1 },
    totalHolders: holders.length,
    mintedTotal: mintedTotal.toString(),
    timestamp,
    newName: name,
    newSymbol: symbol,
  }
}
