import 'dotenv/config'
import { Command } from 'commander'
import pino from 'pino'
import { createPublicClient, createWalletClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const program = new Command()
  .name('chain-equity')
  .description('CLI for ChainEquity admin ops and demos')
  .version('0.1.0')

// Basic viem client setup (HTTP only; WS can be added later)
function getClients() {
  const alchemyKey = process.env.ALCHEMY_API_KEY
  const rpcUrl = alchemyKey
    ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
    : 'http://127.0.0.1:8545'

  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })
  // Wallet client is configured later when we have a private key
  return { publicClient }
}

program
  .command('approve')
  .argument('<wallet>', 'wallet address to approve')
  .action(async (wallet) => {
    const { publicClient } = getClients()
    logger.info({ wallet }, 'approve wallet (stub)')
    // TODO: call contract allowlist function via wallet client
    const block = await publicClient.getBlockNumber()
    logger.info({ block: Number(block) }, 'connected to chain')
  })

program
  .command('revoke')
  .argument('<wallet>', 'wallet address to revoke')
  .action(async (wallet) => {
    logger.info({ wallet }, 'revoke wallet (stub)')
  })

program
  .command('mint')
  .argument('<wallet>', 'recipient wallet (must be allowlisted)')
  .argument('<amount>', 'integer amount')
  .action(async (wallet, amount) => {
    logger.info({ wallet, amount: Number(amount) }, 'mint (stub)')
  })

program
  .command('export')
  .argument('<block>', 'block number for snapshot')
  .option('--format <fmt>', 'csv|json', 'csv')
  .action(async (block, opts) => {
    logger.info({ block: Number(block), format: opts.format }, 'export cap-table (stub)')
  })

program
  .command('status')
  .action(async () => {
    const { publicClient } = getClients()
    const block = await publicClient.getBlockNumber()
    logger.info({ block: Number(block) }, 'status')
  })

program.parseAsync()

