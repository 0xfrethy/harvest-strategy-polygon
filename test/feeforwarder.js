// Utilities
const addresses = require("./test-config.js");
const Utils = require("./utilities/Utils.js");
const {
  impersonates,
  setupCoreProtocol,
  depositVault,
  swapMaticToToken,
  wrapMatic,
  addLiquidity
} = require("./utilities/hh-utils.js");

const { send } = require("@openzeppelin/test-helpers");
const BigNumber = require("bignumber.js");
const IERC20 = artifacts.require("IERC20");
const Strategy = artifacts.require("NoopStrategy");
const IFeeRewardForwarder = artifacts.require("IFeeRewardForwarder");

// Vanilla Mocha test. Increased compatibility with tools that integrate Mocha.
describe("FeeForwarder Test", function() {
  let accounts;

  // external contracts
  let underlying;
  let quick = "0x831753dd7087cac61ab5644b308642cc1c33dc13";
  let sushi = "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a";
  let weth = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";
  let quickToken;
  let sushiToken;

  // parties in the protocol
  let governance;

  // numbers used in tests
  let quickBalance;
  let sushiBalance;

  // Core protocol contracts
  let controller;
  let vault;
  let strategy;

  async function setupExternalContracts() {
    underlying = await IERC20.at(addresses.iFARM);
    console.log("Fetching Underlying at: ", underlying.address);
  }

  async function setupBalance(){
    await swapMaticToToken(
      governance,
      [addresses.wMatic, weth, sushi],
      "1000" + "000000000000000000",
      addresses.SushiRouter
    );
    sushiBalance = new BigNumber(await sushiToken.balanceOf(governance));
    await swapMaticToToken(
      governance,
      [addresses.wMatic, quick],
      "1000" + "000000000000000000",
      addresses.QuickRouter
    );
    quickBalance = new BigNumber(await quickToken.balanceOf(governance));
  }

  before(async function() {
    governance = "0xf00dD244228F51547f0563e60bCa65a30FBF5f7f";
    accounts = await web3.eth.getAccounts();

    // impersonate accounts
    await impersonates([governance]);

    let etherGiver = accounts[9];
    await send.ether(etherGiver, governance, "10000" + "000000000000000000")

    await setupExternalContracts();
    [controller, vault, strategy, rewardPool] = await setupCoreProtocol({
      "existingVaultAddress": null,
      "strategyArtifact": Strategy,
      "strategyArgs": ["storageAddr", underlying.address, "vaultAddr"],
      "underlying": underlying,
      "governance": governance,
      "rewardPool" : true,
      "rewardPoolConfig": {
        type: 'PotPool',
        rewardTokens: [addresses.iFARM]
      },
    });

    quickToken = await IERC20.at(quick);
    sushiToken = await IERC20.at(sushi);

    await setupBalance();
  });

  describe("Happy path", function() {
    it("Forward fees and buybacks", async function() {

      feeForwarder = await IFeeRewardForwarder.at(await controller.feeRewardForwarder());

      govBalance1 = new BigNumber(await underlying.balanceOf(governance));
      console.log("Gov Balance 1:", govBalance1.toFixed());

      await quickToken.approve(feeForwarder.address, quickBalance.div(2), {from: governance});
      await feeForwarder.poolNotifyFixedTarget(quick, quickBalance.div(2), {from: governance});
      govBalance2 = new BigNumber(await underlying.balanceOf(governance));
      console.log("Gov Balance 2:", govBalance2.toFixed());

      await sushiToken.approve(feeForwarder.address, sushiBalance.div(2), {from: governance});
      await feeForwarder.poolNotifyFixedTarget(sushi, sushiBalance.div(2), {from: governance});
      govBalance3 = new BigNumber(await underlying.balanceOf(governance));
      console.log("Gov Balance 3:", govBalance3.toFixed());

      poolBalance1 = new BigNumber(await underlying.balanceOf(rewardPool.address));
      console.log("Pool Balance 1:", poolBalance1.toFixed());

      await quickToken.approve(feeForwarder.address, quickBalance.div(2), {from: governance});
      await feeForwarder.notifyFeeAndBuybackAmounts(quick, quickBalance.div(4), rewardPool.address, quickBalance.div(4).minus(1), {from: governance});
      govBalance4 = new BigNumber(await underlying.balanceOf(governance));
      console.log("Gov Balance 4:", govBalance4.toFixed());
      poolBalance2 = new BigNumber(await underlying.balanceOf(rewardPool.address));
      console.log("Pool Balance 2:", poolBalance2.toFixed());

      await sushiToken.approve(feeForwarder.address, sushiBalance.div(2), {from: governance});
      await feeForwarder.notifyFeeAndBuybackAmounts(sushi, sushiBalance.div(4), rewardPool.address, sushiBalance.div(4).minus(1), {from: governance});
      govBalance5 = new BigNumber(await underlying.balanceOf(governance));
      console.log("Gov Balance 5:", govBalance5.toFixed());
      poolBalance3 = new BigNumber(await underlying.balanceOf(rewardPool.address));
      console.log("Pool Balance 3:", poolBalance3.toFixed());

      Utils.assertBNGt(govBalance5, govBalance4);
      Utils.assertBNGt(govBalance4, govBalance3);
      Utils.assertBNGt(govBalance3, govBalance2);
      Utils.assertBNGt(govBalance2, govBalance1);

      Utils.assertBNGt(poolBalance3, poolBalance2);
      Utils.assertBNGt(poolBalance2, poolBalance1);
    });
  });
});
