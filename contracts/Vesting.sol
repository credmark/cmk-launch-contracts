//SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./CMKToken.sol";

contract Vesting is Context, AccessControl {
    using SafeMath for uint;
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    modifier onlyOwner {
        require(
            hasRole(OWNER_ROLE, _msgSender()),
            "Only owner can call this function."
        );
        _;
    }

    event VestingScheduleAdded(address account, uint allocation, uint timestamp, uint vestingSeconds, uint cliffSeconds);
    event VestingScheduleCanceled(address account);
    event AllocationClaimed(address account, uint amount, uint timestamp);

    struct VestingSchedule {
        address account;
        uint allocation;
        uint startTimestamp;
        uint vestingSeconds;
        uint cliffSeconds;
        uint claimedAmount;
    }

    mapping( address => VestingSchedule ) public _vestingSchedules;
    CMKToken internal _cmk;

    uint internal _totalAllocation;
    uint internal _totalClaimedAllocation;
    

    constructor ( address ownerAddress, address cmkAddress ) public {
        _setupRole(OWNER_ROLE, ownerAddress);
        _cmk = CMKToken(cmkAddress);
    }

    function addVestingSchedule(address account, uint allocation, uint vestingSeconds, uint cliffSeconds) public onlyOwner {

        require(_vestingSchedules[account].account==address(0x0), "ERROR: Vesting already exists" );
        require(cliffSeconds <= vestingSeconds, "ERROR: Cannot cliff longer than vest");
        require(_totalAllocation.add(allocation) <= _cmk.balanceOf(address(this)), "ERROR: Total allocation cannot be greater than the maximum allocation allowed");
        require(vestingSeconds > 0, "ERROR: Vesting Time cannot be 0 seconds");

        _totalAllocation += allocation;
        _vestingSchedules[account] = VestingSchedule(
            account, 
            allocation, 
            block.timestamp, 
            vestingSeconds, 
            cliffSeconds, 
            0);


        emit VestingScheduleAdded(account, allocation, block.timestamp, vestingSeconds, cliffSeconds);
    }
    
    function claim() public {
        return _claim(_msgSender());
    }

    function _claim(address account) internal {
        uint amount = getClaimableAmount(account);

        require(_vestingSchedules[account].claimedAmount.add(amount) <= _vestingSchedules[account].allocation, "ERROR: Cannot claim higher amount than unclaimed amount from total allocation");

        _cmk.transfer(account, amount);

        _vestingSchedules[account].claimedAmount += amount;
        
        _totalClaimedAllocation += amount;

        emit AllocationClaimed(account, amount, block.timestamp);
    }

    function cancel(address account) public onlyOwner {

        uint unvestedAllocation = getUnvestedAmount(account);

        _vestingSchedules[account].allocation = _vestingSchedules[account].allocation.sub(unvestedAllocation);
        _vestingSchedules[account].vestingSeconds = getElapsedVestingTime(account);

        _totalAllocation -= unvestedAllocation;

        emit VestingScheduleCanceled(account);
    }



    ///// getters /////

    //// global /////
    function getCmkTokenAddress() public view returns (address) {
        return address(_cmk);
    }

    function getTotalAllocation() public view returns (uint) {
        return _totalAllocation;
    }

    function getTotalClaimedVestingSchedule() public view returns (uint) {
        return _totalClaimedAllocation;
    }

    //// by vesting definition /////

    function getVestingSchedule(address account) public view returns (VestingSchedule memory) {
        return _vestingSchedules[account];
    }

    function getClaimedAmount(address account) public view returns (uint) {
        return _vestingSchedules[account].claimedAmount;
    }

    function getVestingMaturationTimestamp(address account) public view returns (uint) {
        return _vestingSchedules[account].startTimestamp.add(_vestingSchedules[account].vestingSeconds);
    }

    function getElapsedVestingTime(address account) public view returns (uint) {
        if(block.timestamp > getVestingMaturationTimestamp(account)){
            return _vestingSchedules[account].vestingSeconds;
        }
        return block.timestamp.sub(_vestingSchedules[account].startTimestamp);
    }

    function getVestedAmount(address account) public view returns (uint) {
        return _vestingSchedules[account].allocation.mul( getElapsedVestingTime(account) ).div(_vestingSchedules[account].vestingSeconds);
    }

    function getUnvestedAmount(address account) public view returns (uint) {
        return  _vestingSchedules[account].allocation.sub(getVestedAmount(account));
    }

    function getClaimableAmount(address account) public view returns (uint) {

        //If we're earlier than the cliff, zero allocation is claimable.
        if(block.timestamp < _vestingSchedules[account].startTimestamp.add(_vestingSchedules[account].cliffSeconds)){
            return 0;
        }

        //Claimable amount is the vested, unclaimed amount.
        return getVestedAmount(account).sub(getClaimedAmount(account));
    }
}