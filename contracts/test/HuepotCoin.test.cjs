const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

const SUPPLY = ethers.parseUnits("100000000", 18); // 100,000,000 HUE
const DEAD = "0x000000000000000000000000000000000000dEaD";

async function deploy() {
  const [treasury, player, other] = await ethers.getSigners();
  const Coin = await ethers.getContractFactory("HuepotCoin");
  const coin = await Coin.deploy(SUPPLY);
  await coin.waitForDeployment();
  return { coin, treasury, player, other };
}

describe("HuepotCoin", () => {
  it("declares the house token", async () => {
    const { coin } = await deploy();
    assert.equal(await coin.name(), "Huepot");
    assert.equal(await coin.symbol(), "HUE");
    assert.equal(await coin.decimals(), 18n);
  });

  it("mints the whole fixed supply to the deployer once", async () => {
    const { coin, treasury } = await deploy();
    assert.equal(await coin.totalSupply(), SUPPLY);
    assert.equal(await coin.balanceOf(treasury.address), SUPPLY);
  });

  it("has no way to mint more", async () => {
    const { coin } = await deploy();
    const names = coin.interface.fragments
      .filter((f) => f.type === "function")
      .map((f) => f.name.toLowerCase());
    for (const banned of ["mint", "issue", "pause", "blacklist", "setowner", "owner"]) {
      assert.ok(!names.includes(banned), `unexpected admin function: ${banned}`);
    }
  });

  it("pays a bonus out of treasury and moves balances exactly", async () => {
    const { coin, treasury, player } = await deploy();
    const bonus = ethers.parseUnits("301", 18); // bill's earned HUE
    await coin.connect(treasury).transfer(player.address, bonus);
    assert.equal(await coin.balanceOf(player.address), bonus);
    assert.equal(await coin.balanceOf(treasury.address), SUPPLY - bonus);
    // Supply is conserved: a bonus is a move, not a mint.
    assert.equal(await coin.totalSupply(), SUPPLY);
  });

  it("emits Transfer on a bonus", async () => {
    const { coin, treasury, player } = await deploy();
    const bonus = ethers.parseUnits("10", 18);
    const tx = await coin.connect(treasury).transfer(player.address, bonus);
    const receipt = await tx.wait();
    const log = receipt.logs
      .map((l) => coin.interface.parseLog(l))
      .find((l) => l && l.name === "Transfer");
    assert.ok(log, "no Transfer event");
    assert.equal(log.args.from, treasury.address);
    assert.equal(log.args.to, player.address);
    assert.equal(log.args.value, bonus);
  });

  it("refuses to send more than a holder has", async () => {
    const { coin, player, other } = await deploy();
    await assert.rejects(
      coin.connect(player).transfer(other.address, 1n),
      /InsufficientBalance/,
    );
  });

  it("refuses transfers to the zero address", async () => {
    const { coin, treasury } = await deploy();
    await assert.rejects(
      coin.connect(treasury).transfer(ethers.ZeroAddress, 1n),
      /ZeroAddress/,
    );
  });

  it("spends an allowance and decrements it", async () => {
    const { coin, treasury, player, other } = await deploy();
    const allowed = ethers.parseUnits("50", 18);
    await coin.connect(treasury).approve(player.address, allowed);
    assert.equal(await coin.allowance(treasury.address, player.address), allowed);

    const part = ethers.parseUnits("20", 18);
    await coin.connect(player).transferFrom(treasury.address, other.address, part);
    assert.equal(await coin.balanceOf(other.address), part);
    assert.equal(
      await coin.allowance(treasury.address, player.address),
      allowed - part,
    );
  });

  it("refuses to spend beyond an allowance", async () => {
    const { coin, treasury, player, other } = await deploy();
    await coin.connect(treasury).approve(player.address, 5n);
    await assert.rejects(
      coin.connect(player).transferFrom(treasury.address, other.address, 6n),
      /InsufficientAllowance/,
    );
  });

  it("leaves an infinite allowance untouched, as routers expect", async () => {
    const { coin, treasury, player, other } = await deploy();
    const max = ethers.MaxUint256;
    await coin.connect(treasury).approve(player.address, max);
    await coin.connect(player).transferFrom(treasury.address, other.address, 7n);
    assert.equal(await coin.allowance(treasury.address, player.address), max);
  });

  it("burns to the dead address without touching minted supply", async () => {
    const { coin, treasury } = await deploy();
    const burn = ethers.parseUnits("1000", 18);
    await coin.connect(treasury).burn(burn);
    assert.equal(await coin.balanceOf(DEAD), burn);
    assert.equal(await coin.balanceOf(treasury.address), SUPPLY - burn);
    assert.equal(await coin.totalSupply(), SUPPLY);
  });

  it("rejects a zero supply deploy", async () => {
    const Coin = await ethers.getContractFactory("HuepotCoin");
    await assert.rejects(Coin.deploy(0), /InsufficientBalance/);
  });
});
