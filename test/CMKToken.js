const CMKToken = artifacts.require("CMKToken");

contract("CMKToken Test", async accounts => {
    before(async () => {
        DAO_ADDRESS = accounts[1];
        cmk_instance = await CMKToken.deployed();
    });
    it("constructor should deposit 100M tokens into DAO Address", async () => {
      const balance = await cmk_instance.balanceOf.call(DAO_ADDRESS);
      assert.equal(balance.valueOf(), 100e6 * 1e18);
    });
});