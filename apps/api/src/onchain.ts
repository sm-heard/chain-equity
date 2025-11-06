import { readFileSync, existsSync } from 'node:fs'
import { resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  PublicClient,
  WalletClient,
} from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { env } from './env.js'
import { gatedTokenAbi } from './abi/gatedToken.js'

type Clients = {
  publicClient: PublicClient
  walletClient: WalletClient
  chain: Chain
  tokenAddress: Address
  tokenAbi: typeof gatedTokenAbi
}

let cached: Clients | null = null

function loadAbi(): typeof gatedTokenAbi {
  if (!env.abiPath) return gatedTokenAbi
  const candidates = isAbsolute(env.abiPath)
    ? [env.abiPath]
    : [
        resolve(process.cwd(), env.abiPath),
        resolve(fileURLToPath(new URL('..', import.meta.url)), env.abiPath),
        resolve(fileURLToPath(new URL('../..', import.meta.url)), env.abiPath),
        resolve(fileURLToPath(new URL('../../..', import.meta.url)), env.abiPath),
      ]
  const absolute = candidates.find((path) => existsSync(path))
  if (!absolute) throw new Error(`ABI file not found for path ${env.abiPath}`)
  const contents = readFileSync(absolute, 'utf-8')
  const artifact = JSON.parse(contents) as { abi: typeof gatedTokenAbi }
  return artifact.abi
}

export function getClients(): Clients {
  if (cached) return cached
  const chain = env.rpcUrl.includes('127.0.0.1') || env.rpcUrl.includes('localhost')
    ? defineChain({
        id: 31337,
        name: 'Hardhat',
        network: 'hardhat',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          default: { http: [env.rpcUrl] },
          public: { http: [env.rpcUrl] },
        },
      })
    : sepolia
  const account = privateKeyToAccount(env.privateKey)
  const transport = http(env.rpcUrl)
  const tokenAbi = loadAbi()

  cached = {
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ chain, account, transport }),
    chain,
    tokenAddress: getAddress(env.tokenAddress),
    tokenAbi,
  }
  return cached
}

export function invalidateClients() {
  cached = null
}
