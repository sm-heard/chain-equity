import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import pino from 'pino'
import Database from 'better-sqlite3'
import { env } from '../../env.js'
import { getClients, invalidateClients } from '../../onchain.js'
import { generateSnapshot } from '../snapshotService.js'

const log = pino({ level: process.env.LOG_LEVEL || 'info' })

type Artifact = {
  abi: any
  bytecode: `0x${string}`
}

function loadArtifact(): Artifact {
  if (!env.abiPath) throw new Error('Missing GATED_TOKEN_ABI_PATH')
  const candidates = [
    resolve(env.abiPath),
    resolve(process.cwd(), env.abiPath),
    resolve(process.cwd(), '..', env.abiPath),
    resolve(process.cwd(), '..', '..', env.abiPath),
  ]
  const artifactPath = candidates.find((p) => existsSync(p))
  if (!artifactPath) throw new Error(`ABI file not found for path ${env.abiPath}`)
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8')) as { abi: any; bytecode: string }
  if (!artifact.bytecode.startsWith('0x')) throw new Error('Artifact missing bytecode')
  return { abi: artifact.abi, bytecode: artifact.bytecode as `0x${string}` }
}

export type SplitResult = {
  oldToken: `0x${string}`
  newToken: `0x${string}`
  ratio: { numerator: number; denominator: number }
  totalHolders: number
  mintedTotal: string
  timestamp: number
}

export async function performStockSplit(ratio = 7): Promise<SplitResult> {
  if (ratio <= 1 || !Number.isInteger(ratio)) throw new Error('Split ratio must be an integer > 1')

  const { publicClient, walletClient, tokenAddress, tokenAbi, chain } = getClients()
  const timestamp = Math.floor(Date.now() / 1000)

  log.info({ tokenAddress, ratio }, 'starting stock split migration')

  const paused = await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi as any,
    functionName: 'paused',
    args: [],
  }) as boolean

  if (!paused) {
    const pauseHash = await walletClient.writeContract({
      chain,
      account: walletClient.account!,
      address: tokenAddress,
      abi: tokenAbi as any,
      functionName: 'pause',
      args: [],
    })
    await publicClient.waitForTransactionReceipt({ hash: pauseHash })
    log.info({ tokenAddress, pauseHash }, 'paused original token')
  }

  const snapshot = await generateSnapshot()
  const holders = snapshot.rows
  const totalHolders = holders.length
  log.info({ totalHolders }, 'snapshot holders retrieved')

  const name = (await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi as any,
    functionName: 'name',
    args: [],
  })) as string
  const symbol = (await publicClient.readContract({
    address: tokenAddress,
    abi: tokenAbi as any,
    functionName: 'symbol',
    args: [],
  })) as string

  const artifact = loadArtifact()
  const deployHash = await walletClient.deployContract({
    chain,
    account: walletClient.account!,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [name, symbol, env.adminWallet],
  })
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash })
  const newToken = deployReceipt.contractAddress as `0x${string}`
  if (!newToken) throw new Error('Failed to retrieve new token address from deployment receipt')
  log.info({ newToken, deployHash }, 'deployed split token')

  let mintedTotal = 0n
  for (const holder of holders) {
    const address = holder.address as `0x${string}`
    const balance = BigInt(holder.balance)
    const minted = balance * BigInt(ratio)

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

  try {
    const db = new Database(env.dbPath)
    db.prepare('INSERT OR REPLACE INTO meta(key, value) VALUES(?, ?)').run('current_token_address', newToken)
    db.close()
  } catch (error) {
    log.warn({ err: error }, 'failed to persist current token address meta')
  }

  process.env.GATED_TOKEN_ADDRESS = newToken
  invalidateClients()

  log.info({ newToken, mintedTotal: mintedTotal.toString() }, 'stock split migration complete')

  return {
    oldToken: tokenAddress,
    newToken,
    ratio: { numerator: ratio, denominator: 1 },
    totalHolders,
    mintedTotal: mintedTotal.toString(),
    timestamp,
  }
}
