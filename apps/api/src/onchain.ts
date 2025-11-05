import { readFileSync } from 'node:fs'
import { resolve, isAbsolute } from 'node:path'
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
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
  const absolute = isAbsolute(env.abiPath)
    ? env.abiPath
    : resolve(process.cwd(), '..', '..', env.abiPath)
  const contents = readFileSync(absolute, 'utf-8')
  const artifact = JSON.parse(contents) as { abi: typeof gatedTokenAbi }
  return artifact.abi
}

export function getClients(): Clients {
  if (cached) return cached
  const chain = sepolia
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
