'use client'

import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  approveWallet,
  revokeWallet,
  mintTokens,
  triggerSplit,
  changeSymbol,
  exportSnapshot,
  fetchHealth,
} from '@/lib/api'
import { ADMIN_WALLET } from '@/lib/config'

type ActionState = { status: 'idle' | 'success' | 'error'; message?: string }

function useActionFeedback<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<unknown>
) {
  const [state, setState] = useState<ActionState>({ status: 'idle' })

  const mutation = useMutation({
    mutationFn: async (args: TArgs) => handler(...args),
    onMutate: () => setState({ status: 'idle' }),
    onSuccess: () => setState({ status: 'success', message: 'Success' }),
    onError: (err: unknown) => {
      if (err instanceof Error) {
        setState({ status: 'error', message: err.message })
      } else if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string } } }).response
        setState({ status: 'error', message: response?.data?.error || 'Request failed' })
      } else {
        setState({ status: 'error', message: 'Request failed' })
      }
    },
  })

  return { mutate: mutation.mutateAsync, isLoading: mutation.isPending, state }
}

const MOCK_HOLDERS = [
  { address: '0xAlice...', balance: '1000', ownership: '50.00%' },
  { address: '0xBob...', balance: '700', ownership: '35.00%' },
  { address: '0xCarol...', balance: '300', ownership: '15.00%' },
]

export default function Home() {
  const { address, isConnected } = useAccount()
  const lowerAddress = useMemo(() => address?.toLowerCase() || '', [address])
  const isAdmin = Boolean(lowerAddress && lowerAddress === ADMIN_WALLET && ADMIN_WALLET.length > 0)

  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  })

  const approve = useActionFeedback(async (adminWallet: string, wallet: string) => approveWallet(adminWallet, wallet))
  const revoke = useActionFeedback(async (adminWallet: string, wallet: string) => revokeWallet(adminWallet, wallet))
  const mint = useActionFeedback(async (adminWallet: string, wallet: string, amount: number) => mintTokens(adminWallet, wallet, amount))
  const split = useActionFeedback(async (adminWallet: string, ratio: string) => triggerSplit(adminWallet, ratio))
  const symbol = useActionFeedback(async (adminWallet: string, newSymbol: string) => changeSymbol(adminWallet, newSymbol))
  const snapshot = useActionFeedback(async (block: number) => exportSnapshot(block))

  const [approveWalletValue, setApproveWalletValue] = useState('')
  const [revokeWalletValue, setRevokeWalletValue] = useState('')
  const [mintWallet, setMintWallet] = useState('')
  const [mintAmount, setMintAmount] = useState('1')
  const [splitRatio, setSplitRatio] = useState('7:1')
  const [newSymbol, setNewSymbol] = useState('NEW')
  const [snapshotBlock, setSnapshotBlock] = useState('0')

  const disabled = !isConnected || !isAdmin

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">ChainEquity Admin</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Manage allowlists, issuance, and corporate actions for the demo equity token.
            </p>
          </div>
          <ConnectButton label={isAdmin ? 'Administrator Wallet' : 'Connect Wallet'} />
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Status</CardTitle>
              <CardDescription>Only the configured admin wallet can mutate state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Connected</span>
                <span>{isConnected ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Admin Wallet</span>
                <span className="font-mono text-xs">{ADMIN_WALLET || 'not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">You are Admin</span>
                <span>{isAdmin ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Health</CardTitle>
              <CardDescription>Polling `/health` every 30s.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Status</span>
                <span>{healthQuery.isSuccess ? 'Online' : healthQuery.isLoading ? 'Loading...' : 'Error'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Last Check</span>
                <span>{healthQuery.dataUpdatedAt ? new Date(healthQuery.dataUpdatedAt).toLocaleTimeString() : '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Run indexer + API locally for full functionality.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-neutral-600 dark:text-neutral-400">Use the actions below once your wallet matches the admin address.</p>
              <p className="text-neutral-600 dark:text-neutral-400">Snapshot export will hit the indexer once implemented.</p>
            </CardContent>
          </Card>
        </section>

        {!isAdmin && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="text-sm font-medium">Connect the configured admin wallet to enable write actions.</p>
          </div>
        )}

        <Separator />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Allowlist Management</CardTitle>
              <CardDescription>Approve or revoke wallets for gated transfers.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (!approveWalletValue || !lowerAddress) return
                  await approve.mutate([lowerAddress, approveWalletValue])
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="approve-wallet">Wallet address</Label>
                  <Input
                    id="approve-wallet"
                    value={approveWalletValue}
                    onChange={(event) => setApproveWalletValue(event.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <Button type="submit" disabled={disabled || approve.isLoading}>
                  {approve.isLoading ? 'Approving...' : 'Approve Wallet'}
                </Button>
                {approve.state.status === 'error' && (
                  <p className="text-sm text-red-600">{approve.state.message}</p>
                )}
                {approve.state.status === 'success' && (
                  <p className="text-sm text-emerald-600">Wallet approved.</p>
                )}
              </form>

              <Separator className="my-6" />

              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (!revokeWalletValue || !lowerAddress) return
                  await revoke.mutate([lowerAddress, revokeWalletValue])
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="revoke-wallet">Wallet address</Label>
                  <Input
                    id="revoke-wallet"
                    value={revokeWalletValue}
                    onChange={(event) => setRevokeWalletValue(event.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <Button variant="secondary" type="submit" disabled={disabled || revoke.isLoading}>
                  {revoke.isLoading ? 'Revoking...' : 'Revoke Wallet'}
                </Button>
                {revoke.state.status === 'error' && (
                  <p className="text-sm text-red-600">{revoke.state.message}</p>
                )}
                {revoke.state.status === 'success' && (
                  <p className="text-sm text-emerald-600">Wallet revoked.</p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mint Tokens</CardTitle>
              <CardDescription>Mint only to allowlisted wallets (enforced on-chain).</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (!mintWallet || Number.isNaN(Number(mintAmount)) || !lowerAddress) return
                  await mint.mutate([lowerAddress, mintWallet, Number(mintAmount)])
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="mint-wallet">Wallet address</Label>
                  <Input
                    id="mint-wallet"
                    value={mintWallet}
                    onChange={(event) => setMintWallet(event.target.value)}
                    placeholder="0x..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mint-amount">Amount (whole shares)</Label>
                  <Input
                    id="mint-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={mintAmount}
                    onChange={(event) => setMintAmount(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={disabled || mint.isLoading}>
                  {mint.isLoading ? 'Minting...' : 'Mint Tokens'}
                </Button>
                {mint.state.status === 'error' && (
                  <p className="text-sm text-red-600">{mint.state.message}</p>
                )}
                {mint.state.status === 'success' && (
                  <p className="text-sm text-emerald-600">Mint successful.</p>
                )}
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Corporate Actions</CardTitle>
              <CardDescription>Migration-based 7:1 split and symbol change.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (!lowerAddress) return
                  await split.mutate([lowerAddress, splitRatio])
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="split-ratio">Split ratio</Label>
                  <Input
                    id="split-ratio"
                    value={splitRatio}
                    onChange={(event) => setSplitRatio(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={disabled || split.isLoading}>
                  {split.isLoading ? 'Executing...' : 'Execute Split'}
                </Button>
                {split.state.status === 'error' && (
                  <p className="text-sm text-red-600">{split.state.message}</p>
                )}
                {split.state.status === 'success' && (
                  <p className="text-sm text-emerald-600">Split triggered.</p>
                )}
              </form>

              <Separator />

              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (!newSymbol || !lowerAddress) return
                  await symbol.mutate([lowerAddress, newSymbol])
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="new-symbol">New symbol</Label>
                  <Input
                    id="new-symbol"
                    value={newSymbol}
                    onChange={(event) => setNewSymbol(event.target.value)}
                  />
                </div>
                <Button variant="secondary" type="submit" disabled={disabled || symbol.isLoading}>
                  {symbol.isLoading ? 'Updating...' : 'Change Symbol'}
                </Button>
                {symbol.state.status === 'error' && (
                  <p className="text-sm text-red-600">{symbol.state.message}</p>
                )}
                {symbol.state.status === 'success' && (
                  <p className="text-sm text-emerald-600">Symbol updated.</p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snapshot Export</CardTitle>
              <CardDescription>As-of-block cap table with balances and ownership %.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={async (event) => {
                  event.preventDefault()
                  const block = Number(snapshotBlock)
                  if (Number.isNaN(block)) return
                  await snapshot.mutate([block])
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <Label htmlFor="snapshot-block">Block number</Label>
                  <Input
                    id="snapshot-block"
                    type="number"
                    min="0"
                    value={snapshotBlock}
                    onChange={(event) => setSnapshotBlock(event.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!isConnected || snapshot.isLoading}>
                  {snapshot.isLoading ? 'Exporting...' : 'Export Snapshot'}
                </Button>
                {snapshot.state.status === 'error' && (
                  <p className="text-sm text-red-600">{snapshot.state.message}</p>
                )}
                {snapshot.state.status === 'success' && (
                  <p className="text-sm text-emerald-600">Snapshot request sent.</p>
                )}
              </form>

              <Separator />

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Latest holders (demo data)
                </h4>
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Ownership</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_HOLDERS.map((holder) => (
                      <TableRow key={holder.address}>
                        <TableCell className="font-mono text-xs">{holder.address}</TableCell>
                        <TableCell className="text-right">{holder.balance}</TableCell>
                        <TableCell className="text-right">{holder.ownership}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                  Replace with indexer data once live.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="pb-12 pt-4 text-xs text-neutral-500 dark:text-neutral-500">
          <p>
            Demo only. No real securities. Keep holder set ≤ 10 for migrations. All operations logged via Hono API.
          </p>
        </footer>
      </div>
    </main>
  )
}
