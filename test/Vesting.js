const CMKToken = artifacts.require("CMKToken");
const Vesting = artifacts.require("Vesting");

const TEST_VESTING_1 = {
    vesting: 2000,
    cliff: 1000,
    amount: "1000000000000000000000000"
};
const TEST_VESTING_2 = {
    vesting: 15,
    cliff: 0,
    amount: "10000000000000000000000000"
};

const TIMESTAMP_WIGGLE_S = 30;
const MONTH_SEC = 2592000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

contract("Vesting Tests", async accounts => {

    before(async () => {
        DEPLOYER_ADDRESS = accounts[0];
        DAO_ADDRESS = accounts[1];
        TEST_ADDRESS_1 = accounts[2];
        TEST_ADDRESS_2 = accounts[3];
        TEST_ADDRESS_3 = accounts[4];

        instance = await Vesting.deployed();
        cmk = await CMKToken.deployed();

        OWNER_ROLE = await instance.OWNER_ROLE.call().valueOf();
    });

    it("AddVestingSchedule Fails: No CMK in reserves.", async () => {
        let failed = false

        try {
            await instance.addVestingSchedule.sendTransaction(
                TEST_ADDRESS_1,
                TEST_VESTING_1.amount,
                TEST_VESTING_1.vesting,
                TEST_VESTING_1.cliff,
                { from: DAO_ADDRESS });
        } catch { failed = true; }

        assert.equal(failed, true);
    });

    it("CMK Transfer to vesting contract.", async () => {
        cmk.transfer.sendTransaction(instance.address, "46500000000000000000000000", { from: DAO_ADDRESS });

    });

    it("AddVestingSchedule Fails: No Vesting.", async () => {
        let failed = false

        try {
            await instance.addVestingSchedule.sendTransaction(
                TEST_ADDRESS_1,
                TEST_VESTING_1.amount,
                0,
                0,
                { from: DAO_ADDRESS });
        } catch { failed = true; }

        assert.equal(failed, true);
    });

    it("AddVestingSchedule Fails: Cliff longer than Vesting", async () => {
        let failed = false

        try {
            await instance.addVestingSchedule.sendTransaction(
                TEST_ADDRESS_1,
                TEST_VESTING_1.amount,
                100,
                200,
                { from: DAO_ADDRESS });
        } catch { failed = true; }

        assert.equal(failed, true);
    });

    it("AddVestingSchedule Fails: Non-Owner Permissions", async () => {
        let failed = false

        try {
            await instance.addVestingSchedule.sendTransaction(
                TEST_ADDRESS_1,
                TEST_VESTING_1.amount,
                TEST_VESTING_1.vesting,
                TEST_VESTING_1.cliff,
                { from: TEST_ADDRESS_2 });
        } catch { failed = true; }

        assert.equal(failed, true);
    });


    it("DAO address has ownership role", async () => {
        let has_owner_role = await instance.hasRole(OWNER_ROLE.valueOf(), DAO_ADDRESS);

        assert.equal(has_owner_role.valueOf(), true);

    });

    it("AddVestingSchedule Succeed", async () => {
        await instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_1,
            TEST_VESTING_1.amount,
            TEST_VESTING_1.vesting,
            TEST_VESTING_1.cliff,
            { from: DAO_ADDRESS });
        let vesting = await instance.getVestingSchedule.call(TEST_ADDRESS_1).valueOf();

        assert.equal(vesting.account, TEST_ADDRESS_1);
        assert.equal(vesting.allocation, TEST_VESTING_1.amount);
        assert.equal(TEST_VESTING_1.vesting, parseInt(vesting.vestingSeconds));
        assert.equal(TEST_VESTING_1.cliff, parseInt(vesting.cliffSeconds));
        assert.equal(vesting.claimedAmount, 0);
    });

    it("Getters Succeed", async () => {
        // GLOBAL
        let get_cmk_token_address = await instance.getCmkTokenAddress.call();
        let get_total_allocation = await instance.getTotalAllocation.call();
        let get_total_claimed_allocation = await instance.getTotalClaimedAllocation.call();

        // VESTING SCHEDULES
        let get_unvested_amount = await instance.getUnvestedAmount.call(TEST_ADDRESS_1);
        let get_vested_amount = await instance.getVestedAmount.call(TEST_ADDRESS_1);
        let get_elapsed_time = await instance.getElapsedVestingTime.call(TEST_ADDRESS_1);
        let get_claimable_amount = await instance.getClaimableAmount.call(TEST_ADDRESS_1);

        assert.equal(get_cmk_token_address.valueOf(), cmk.address);
        assert.equal(BigInt(get_total_allocation.valueOf()), BigInt(TEST_VESTING_1.amount));
        assert.equal(BigInt(get_total_claimed_allocation.valueOf()), 0);

        //Since we haven't sent Tx's, just calls, no blocktime has passed
        assert.equal(BigInt(get_unvested_amount.valueOf()) > 0, true);
        assert.equal(BigInt(get_vested_amount.valueOf()) == 0, true);
        assert.equal(BigInt(get_elapsed_time.valueOf()) == 0, true);
        assert.equal(BigInt(get_claimable_amount.valueOf()) == 0, true);
    });

    it("AddVestingSchedule Fails: Duplicate Vesting Schedule", async () => {
        let failed = false;
        try {
            await instance.addVestingSchedule.sendTransaction(
                TEST_ADDRESS_1,
                TEST_VESTING_1.amount,
                TEST_VESTING_1.vesting,
                TEST_VESTING_1.cliff,
                { from: DAO_ADDRESS });
        } catch { failed = true; }

        assert.equal(failed, true)
    });

    it("Claim Succeeds repeatedly, until after vesting period.", async () => {
        await instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_2,
            TEST_VESTING_2.amount,
            TEST_VESTING_2.vesting,
            TEST_VESTING_2.cliff,
            { from: DAO_ADDRESS });

        await sleep(5000);

        let claim = await instance.claim.sendTransaction(
            { from: TEST_ADDRESS_2 }
        );
        let vs1 = await instance.getVestingSchedule.call(TEST_ADDRESS_2).valueOf();

        await sleep(5000);
        claim = await instance.claim.sendTransaction(
            { from: TEST_ADDRESS_2 }
        );
        let vs2 = await instance.getVestingSchedule.call(TEST_ADDRESS_2).valueOf();

        await sleep(6000);
        await instance.claim.sendTransaction(
            { from: TEST_ADDRESS_2 }
        );
        let vs3 = await instance.getVestingSchedule.call(TEST_ADDRESS_2).valueOf();

        assert.equal(BigInt(vs1.claimedAmount) < BigInt(vs2.claimedAmount), true);
        assert.equal(BigInt(vs2.claimedAmount) < BigInt(vs3.claimedAmount), true);
        assert.equal(BigInt(vs3.allocation), BigInt(vs3.claimedAmount));

    });

    it("Cancel Succeeds", async () => {
        await instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_3,
            TEST_VESTING_2.amount,
            TEST_VESTING_2.vesting,
            TEST_VESTING_2.cliff,
            { from: DAO_ADDRESS });

        let total_allo_1 = await instance.getTotalAllocation.call();
        await sleep(5000);

        await instance.claim.sendTransaction({ from: TEST_ADDRESS_3 });
        let vs1 = await instance.getVestingSchedule.call(TEST_ADDRESS_3).valueOf();
        await sleep(5000);

        await instance.cancel.sendTransaction(TEST_ADDRESS_3, { from: DAO_ADDRESS });
        let vs2 = await instance.getVestingSchedule.call(TEST_ADDRESS_3).valueOf();

        await instance.claim.sendTransaction({ from: TEST_ADDRESS_3 });
        let vs3 = await instance.getVestingSchedule.call(TEST_ADDRESS_3).valueOf();
        let total_allo_2 = await instance.getTotalAllocation.call();
        assert.equal(BigInt(vs1.vestingSeconds) > BigInt(vs2.vestingSeconds), true);
        assert.equal(BigInt(vs1.allocation) > BigInt(vs2.allocation), true);
        assert.equal(BigInt(vs3.allocation), BigInt(vs3.claimedAmount));
        assert.equal(BigInt(total_allo_1) > BigInt(total_allo_2), true);
    });
});