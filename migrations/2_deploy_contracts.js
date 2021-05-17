require('dotenv').config(".env")
const cmkToken = artifacts.require("CMKToken");
const vestingSchedule = artifacts.require("VestingSchedule");

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(cmkToken, accounts[1]);
    let cmkContract = await cmkToken.deployed();
    await deployer.deploy(vestingSchedule, accounts[1], cmkContract.address)
  }
  