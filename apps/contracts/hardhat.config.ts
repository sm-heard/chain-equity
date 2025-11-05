import { config as dotenvConfig } from 'dotenv'
import { HardhatUserConfig } from 'hardhat/types'
import '@nomicfoundation/hardhat-toolbox'

dotenvConfig()

const rpcUrl = process.env.RPC_URL || (process.env.ALCHEMY_API_KEY ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` : 'http://127.0.0.1:8545')
const privateKey = process.env.SEPOLIA_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    sepolia: {
      url: rpcUrl,
      accounts: privateKey ? [privateKey] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
}

export default config
