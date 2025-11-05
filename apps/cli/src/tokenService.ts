import { Address, getAddress, Hash } from 'viem'
import { env } from './env.js'
import { getClients } from './onchain.js'

async function waitFor(hash: Hash) {
  const { publicClient } = getClients()
  return publicClient.waitForTransactionReceipt({ hash })
}

function toAddress(wallet: string): Address {
  return getAddress(wallet)
}

export async function approveWallet(wallet: string) {
  const { walletClient, tokenAddress, tokenAbi } = getClients()
  const target = toAddress(wallet)
  const hash = await walletClient.writeContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'setAllowlistStatus',
    args: [target, true],
  })
  return waitFor(hash)
}

export async function revokeWallet(wallet: string) {
  const { walletClient, tokenAddress, tokenAbi } = getClients()
  const target = toAddress(wallet)
  const hash = await walletClient.writeContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'setAllowlistStatus',
    args: [target, false],
  })
  return waitFor(hash)
}

export async function mintTokens(wallet: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be positive')
  const { walletClient, tokenAddress, tokenAbi } = getClients()
  const target = toAddress(wallet)
  const hash = await walletClient.writeContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'mint',
    args: [target, BigInt(amount)],
  })
  return waitFor(hash)
}

export async function balanceOf(wallet: string) {
  const { publicClient, tokenAddress, tokenAbi } = getClients()
  const target = toAddress(wallet)
  return publicClient.readContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'balanceOf',
    args: [target],
  })
}

export function getAdminWallet() {
  return env.adminWallet
}

export function getRpcUrl() {
  return env.rpcUrl
}
