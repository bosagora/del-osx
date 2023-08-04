// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/// Contract for converting e-mail to wallet
contract LinkCollection {
    /// Mapping for converting email to wallet address
    mapping(bytes32 => address) private toAddress;

    /// Mapping for converting wallet address to email
    mapping(address => bytes32) private toHash;
}
