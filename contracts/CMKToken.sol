//SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CMKToken is ERC20 {

    /// @param daoAddress Address that will receive the ownership of the tokens initially
    constructor ( address daoAddress )
        public
        ERC20("Credmark Token", "CMK")
        {
            // Initial supply is 100 million (100e6)
            // We are using a decimal value of 18
            _mint(daoAddress, 100e6 ether);
        }
}