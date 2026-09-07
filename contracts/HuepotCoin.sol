// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * HUE — the Huepot coin. BEP-20 (ERC-20 compatible) on BNB Smart Chain.
 *
 * Deliberately minimal and final:
 *
 *  - Fixed supply, minted once to the deployer at construction.
 *  - No mint function. Nobody can inflate it, including us.
 *  - No owner, no pause, no blacklist, no upgrade path, no fee-on-transfer.
 *
 * A coin that a house hands out as a bonus is only worth holding if the house
 * cannot print more of it or freeze it. Every admin hook is a reason not to
 * trust the supply, so there are none. Play bonuses are paid out of a treasury
 * balance held like any other holder's, which means the bonus pool is visibly
 * finite on chain.
 */
contract HuepotCoin {
    string public constant name = "Huepot";
    string public constant symbol = "HUE";
    uint8 public constant decimals = 18;

    uint256 public immutable totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error ZeroAddress();
    error InsufficientBalance(uint256 have, uint256 need);
    error InsufficientAllowance(uint256 have, uint256 need);

    constructor(uint256 supply) {
        if (supply == 0) revert InsufficientBalance(0, 1);
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _move(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        // An infinite allowance is left untouched, which is what routers expect.
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance(allowed, value);
            allowance[from][msg.sender] = allowed - value;
        }
        _move(from, to, value);
        return true;
    }

    /// Destroy your own coins. Supply reported by totalSupply is the minted
    /// amount; burned coins sit unspendable at address zero.
    function burn(uint256 value) external returns (bool) {
        _move(msg.sender, address(0xdEaD), value);
        return true;
    }

    function _move(address from, address to, uint256 value) private {
        if (to == address(0)) revert ZeroAddress();
        uint256 held = balanceOf[from];
        if (held < value) revert InsufficientBalance(held, value);
        unchecked {
            balanceOf[from] = held - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}
