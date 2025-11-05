import axios from 'axios'
import { API_BASE_URL } from './config'

const client = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 })

export type AllowlistPayload = { wallet: string }
export type MintPayload = { wallet: string; amount: number }
export type SplitPayload = { ratio?: string }
export type SymbolPayload = { newSymbol: string }

function adminHeaders(wallet: string) {
  return {
    'x-admin-wallet': wallet,
  }
}

export async function approveWallet(adminWallet: string, wallet: string) {
  return client.post('/admin/approve', { wallet }, { headers: adminHeaders(adminWallet) })
}

export async function revokeWallet(adminWallet: string, wallet: string) {
  return client.post('/admin/revoke', { wallet }, { headers: adminHeaders(adminWallet) })
}

export async function mintTokens(adminWallet: string, wallet: string, amount: number) {
  return client.post('/admin/mint', { wallet, amount }, { headers: adminHeaders(adminWallet) })
}

export async function triggerSplit(adminWallet: string, ratio: string) {
  return client.post('/admin/split', { ratio }, { headers: adminHeaders(adminWallet) })
}

export async function changeSymbol(adminWallet: string, newSymbol: string) {
  return client.post('/admin/change-symbol', { newSymbol }, { headers: adminHeaders(adminWallet) })
}

export type SnapshotHolder = {
  address: string
  balance: string
  onChainBalance: string
  ownershipPct: number
}

export type SnapshotResponse = {
  ok: boolean
  block: number
  totalSupply: string
  holders: SnapshotHolder[]
  discrepancies: Array<{ address: string; indexed: string; onChain: string }>
}

export async function fetchSnapshot(block?: number): Promise<SnapshotResponse> {
  const res = await client.get('/export', { params: { block } })
  return res.data as SnapshotResponse
}

export async function downloadSnapshotCsv(block?: number) {
  const res = await client.get('/export', {
    params: { block, format: 'csv' },
    responseType: 'text',
  })
  return res.data as string
}

export async function fetchHealth() {
  const res = await client.get('/health')
  return res.data
}
