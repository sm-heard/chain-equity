import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import { getAddress } from 'viem'

loadEnv({ path: resolve('../../.env') })
loadEnv()

const alchemyKey = process.env.ALCHEMY_API_KEY

export const env = {
  rpcUrl:
    process.env.RPC_URL ||
    (alchemyKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}` : 'http://127.0.0.1:8545'),
  tokenAddress: getAddress(process.env.GATED_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000'),
  abiPath: process.env.GATED_TOKEN_ABI_PATH,
  confirmations: Number(process.env.CONFIRMATIONS || '5'),
  dbPath: process.env.INDEXER_DB_PATH || './data/indexer.sqlite',
}

export type Env = typeof env
