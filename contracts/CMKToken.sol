//SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract CMKToken is ERC20, ERC20Permit {

    /// @param daoAddress Address that will receive the ownership of the tokens initially
    constructor ( address daoAddress )
        ERC20("Credmark", "CMK")
        ERC20Permit("Credmark")
        {
            // Initial supply is 100 million (100e6)
            // We are using a decimal value of 18
            _mint(daoAddress, 100e6 ether);
        }
}