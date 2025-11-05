import 'dotenv/config'
import { Command } from 'commander'
import pino from 'pino'
import chalk from 'chalk'
import {
  approveWallet,
  revokeWallet,
  mintTokens,
  balanceOf,
  getAdminWallet,
  getRpcUrl,
} from './tokenService.js'
import { getClients } from './onchain.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

const program = new Command()
  .name('chain-equity')
  .description('CLI for ChainEquity admin ops and demos')
  .version('0.1.0')

async function run(name: string, fn: () => Promise<void>) {
  try {
    logger.debug({ action: name }, 'starting cli action')
    await fn()
    logger.debug({ action: name }, 'cli action complete')
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ err: error, action: name }, 'cli action failed')
      console.error(chalk.red(`✖ ${error.message}`))
    } else {
      logger.error({ err: error, action: name }, 'cli action failed')
      console.error(chalk.red('✖ Unknown error'))
    }
    process.exitCode = 1
  }
}

program
  .command('approve')
  .argument('<wallet>', 'wallet address to approve')
  .action(async (wallet) => {
    await run('approve', async () => {
      const receipt = await approveWallet(wallet)
      console.log(chalk.green(`✔ Wallet ${wallet} approved`))
      console.log(`Tx: ${receipt.transactionHash}`)
    })
  })

program
  .command('revoke')
  .argument('<wallet>', 'wallet address to revoke')
  .action(async (wallet) => {
    await run('revoke', async () => {
      const receipt = await revokeWallet(wallet)
      console.log(chalk.yellow(`ℹ Wallet ${wallet} revoked`))
      console.log(`Tx: ${receipt.transactionHash}`)
    })
  })

program
  .command('mint')
  .argument('<wallet>', 'recipient wallet (must be allowlisted)')
  .argument('<amount>', 'integer amount')
  .action(async (wallet, amount) => {
    await run('mint', async () => {
      const parsed = Number(amount)
      if (!Number.isInteger(parsed) || parsed <= 0) throw new Error('Amount must be a positive integer')
      const receipt = await mintTokens(wallet, parsed)
      console.log(chalk.green(`✔ Minted ${parsed} tokens to ${wallet}`))
      console.log(`Tx: ${receipt.transactionHash}`)
    })
  })

program
  .command('export')
  .argument('<block>', 'block number for snapshot')
  .option('--format <fmt>', 'csv|json', 'csv')
  .action(async (block, opts) => {
    await run('export', async () => {
      const parsed = Number(block)
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error('Block must be a non-negative integer')
      logger.warn('Snapshot export not implemented yet. Indexer integration pending.')
      console.log(`Requested block ${parsed} format ${opts.format}. Implement indexer first.`)
    })
  })

program
  .command('status')
  .action(async () => {
    await run('status', async () => {
      const { publicClient, tokenAddress } = getClients()
      const [block, chainId] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.getChainId(),
      ])
      console.log(`RPC: ${getRpcUrl()}`)
      console.log(`ChainId: ${chainId}`)
      console.log(`Block: ${Number(block)}`)
      console.log(`Token: ${tokenAddress}`)
      console.log(`Admin wallet: ${getAdminWallet()}`)
    })
  })

program
  .command('balance')
  .argument('<wallet>', 'wallet address to query')
  .action(async (wallet) => {
    await run('balance', async () => {
      const bal = await balanceOf(wallet)
      console.log(`Balance for ${wallet}: ${bal.toString()} shares`)
    })
  })

program.parseAsync()
