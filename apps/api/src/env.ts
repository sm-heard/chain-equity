import { resolve, isAbsolute } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getAddress, Hex } from 'viem'

// Load env files: root .env first, then local overrides.
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
const dbPathEnv = process.env.INDEXER_DB_PATH
const resolvedDbPath = dbPathEnv
  ? isAbsolute(dbPathEnv)
    ? dbPathEnv
    : resolve(process.cwd(), '..', '..', dbPathEnv)
  : resolve(process.cwd(), '..', '..', 'apps/indexer/data/indexer.sqlite')

export const env = {
  rpcUrl:
    process.env.RPC_URL ||
    (alchemyKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}` : 'http://127.0.0.1:8545'),
  privateKey: normalizePrivateKey(requireEnv('SEPOLIA_PRIVATE_KEY')),
  adminWallet: getAddress(requireEnv('ADMIN_WALLET')),
  tokenAddress: getAddress(requireEnv('GATED_TOKEN_ADDRESS')),
  abiPath: process.env.GATED_TOKEN_ABI_PATH,
  dbPath: resolvedDbPath,
}

export type Env = typeof env
