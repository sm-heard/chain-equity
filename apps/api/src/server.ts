import 'dotenv/config'
import { Hono } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { serve } from '@hono/node-server'
import pino from 'pino'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const app = new Hono()
const log = pino({ level: process.env.LOG_LEVEL || 'info' })

app.use('*', honoLogger())

app.get('/health', (c) => c.json({ ok: true }))

// Simple admin check by address (MVP). In production, use signatures or auth.
const ADMIN_WALLET = (process.env.ADMIN_WALLET || '').toLowerCase()
function isAdmin(addr?: string) {
  return !!addr && addr.toLowerCase() === ADMIN_WALLET && ADMIN_WALLET.length > 0
}

const adminHeaderSchema = z.object({ 'x-admin-wallet': z.string().min(1) })

app.post('/admin/approve', zValidator('header', adminHeaderSchema), zValidator('json', z.object({ wallet: z.string() })), async (c) => {
  const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
  if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
  const { wallet } = c.req.valid('json')
  log.info({ wallet }, 'approve wallet (stub)')
  return c.json({ ok: true })
})

app.post('/admin/revoke', zValidator('header', adminHeaderSchema), zValidator('json', z.object({ wallet: z.string() })), async (c) => {
  const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
  if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
  const { wallet } = c.req.valid('json')
  log.info({ wallet }, 'revoke wallet (stub)')
  return c.json({ ok: true })
})

app.post('/admin/mint', zValidator('header', adminHeaderSchema), zValidator('json', z.object({ wallet: z.string(), amount: z.number().int().nonnegative() })), async (c) => {
  const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
  if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
  const { wallet, amount } = c.req.valid('json')
  log.info({ wallet, amount }, 'mint (stub)')
  return c.json({ ok: true })
})

app.post('/admin/split', zValidator('header', adminHeaderSchema), zValidator('json', z.object({ ratio: z.string().default('7:1') })), async (c) => {
  const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
  if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
  const { ratio } = c.req.valid('json')
  log.info({ ratio }, 'stock split (migration) (stub)')
  return c.json({ ok: true })
})

app.post('/admin/change-symbol', zValidator('header', adminHeaderSchema), zValidator('json', z.object({ newSymbol: z.string().min(1) })), async (c) => {
  const hdr = adminHeaderSchema.parse(Object.fromEntries(c.req.raw.headers))
  if (!isAdmin(hdr['x-admin-wallet'])) return c.json({ error: 'unauthorized' }, 401)
  const { newSymbol } = c.req.valid('json')
  log.info({ newSymbol }, 'symbol change (migration) (stub)')
  return c.json({ ok: true })
})

app.get('/export', zValidator('query', z.object({ block: z.string() })), async (c) => {
  const { block } = c.req.valid('query')
  log.info({ block: Number(block) }, 'export cap-table (stub)')
  return c.json({ ok: true, block: Number(block), rows: [] })
})

const port = Number(process.env.PORT || 8787)
serve({ fetch: app.fetch, port })
console.log(`Admin API listening on http://localhost:${port}`)

