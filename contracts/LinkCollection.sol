// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// E000 : invalid signature
// E001 : invalid email hash
// E002 : invalid address

/// Contract for converting e-mail to wallet
contract LinkCollection {
    /// Mapping for converting email to wallet address
    mapping(bytes32 => address) private toAddress;

    /// Mapping for converting wallet address to email
    mapping(address => bytes32) private toHash;

    mapping(address => uint256) public nonce;

    event Added(bytes32 hash, address sender);

    /// Add an item
    function add(bytes32 hash, address sender, bytes calldata signature) public {
        bytes32 dataHash = keccak256(abi.encode(hash, sender, nonce[sender]));
        require(ECDSA.recover(dataHash, signature) == sender, "E000");

        require(toAddress[hash] == address(0x00), "E001");
        require(toHash[sender] == bytes32(0x00), "E002");

        toAddress[hash] = sender;
        toHash[sender] = hash;

        nonce[sender]++;

        emit Added(hash, sender);
    }
}
