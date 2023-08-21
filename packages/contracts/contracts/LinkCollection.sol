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

    /// @notice 검증자의 상태코드
    enum RequestStatus {
        INVALID,
        REQUESTED,
        ACCEPTED,
        REJECTED
    }

    struct RequestData {
        uint256 id;
        bytes32 email;
        address wallet;
        bytes signature;
        uint32 agreement;
        uint32 opposition;
        uint32 abstaining;
        mapping(address => Ballot) ballots;
        RequestStatus status;
    }
    mapping(uint256 => RequestData) private requests;

    enum Ballot {
        NONE,
        AGREEMENT,
        OPPOSITION,
        ABSTAINING
    }

    uint256 private quorum;
    uint256 private validatorLength;
    uint256 private latestId;

    event AddedRequestItem(uint256 id, bytes32 email, address wallet);
    event AcceptedRequestItem(uint256 id, bytes32 email, address wallet);
    event RejectedRequestItem(uint256 id, bytes32 email, address wallet);
    event UpdatedLinkItem(bytes32 email, address wallet1, address _wallet2);

    constructor(address[] memory _validators) {
        _setRoleAdmin(LINK_COLLECTION_ADMIN_ROLE, LINK_COLLECTION_ADMIN_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, LINK_COLLECTION_ADMIN_ROLE);

        // self administration
        _setupRole(LINK_COLLECTION_ADMIN_ROLE, address(this));

        // register validators
        for (uint256 i = 0; i < _validators.length; ++i) {
            _setupRole(VALIDATOR_ROLE, _validators[i]);
        }

        validatorLength = _validators.length;
        quorum = uint256(2000) / uint256(3);
        latestId = 0;
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

    /// Update an item
    function update(
        bytes32 _email,
        address _wallet1,
        bytes calldata _signature1,
        address _wallet2,
        bytes calldata _signature2
    ) public {
        require(_email != NULL, "E001");
        bytes32 dataHash1 = keccak256(abi.encode(_email, _wallet1, nonce[_wallet1]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash1), _signature1) == _wallet1, "E000");

        bytes32 dataHash2 = keccak256(abi.encode(_email, _wallet2, nonce[_wallet2]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash2), _signature2) == _wallet2, "E000");

        require(toAddress[_email] == _wallet1, "E001");
        require(toHash[_wallet1] == _email, "E002");
        require(toHash[_wallet2] == bytes32(0x00), "E002");
        require(_wallet1 != _wallet2, "E002");

        delete toHash[_wallet1];

        toAddress[_email] = _wallet2;
        toHash[_wallet2] = _email;

        nonce[_wallet1]++;
        nonce[_wallet2]++;

        emit UpdatedLinkItem(_email, _wallet1, _wallet2);
    }

    function addRequest(bytes32 _email, address _wallet, bytes calldata _signature) public {
        require(_email != NULL, "E001");
        bytes32 dataHash = keccak256(abi.encode(_email, _wallet, nonce[_wallet]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), _signature) == _wallet, "E000");

        require(toAddress[_email] == address(0x00), "E001");
        require(toHash[_wallet] == bytes32(0x00), "E002");

        nonce[_wallet]++;

        uint256 id = latestId++;
        requests[id].id = id;
        requests[id].email = _email;
        requests[id].wallet = _wallet;
        requests[id].signature = _signature;
        requests[id].status = RequestStatus.REQUESTED;

        emit AddedRequestItem(id, _email, _wallet);
    }

    function voteRequest(uint _id, Ballot _ballot) public onlyRoleOrOpenRole(VALIDATOR_ROLE) {
        require(requests[_id].status != RequestStatus.INVALID, "");

        if (requests[_id].status != RequestStatus.ACCEPTED) {
            if (requests[_id].ballots[msg.sender] != _ballot) {
                if (requests[_id].ballots[msg.sender] == Ballot.AGREEMENT) {
                    requests[_id].agreement--;
                } else if (requests[_id].ballots[msg.sender] == Ballot.OPPOSITION) {
                    requests[_id].opposition--;
                } else if (requests[_id].ballots[msg.sender] == Ballot.ABSTAINING) {
                    requests[_id].abstaining--;
                }
                if (_ballot == Ballot.AGREEMENT) {
                    requests[_id].agreement++;
                } else if (_ballot == Ballot.OPPOSITION) {
                    requests[_id].opposition++;
                } else {
                    requests[_id].abstaining++;
                }

                if ((requests[_id].agreement * 1000) / validatorLength >= quorum) {
                    if (
                        toAddress[requests[_id].email] == address(0x00) && toHash[requests[_id].wallet] == bytes32(0x00)
                    ) {
                        toAddress[requests[_id].email] = requests[_id].wallet;
                        toHash[requests[_id].wallet] = requests[_id].email;
                        requests[_id].status = RequestStatus.ACCEPTED;
                        emit AcceptedRequestItem(requests[_id].id, requests[_id].email, requests[_id].wallet);
                    } else {
                        requests[_id].status = RequestStatus.REJECTED;
                        emit RejectedRequestItem(requests[_id].id, requests[_id].email, requests[_id].wallet);
                    }
                }
            }
        }
    }
}
