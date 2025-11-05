'use client'

import { PropsWithChildren, useState } from 'react'
import { WagmiProvider, createConfig } from 'wagmi'
import { http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY

const transports = {
  [sepolia.id]: http(
    alchemyKey ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}` : undefined
  ),
}

const wagmiConfig = projectId
  ? getDefaultConfig({
      appName: 'ChainEquity',
      projectId,
      chains: [sepolia],
      transports,
      ssr: true,
    })
  : createConfig({
      chains: [sepolia],
      transports,
      connectors: [injected()],
      ssr: true,
    })

export default function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
