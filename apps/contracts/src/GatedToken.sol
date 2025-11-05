// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title GatedToken
/// @notice ERC20 token with allowlist-gated transfers and admin controls for ChainEquity demo.
contract GatedToken is ERC20, Pausable, AccessControl {
    bytes32 public constant ALLOWLIST_MANAGER_ROLE = keccak256("ALLOWLIST_MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    mapping(address => bool) private _allowlist;

    /// @notice Emitted whenever a wallet approval status changes.
    event AllowlistUpdated(address indexed wallet, bool approved, address indexed operator);

    error NotAllowlisted(address wallet);

    constructor(string memory name_, string memory symbol_, address admin) ERC20(name_, symbol_) {
        require(admin != address(0), "admin required");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ALLOWLIST_MANAGER_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        _setAllowlist(admin, true);
    }

    /// @notice Override decimals to use whole-share tokens.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice Returns true if the wallet is approved for transfers.
    function isAllowlisted(address wallet) external view returns (bool) {
        return _allowlist[wallet];
    }

    /// @notice Approve or revoke a wallet's allowlisted status.
    function setAllowlistStatus(address wallet, bool approved) external onlyRole(ALLOWLIST_MANAGER_ROLE) {
        _setAllowlist(wallet, approved);
    }

    /// @notice Batch update helper for demonstrations.
    function setAllowlistBatch(address[] calldata wallets, bool approved) external onlyRole(ALLOWLIST_MANAGER_ROLE) {
        uint256 length = wallets.length;
        for (uint256 i = 0; i < length; ++i) {
            _setAllowlist(wallets[i], approved);
        }
    }

    /// @notice Mint new shares to an allowlisted wallet.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (!_allowlist[to]) revert NotAllowlisted(to);
        _mint(to, amount);
    }

    /// @notice Burn caller's shares.
    function burn(uint256 amount) external whenNotPaused {
        if (!_allowlist[_msgSender()]) revert NotAllowlisted(_msgSender());
        _burn(_msgSender(), amount);
    }

    /// @notice Pause all transfers (used during migrations).
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Resume transfers after migrations.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _update(address from, address to, uint256 value) internal override whenNotPaused {
        if (from != address(0) && !_allowlist[from]) revert NotAllowlisted(from);
        if (to != address(0) && !_allowlist[to]) revert NotAllowlisted(to);
        super._update(from, to, value);
    }

    function _setAllowlist(address wallet, bool approved) private {
        require(wallet != address(0), "invalid wallet");
        if (_allowlist[wallet] == approved) {
            emit AllowlistUpdated(wallet, approved, _msgSender());
            return;
        }
        _allowlist[wallet] = approved;
        emit AllowlistUpdated(wallet, approved, _msgSender());
    }
}
