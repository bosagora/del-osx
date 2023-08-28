// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// E000 : invalid signature
// E001 : invalid email hash
// E002 : invalid address
// E003 : not validator

/// Contract for converting e-mail to wallet
contract LinkCollection {
    bytes32 public constant NULL = 0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855;

    mapping(bytes32 => address) private emailToAddress;
    mapping(address => bytes32) private addressToEmail;
    mapping(address => uint256) private nonce;

    /// @notice 요청 아이템의 상태코드
    enum RequestStatus {
        INVALID,
        REQUESTED,
        ACCEPTED,
        REJECTED
    }

    struct RequestItem {
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
    mapping(uint256 => RequestItem) private requests;

    enum Ballot {
        NONE,
        AGREEMENT,
        OPPOSITION,
        ABSTAINING
    }

    uint256 private quorum;
    uint256 private latestId;

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

    mapping(address => ValidatorItem) private validators;
    address[] private validatorItems;

    /// @notice 등록요청인 완료된 후 발생되는 이벤트
    event AddedRequestItem(uint256 id, bytes32 email, address wallet);
    /// @notice 등록요청이 승인된 후 발생되는 이벤트
    event AcceptedRequestItem(uint256 id, bytes32 email, address wallet);
    /// @notice 등록요청이 거부된 후 발생되는 이벤트
    event RejectedRequestItem(uint256 id, bytes32 email, address wallet);
    /// @notice 항목이 업데이트 후 발생되는 이벤트
    event UpdatedLinkItem(bytes32 email, address wallet1, address wallet2);

    /// @notice 생성자
    /// @param _validators 검증자들
    constructor(address[] memory _validators) {
        for (uint256 i = 0; i < _validators.length; ++i) {
            ValidatorItem memory item = ValidatorItem({
                validator: _validators[i],
                index: i,
                endpoint: "",
                status: ValidatorStatus.ACTIVE
            });
            validatorItems.push(_validators[i]);
            validators[_validators[i]] = item;
        }

        quorum = uint256(2000) / uint256(3);
        latestId = 0;
    }

    /// @notice 검증자들만 호출할 수 있도록 해준다.
    modifier onlyValidator() {
        require(validators[msg.sender].status == ValidatorStatus.ACTIVE, "E003");
        _;
    }

    /// @notice 이메일-지갑주소 항목을 업데이트 한다
    /// @param _email 이메일의 해시
    /// @param _wallet1 현재 지갑주소
    /// @param _signature1 현재 지갑주소의 서명
    /// @param _wallet2 새로운 지갑주소
    /// @param _signature2 새로운 지갑주소의 서명
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

        require(emailToAddress[_email] == _wallet1, "E001");
        require(addressToEmail[_wallet1] == _email, "E002");
        require(addressToEmail[_wallet2] == bytes32(0x00), "E002");
        require(_wallet1 != _wallet2, "E002");

        delete addressToEmail[_wallet1];

        emailToAddress[_email] = _wallet2;
        addressToEmail[_wallet2] = _email;

        nonce[_wallet1]++;
        nonce[_wallet2]++;

        emit UpdatedLinkItem(_email, _wallet1, _wallet2);
    }

    /// @notice 이메일-지갑주소 항목의 등록을 요청한다
    /// @param _email 이메일의 해시
    /// @param _wallet 지갑주소
    /// @param _signature 지갑주소의 서명
    function addRequest(bytes32 _email, address _wallet, bytes calldata _signature) public {
        require(_email != NULL, "E001");
        bytes32 dataHash = keccak256(abi.encode(_email, _wallet, nonce[_wallet]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), _signature) == _wallet, "E000");

        require(emailToAddress[_email] == address(0x00), "E001");
        require(addressToEmail[_wallet] == bytes32(0x00), "E002");

        nonce[_wallet]++;

        uint256 id = latestId++;
        requests[id].id = id;
        requests[id].email = _email;
        requests[id].wallet = _wallet;
        requests[id].signature = _signature;
        requests[id].status = RequestStatus.REQUESTED;

        emit AddedRequestItem(id, _email, _wallet);
    }

    /// @notice 검증자들이 이메일 검증결과를 등록한다.
    /// @param _id 요청 아이디
    /// @param _ballot 이메일 검증결과
    function voteRequest(uint _id, Ballot _ballot) public onlyValidator {
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

                if ((requests[_id].agreement * 1000) / validatorItems.length >= quorum) {
                    if (
                        emailToAddress[requests[_id].email] == address(0x00) &&
                        addressToEmail[requests[_id].wallet] == bytes32(0x00)
                    ) {
                        emailToAddress[requests[_id].email] = requests[_id].wallet;
                        addressToEmail[requests[_id].wallet] = requests[_id].email;
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

    /// @notice 검증자 자신의 API 엔드포인트를 등록한다.
    /// @param _endpoint API 엔드포인트
    function updateEndpoint(string memory _endpoint) public onlyValidator {
        require(validators[msg.sender].status != ValidatorStatus.INVALID, "No exists validator's info");
        validators[msg.sender].endpoint = _endpoint;
    }

    /// @notice 이메일해시와 연결된 지갑주소를 리턴한다.
    /// @param _email 이메일의 해시
    function toAddress(bytes32 _email) public view returns (address) {
        return emailToAddress[_email];
    }

    /// @notice 지갑주소와 연결된 이메일해시를 리턴한다.
    /// @param _wallet 지갑주소
    function toEmail(address _wallet) public view returns (bytes32) {
        return addressToEmail[_wallet];
    }

    /// @notice nonce를  리턴한다
    /// @param _wallet 지갑주소
    function nonceOf(address _wallet) public view returns (uint256) {
        return nonce[_wallet];
    }

    /// @notice 검증자들의 정보를 리턴한다.
    function getValidators() public view returns (ValidatorItem[] memory) {
        uint256 len = validatorItems.length;
        ValidatorItem[] memory items = new ValidatorItem[](len);
        for (uint256 i = 0; i < len; i++) {
            items[i] = validators[validatorItems[i]];
        }
        return items;
    }

    /// @notice 검증자들의 주소를 리턴한다.
    function getAddressOfValidators() public view returns (address[] memory) {
        uint256 len = validatorItems.length;
        address[] memory items = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            items[i] = validatorItems[i];
        }
        return items;
    }

    /// @notice 검증자들의 갯수를 리턴한다
    function getValidatorLength() public view returns (uint256) {
        return validatorItems.length;
    }

    /// @notice 검증자의 정보를 리턴한다.
    /// @param _idx 검증자의 인덱스
    function getValidator(uint _idx) public view returns (ValidatorItem memory) {
        require(_idx < validatorItems.length, "Out of range");
        return validators[validatorItems[_idx]];
    }
}
