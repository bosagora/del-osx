// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// E000 : invalid signature
// E001 : invalid email hash
// E002 : invalid address

/// Contract for converting e-mail to wallet
contract LinkCollection is AccessControl {
    bytes32 public constant LINK_COLLECTION_ADMIN_ROLE = keccak256("LINK_COLLECTION_ADMIN_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant NULL = 0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855;

    /// Mapping for converting email to wallet address
    mapping(bytes32 => address) public toAddress;

    /// Mapping for converting wallet address to email
    mapping(address => bytes32) public toHash;

    mapping(address => uint256) public nonce;

    event AddedLinkItem(bytes32 hash, address sender);
    event UpdatedLinkItem(bytes32 hash, address sender1, address sender2);

    constructor(address[] memory validators) {
        _setRoleAdmin(LINK_COLLECTION_ADMIN_ROLE, LINK_COLLECTION_ADMIN_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, LINK_COLLECTION_ADMIN_ROLE);

        // self administration
        _setupRole(LINK_COLLECTION_ADMIN_ROLE, address(this));

        // register validators
        for (uint256 i = 0; i < validators.length; ++i) {
            _setupRole(VALIDATOR_ROLE, validators[i]);
        }
    }

    /**
     * @dev Modifier to make a function callable only by a certain role. In
     * addition to checking the sender's role, `address(0)` 's role is also
     * considered. Granting a role to `address(0)` is equivalent to enabling
     * this role for everyone.
     */
    modifier onlyRoleOrOpenRole(bytes32 role) {
        if (!hasRole(role, address(0))) {
            _checkRole(role, _msgSender());
        }
        _;
    }

    /// Add an item
    function add(bytes32 hash, address sender, bytes calldata signature) public onlyRoleOrOpenRole(VALIDATOR_ROLE) {
        require(hash != NULL, "E001");
        bytes32 dataHash = keccak256(abi.encode(hash, sender, nonce[sender]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), signature) == sender, "E000");

        require(toAddress[hash] == address(0x00), "E001");
        require(toHash[sender] == bytes32(0x00), "E002");

        toAddress[hash] = sender;
        toHash[sender] = hash;

        nonce[sender]++;

        emit AddedLinkItem(hash, sender);
    }

    /// Update an item
    function update(
        bytes32 hash,
        address sender1,
        bytes calldata signature1,
        address sender2,
        bytes calldata signature2
    ) public {
        require(hash != NULL, "E001");
        bytes32 dataHash1 = keccak256(abi.encode(hash, sender1, nonce[sender1]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash1), signature1) == sender1, "E000");

        bytes32 dataHash2 = keccak256(abi.encode(hash, sender2, nonce[sender2]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash2), signature2) == sender2, "E000");

        require(toAddress[hash] == sender1, "E001");
        require(toHash[sender1] == hash, "E002");
        require(toHash[sender2] == bytes32(0x00), "E002");
        require(sender1 != sender2, "E002");

        delete toHash[sender1];

        toAddress[hash] = sender2;
        toHash[sender2] = hash;

        nonce[sender1]++;
        nonce[sender2]++;

        emit UpdatedLinkItem(hash, sender1, sender2);
    }
}
