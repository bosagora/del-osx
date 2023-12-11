// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.8.20;

contract EmailStorage {
    /// @notice 요청 아이템의 상태코드
    enum RequestStatus {
        INVALID,
        REQUESTED,
        ACCEPTED,
        REJECTED
    }

    struct RequestItem {
        bytes32 id;
        bytes32 email;
        address wallet;
        bytes signature;
        uint32 agreement;
        mapping(address => bool) voters;
        RequestStatus status;
    }

    /// @notice 검증자의 상태코드
    enum ValidatorStatus {
        INVALID, //  초기값
        ACTIVE //  검증자의 기능이 활성화됨
    }

    struct ValidatorItem {
        address validator; // 검증자의 지갑주소
        uint256 index;
        string endpoint;
        ValidatorStatus status; // 검증자의 상태
    }

    bytes32 public constant NULL = 0xd669bffe0491667304d87185db312d6477ed1f0fa95a26ff5405a90e6dddc0d6;
    mapping(bytes32 => address) internal emailToAddress;
    mapping(address => bytes32) internal addressToEmail;
    mapping(address => uint256) internal nonce;
    mapping(bytes32 => RequestItem) internal requests;
    bytes32[] internal requestIds;
    uint256 internal quorum;
    mapping(address => ValidatorItem) internal validators;
    address[] internal validatorAddresses;
}
