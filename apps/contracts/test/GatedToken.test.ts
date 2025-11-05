import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('GatedToken', function () {
  async function deployFixture() {
    const [admin, alice, bob, carol] = await ethers.getSigners()
    const Token = await ethers.getContractFactory('GatedToken')
    const token = await Token.deploy('ChainEquity', 'CEQ', admin.address)
    await token.waitForDeployment()

    await token.connect(admin).setAllowlistStatus(alice.address, true)
    await token.connect(admin).setAllowlistStatus(bob.address, true)

    return { token, admin, alice, bob, carol }
  }

  it('has zero decimals', async function () {
    const { token } = await deployFixture()
    expect(await token.decimals()).to.equal(0)
  })

  it('mints only to allowlisted wallets', async function () {
    const { token, admin, alice, bob, carol } = await deployFixture()
    await expect(token.connect(admin).mint(alice.address, 100)).to.emit(token, 'Transfer')
    await expect(token.connect(admin).mint(bob.address, 100)).to.emit(token, 'Transfer')

    await expect(token.connect(admin).mint(carol.address, 1)).to.be.revertedWithCustomError(
      token,
      'NotAllowlisted'
    )
  })

  it('enforces allowlist on transfers', async function () {
    const { token, admin, alice, bob } = await deployFixture()
    await token.connect(admin).mint(alice.address, 10)
    await expect(token.connect(alice).transfer(bob.address, 5)).to.emit(token, 'Transfer')

    const [_, __, ___, carol] = await ethers.getSigners()
    await expect(token.connect(alice).transfer(carol.address, 1)).to.be.revertedWithCustomError(
      token,
      'NotAllowlisted'
    )
  })

  it('blocks transfers when paused', async function () {
    const { token, admin, alice, bob } = await deployFixture()
    await token.connect(admin).mint(alice.address, 10)
    await token.connect(admin).pause()
    await expect(token.connect(alice).transfer(bob.address, 1)).to.be.revertedWithCustomError(
      token,
      'EnforcedPause'
    )
  })

  it('burns only from allowlisted wallets', async function () {
    const { token, admin, alice } = await deployFixture()
    await token.connect(admin).mint(alice.address, 10)
    await expect(token.connect(alice).burn(5)).to.emit(token, 'Transfer')
    await token.connect(admin).setAllowlistStatus(alice.address, false)
    await expect(token.connect(alice).burn(1)).to.be.revertedWithCustomError(token, 'NotAllowlisted')
  })
})
