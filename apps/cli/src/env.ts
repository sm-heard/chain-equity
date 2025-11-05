import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getAddress, Hex } from 'viem'

loadEnv({ path: resolve(process.cwd(), '../../.env') })
loadEnv()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.length === 0) throw new Error(`Missing required env var ${name}`)
  return value
}

function normalizePrivateKey(key: string): Hex {
  return (key.startsWith('0x') ? key : `0x${key}`) as Hex
}

const alchemyKey = process.env.ALCHEMY_API_KEY

export const env = {
  rpcUrl:
    process.env.RPC_URL ||
    (alchemyKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}` : 'http://127.0.0.1:8545'),
  privateKey: normalizePrivateKey(requireEnv('SEPOLIA_PRIVATE_KEY')),
  adminWallet: getAddress(requireEnv('ADMIN_WALLET')),
  tokenAddress: getAddress(requireEnv('GATED_TOKEN_ADDRESS')),
  abiPath: process.env.GATED_TOKEN_ABI_PATH,
  apiBaseUrl: process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8787',
}

export type Env = typeof env
