import 'dotenv/config'
import { Hono } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { serve } from '@hono/node-server'
import pino from 'pino'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { env } from './env.js'
import { getClients } from './onchain.js'
import { approveWallet, revokeWallet, mintTokens, getBalance, getAdminWallet } from './services/tokenService.js'

const app = new Hono()
const log = pino({ level: process.env.LOG_LEVEL || 'info' })

app.use('*', honoLogger())

const adminWallet = getAdminWallet().toLowerCase()

function isAdmin(addr?: string) {
  return !!addr && addr.toLowerCase() === adminWallet && adminWallet.length > 0
}

function formatError(err: unknown) {
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

const adminHeaderSchema = z.object({ 'x-admin-wallet': z.string().min(1) })
const walletSchema = z.object({ wallet: z.string().min(1) })
const mintSchema = z.object({
  wallet: z.string().min(1),
  amount: z.coerce.number().int().positive(),
})

app.get('/health', async (c) => {
  try {
    const { publicClient, tokenAddress } = getClients()
    const [blockNumber, chainId] = await Promise.all([
      publicClient.getBlockNumber(),
      publicClient.getChainId(),
    ])
    return c.json({ ok: true, chainId, blockNumber: Number(blockNumber), tokenAddress })
  } catch (error) {
    log.error({ err: error }, 'health check failed')
    return c.json({ ok: false, error: formatError(error) }, 500)
  }
})

app.post(
  '/admin/approve',
  zValidator('header', adminHeaderSchema),
  zValidator('json', walletSchema),
  async (c) => {
    const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
    if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
    const { wallet } = c.req.valid('json')
    try {
      const receipt = await approveWallet(wallet)
      log.info({ wallet, txHash: receipt.transactionHash }, 'allowlist approved')
      return c.json({ ok: true, txHash: receipt.transactionHash })
    } catch (error) {
      log.error({ err: error, wallet }, 'approve wallet failed')
      return c.json({ error: formatError(error) }, 500)
    }
  }
)

app.post(
  '/admin/revoke',
  zValidator('header', adminHeaderSchema),
  zValidator('json', walletSchema),
  async (c) => {
    const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
    if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
    const { wallet } = c.req.valid('json')
    try {
      const receipt = await revokeWallet(wallet)
      log.info({ wallet, txHash: receipt.transactionHash }, 'allowlist revoked')
      return c.json({ ok: true, txHash: receipt.transactionHash })
    } catch (error) {
      log.error({ err: error, wallet }, 'revoke wallet failed')
      return c.json({ error: formatError(error) }, 500)
    }
  }
)

app.post(
  '/admin/mint',
  zValidator('header', adminHeaderSchema),
  zValidator('json', mintSchema),
  async (c) => {
    const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
    if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
    const { wallet, amount } = c.req.valid('json')
    try {
      const receipt = await mintTokens(wallet, amount)
      log.info({ wallet, amount, txHash: receipt.transactionHash }, 'minted tokens')
      return c.json({ ok: true, txHash: receipt.transactionHash })
    } catch (error) {
      log.error({ err: error, wallet, amount }, 'mint tokens failed')
      return c.json({ error: formatError(error) }, 500)
    }
  }
)

app.post(
  '/admin/split',
  zValidator('header', adminHeaderSchema),
  zValidator('json', z.object({ ratio: z.string().default('7:1') })),
  async (c) => {
    const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
    if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
    const { ratio } = c.req.valid('json')
    log.info({ ratio }, 'stock split (migration) not yet implemented')
    return c.json({ ok: false, error: 'split not implemented yet' }, 501)
  }
)

app.post(
  '/admin/change-symbol',
  zValidator('header', adminHeaderSchema),
  zValidator('json', z.object({ newSymbol: z.string().min(1) })),
  async (c) => {
    const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
    if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
    const { newSymbol } = c.req.valid('json')
    log.info({ newSymbol }, 'symbol change (migration) not yet implemented')
    return c.json({ ok: false, error: 'symbol change not implemented yet' }, 501)
  }
)

app.get(
  '/export',
  zValidator('query', z.object({ block: z.coerce.number().int().nonnegative() })),
  async (c) => {
    const { block } = c.req.valid('query')
    log.info({ block }, 'export cap-table (stub)')
    return c.json({ ok: false, block, rows: [], error: 'snapshot export not implemented yet' }, 501)
  }
)

app.get(
  '/balance/:wallet',
  zValidator('param', z.object({ wallet: z.string().min(1) })),
  async (c) => {
    const { wallet } = c.req.valid('param')
    try {
      const balance = await getBalance(wallet)
      return c.json({ ok: true, wallet, balance: balance.toString() })
    } catch (error) {
      log.error({ err: error, wallet }, 'balance lookup failed')
      return c.json({ error: formatError(error) }, 500)
    }
  }
)

const port = Number(process.env.PORT || 8787)
serve({ fetch: app.fetch, port })
console.log(`Admin API listening on http://localhost:${port}`)
