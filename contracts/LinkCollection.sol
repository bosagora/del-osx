// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// E000 : invalid signature
// E001 : invalid email hash
// E002 : invalid address

/// Contract for converting e-mail to wallet
contract LinkCollection {
    /// Mapping for converting email to wallet address
    mapping(bytes32 => address) public toAddress;

    /// Mapping for converting wallet address to email
    mapping(address => bytes32) public toHash;

    mapping(address => uint256) public nonce;

    event Added(bytes32 hash, address sender);
    event Updated(bytes32 hash, address sender1, address sender2);

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

    /// Update an item
    function update(bytes32 hash, address sender1, bytes calldata signature1, address sender2, bytes calldata signature2) public {
        bytes32 dataHash1 = keccak256(abi.encode(hash, sender1, nonce[sender1]));
        require(ECDSA.recover(dataHash1, signature1) == sender1, "E000");

        bytes32 dataHash2 = keccak256(abi.encode(hash, sender2, nonce[sender2]));
        require(ECDSA.recover(dataHash2, signature2) == sender2, "E000");

        require(toAddress[hash] == sender1, "E001");
        require(toHash[sender1] == hash, "E002");
        require(toHash[sender2] == bytes32(0x00), "E002");
        require(sender1 != sender2, "E002");

        delete toHash[sender1];

        toAddress[hash] = sender2;
        toHash[sender2] = hash;

        nonce[sender1]++;
        nonce[sender2]++;

        emit Updated(hash, sender1, sender2);
    }
}
