import { before, after, test } from 'node:test'
import assert from 'node:assert'
import { spawn, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { existsSync, unlinkSync } from 'node:fs'
import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { gatedTokenAbi } from '../dist/abi/gatedToken.js'
import { performStockSplit } from '../dist/services/migrations/splitService.js'
import { performSymbolChange } from '../dist/services/migrations/symbolService.js'
import { getClients } from '../dist/onchain.js'

const ADMIN_KEY = process.env.SEPOLIA_PRIVATE_KEY ?? '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8546'
const DB_PATH = resolve('apps/indexer/data/integration-indexer.sqlite')
const ABI_PATH = 'apps/contracts/artifacts/src/GatedToken.sol/GatedToken.json'

process.env.RPC_URL = RPC_URL
process.env.SEPOLIA_PRIVATE_KEY = ADMIN_KEY
process.env.ADMIN_WALLET = privateKeyToAccount(ADMIN_KEY).address
process.env.GATED_TOKEN_ABI_PATH = ABI_PATH
process.env.INDEXER_DB_PATH = DB_PATH
process.env.API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8787'

let hardhatProc
let hardhatAvailable = false

async function startHardhat() {
  hardhatProc = spawn('npx', ['hardhat', 'node', '--hostname', '127.0.0.1', '--port', '8546'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: resolve('apps/contracts'),
  })
  hardhatProc.stderr?.on('data', (data) => process.stderr.write(data))
  const stdout = hardhatProc.stdout
  if (!stdout) throw new Error('missing stdout from hardhat')
  await new Promise((resolvePromise, rejectPromise) => {
    const onData = (chunk) => {
      const text = chunk.toString()
      if (text.includes('Started HTTP and WebSocket JSON-RPC server')) {
        stdout.off('data', onData)
        resolvePromise()
        hardhatAvailable = true
      }
    }
    stdout.on('data', onData)
    hardhatProc?.on('error', rejectPromise)
    hardhatProc?.on('exit', (code) => rejectPromise(new Error(`hardhat exited: ${code}`)))
  })
}

function stopHardhat() {
  if (hardhatProc && hardhatProc.pid) {
    hardhatProc.kill()
  }
}

function deployToken() {
  const result = spawnSync('npx', ['hardhat', 'run', 'scripts/deploy.ts', '--network', 'localhost'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
    cwd: resolve('apps/contracts'),
  })
  if (result.status !== 0) throw new Error('deploy script failed')
  const match = result.stdout.match(/GatedToken deployed at: (0x[0-9a-fA-F]{40})/)
  if (!match) throw new Error(`unable to parse deploy output: ${result.stdout}`)
  return match[1]
}

async function seedHolders(addresses, amount) {
  const { walletClient, tokenAddress, tokenAbi, chain, publicClient } = getClients()
  const adminAccount = walletClient.account ?? privateKeyToAccount(ADMIN_KEY)
  for (const addr of addresses) {
    const allowHash = await walletClient.writeContract({
      chain,
      account: adminAccount,
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'setAllowlistStatus',
      args: [addr, true],
    })
    await publicClient.waitForTransactionReceipt({ hash: allowHash })

    const mintHash = await walletClient.writeContract({
      chain,
      account: adminAccount,
      address: tokenAddress,
      abi: tokenAbi,
      functionName: 'mint',
      args: [addr, amount],
    })
    await publicClient.waitForTransactionReceipt({ hash: mintHash })
  }
}

before(async () => {
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH)
  try {
    await startHardhat()
  } catch (error) {
    console.warn('Unable to start Hardhat node; integration test will be skipped.', error)
    return
  }
  const deployed = deployToken()
  process.env.GATED_TOKEN_ADDRESS = deployed
})

after(() => {
  if (hardhatAvailable) stopHardhat()
})

test('stock split and symbol change migrations', async () => {
  if (!hardhatAvailable) {
    console.warn('Hardhat node unavailable; skipping migration assertions.')
    return
  }
  const holderAddresses = [
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  ]
  const mintAmount = 100n
  await seedHolders(holderAddresses, mintAmount)

  const originalAddress = process.env.GATED_TOKEN_ADDRESS
  const publicClient = createPublicClient({ transport: http(RPC_URL) })

  const split = await performStockSplit(7)
  assert.notStrictEqual(split.newToken.toLowerCase(), originalAddress.toLowerCase())
  assert.strictEqual(split.totalHolders, holderAddresses.length)
  assert.strictEqual(split.mintedTotal, (mintAmount * 7n * BigInt(holderAddresses.length)).toString())

  const newToken = split.newToken
  const balance0 = await publicClient.readContract({
    address: newToken,
    abi: gatedTokenAbi,
    functionName: 'balanceOf',
    args: [holderAddresses[0]],
  })
  assert.strictEqual(balance0, mintAmount * 7n)

  const symbolResult = await performSymbolChange('CEQX', 'ChainEquity X')
  assert.notStrictEqual(symbolResult.newToken.toLowerCase(), newToken.toLowerCase())
  const symbolToken = symbolResult.newToken
  const symbol = await publicClient.readContract({
    address: symbolToken,
    abi: gatedTokenAbi,
    functionName: 'symbol',
    args: [],
  })
  assert.strictEqual(symbol, 'CEQX')
})
