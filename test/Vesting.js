const CMKToken = artifacts.require("CMKToken");
const Vesting = artifacts.require("Vesting");

const TEST_VESTING_1 = {
    vesting: 2000,
    cliff: 1000,
    amount: "1000000000000000000000000"
}
const TEST_VESTING_2 = {
    vesting: 15,
    cliff: 0,
    amount: "10000000000000000000000000"
}
const TIMESTAMP_WIGGLE_S = 30;
const MONTH_SEC = 2592000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const timestamp_equal = (timestamp_1, timestamp_2) => {
    if (timestamp_1 > 100000000000) {
        timestamp_1 = timestamp_1 / 1000;
    }
    if (timestamp_2 > 100000000000) {
        timestamp_2 = timestamp_2 / 1000;
    }
    if (Math.abs(timestamp_1 - timestamp_2) < TIMESTAMP_WIGGLE_S)
    {
        return true;
    }
    return false;
}

contract("Vesting Test", async accounts => { 

    before(async () => {
        DAO_ADDRESS = accounts[1];
        TEST_ADDRESS_1 = accounts[2];
        TEST_ADDRESS_2 = accounts[3];
        TEST_ADDRESS_3 = accounts[4];
        vesting_instance = await Vesting.deployed();
        cmk_instance = await CMKToken.deployed();
        OWNER_ROLE = await vesting_instance.OWNER_ROLE.call().valueOf();
        cmk_instance.transfer.sendTransaction(vesting_instance.address, "46500000000000000000000000", {from: DAO_ADDRESS});

    });

    it("Creates CMK address Correctly", async () => {

        let cmk_saved_address = await vesting_instance.getCmkTokenAddress.call();
        assert.equal(cmk_saved_address.valueOf(), cmk_instance.address);

    });

    it("DAO address has vesting ownership, others don't", async() => {

        let has_owner_role = await vesting_instance.hasRole(OWNER_ROLE.valueOf(), DAO_ADDRESS);
        assert.equal(has_owner_role.valueOf(), true);

    });

    it("Can Add Vesting Contracts", async () =>{
        await vesting_instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_1, 
            TEST_VESTING_1.amount, 
            TEST_VESTING_1.vesting, 
            TEST_VESTING_1.cliff, 
            {from: DAO_ADDRESS});
    });

    it("Passes the correct values to the vesting definition", async () =>{
        let vesting = await vesting_instance.getVestingSchedule.call(TEST_ADDRESS_1).valueOf();
        assert.equal(vesting.account, TEST_ADDRESS_1);
        assert.equal(vesting.allocation, TEST_VESTING_1.amount);
        assert.equal(timestamp_equal(Date.now(), parseInt(vesting.startTimestamp)), true);
        assert.equal(TEST_VESTING_1.vesting, parseInt(vesting.vestingSeconds));
        assert.equal(TEST_VESTING_1.cliff, parseInt(vesting.cliffSeconds));
        assert.equal(vesting.claimedAmount, 0);
    });

    it("Test Getters", async () => {
    

        let get_cmk_token_address = await vesting_instance.getCmkTokenAddress.call();
        let get_total_allocation = await vesting_instance.getTotalAllocation.call();
        let get_total_claimed_allocation = await vesting_instance.getTotalClaimedAllocation.call();

        let get_unvested_amount = await vesting_instance.getUnvestedAmount.call(TEST_ADDRESS_1);
        let get_vested_amount = await vesting_instance.getVestedAmount.call(TEST_ADDRESS_1);
        let get_elapsed_time = await vesting_instance.getElapsedVestingTime.call(TEST_ADDRESS_1);
        let get_claimed_amount = await vesting_instance.getClaimedAmount.call(TEST_ADDRESS_1);
        let get_claimable_amount = await vesting_instance.getClaimableAmount.call(TEST_ADDRESS_1);
        
        //Since we haven't sent Tx's, just calls, no blocktime has passed
        assert.equal(BigInt(get_unvested_amount.valueOf()) > 0, true);
        assert.equal(BigInt(get_vested_amount.valueOf()) == 0, true);
        assert.equal(BigInt(get_elapsed_time.valueOf()) == 0, true);
        assert.equal(BigInt(get_claimed_amount.valueOf()) == 0, true);
        assert.equal(BigInt(get_claimable_amount.valueOf()) == 0, true);

        assert.equal(get_cmk_token_address.valueOf(), cmk_instance.address);
        assert.equal(BigInt(get_total_allocation.valueOf()), BigInt(TEST_VESTING_1.amount));
        assert.equal(BigInt(get_total_claimed_allocation.valueOf()), 0);


    });

    it("Can't add the same vesting twice", async () =>{
        let addVestingReverted = false;
        try{
        await vesting_instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_1, 
            TEST_VESTING_1.amount, 
            TEST_VESTING_1.vesting, 
            TEST_VESTING_1.cliff, 
            {from: DAO_ADDRESS});
        } catch {
            addVestingReverted = true;
        }
        assert.equal(addVestingReverted, true)
    });

    it("Makes vested CMK Claimable", async () =>{
        await vesting_instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_2, 
            TEST_VESTING_2.amount, 
            TEST_VESTING_2.vesting, 
            TEST_VESTING_2.cliff, 
            {from: DAO_ADDRESS});
        
        await sleep(5000);
        
        let claim = await vesting_instance.claim.sendTransaction(
            {from: TEST_ADDRESS_2}
        );
        let vesting_1 = await vesting_instance.getVestingSchedule.call(TEST_ADDRESS_2).valueOf();

        await sleep(5000);
        claim = await vesting_instance.claim.sendTransaction(
            {from: TEST_ADDRESS_2}
        );
        let vesting_2 = await vesting_instance.getVestingSchedule.call(TEST_ADDRESS_2).valueOf();
        
        await sleep(6000);
        await vesting_instance.claim.sendTransaction(
            {from: TEST_ADDRESS_2}
        );
        let vesting_3 = await vesting_instance.getVestingSchedule.call(TEST_ADDRESS_2).valueOf();

        assert.equal(BigInt(vesting_1.claimedAmount) < BigInt(vesting_2.claimedAmount), true);
        assert.equal(BigInt(vesting_2.claimedAmount) < BigInt(vesting_3.claimedAmount), true);
        assert.equal(BigInt(vesting_3.allocation), BigInt(vesting_3.claimedAmount));
    });

    it("Can Cancel Contract", async () =>{
        await vesting_instance.addVestingSchedule.sendTransaction(
            TEST_ADDRESS_3, 
            TEST_VESTING_2.amount, 
            TEST_VESTING_2.vesting, 
            TEST_VESTING_2.cliff, 
            {from: DAO_ADDRESS});
        
        await sleep(5000);
        
        let claim = await vesting_instance.claim.sendTransaction(
            {from: TEST_ADDRESS_3}
        );
        let vesting_1 = await vesting_instance.getVestingSchedule.call(TEST_ADDRESS_3).valueOf();
        await sleep(5000);

        let cancel = await vesting_instance.cancel.sendTransaction(TEST_ADDRESS_3, {from: DAO_ADDRESS});
        let vesting_canceled = await vesting_instance.getVestingSchedule.call(TEST_ADDRESS_3).valueOf();
        console.log(vesting_1, vesting_canceled);
        

    });

    it("Only Owner can add Vesting", async () =>{

    });
});