import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()

  const name = process.env.TOKEN_NAME || 'ChainEquity'
  const symbol = process.env.TOKEN_SYMBOL || 'CEQ'
  const admin = process.env.ADMIN_WALLET || deployer.address

  console.log('Deploying GatedToken with:')
  console.log(`- deployer: ${deployer.address}`)
  console.log(`- admin: ${admin}`)
  console.log(`- name/symbol: ${name} / ${symbol}`)

  const Token = await ethers.getContractFactory('GatedToken')
  const token = await Token.deploy(name, symbol, admin)
  await token.waitForDeployment()

  console.log(`GatedToken deployed at: ${token.target}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
