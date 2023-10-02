// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// Contract for converting e-mail to wallet
contract EmailLinkCollection {
    bytes32 public constant NULL = 0xd669bffe0491667304d87185db312d6477ed1f0fa95a26ff5405a90e6dddc0d6;

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
        bytes32 id;
        bytes32 email;
        address wallet;
        bytes signature;
        uint32 agreement;
        mapping(address => bool) voters;
        RequestStatus status;
    }
    mapping(bytes32 => RequestItem) private requests;
    bytes32[] private requestIds;

    uint256 private quorum;

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
    address[] private validatorAddresses;

    /// @notice 등록요청인 완료된 후 발생되는 이벤트
    event AddedRequestItem(bytes32 id, bytes32 email, address wallet);
    /// @notice 등록요청이 승인된 후 발생되는 이벤트
    event AcceptedRequestItem(bytes32 id, bytes32 email, address wallet);
    /// @notice 등록요청이 거부된 후 발생되는 이벤트
    event RejectedRequestItem(bytes32 id, bytes32 email, address wallet);

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
            validatorAddresses.push(_validators[i]);
            validators[_validators[i]] = item;
        }

        quorum = uint256(2000) / uint256(3);
    }

    /// @notice 검증자들만 호출할 수 있도록 해준다.
    modifier onlyValidator() {
        require(validators[msg.sender].status == ValidatorStatus.ACTIVE, "Not validator");
        _;
    }

    /// @notice 이용할 수 있는 아이디 인지 알려준다.
    /// @param _id 요청 아이디
    function isAvailable(bytes32 _id) public view returns (bool) {
        if (requests[_id].status == RequestStatus.INVALID) return true;
        else return false;
    }

    /// @notice 이메일-지갑주소 항목의 등록을 요청한다
    /// @param _id 요청 아이디
    /// @param _email 이메일의 해시
    /// @param _wallet 지갑주소
    /// @param _signature 지갑주소의 서명
    function addRequest(bytes32 _id, bytes32 _email, address _wallet, bytes calldata _signature) public {
        require(requests[_id].status == RequestStatus.INVALID, "Invalid ID");
        require(_email != NULL, "Invalid email hash");
        bytes32 dataHash = keccak256(abi.encode(_email, _wallet, nonce[_wallet]));
        require(ECDSA.recover(ECDSA.toEthSignedMessageHash(dataHash), _signature) == _wallet, "Invalid signature");

        require(addressToEmail[_wallet] == bytes32(0x00), "Invalid address");

        nonce[_wallet]++;

        requests[_id].id = _id;
        requests[_id].email = _email;
        requests[_id].wallet = _wallet;
        requests[_id].signature = _signature;
        requests[_id].status = RequestStatus.REQUESTED;
        requestIds.push(_id);

        emit AddedRequestItem(_id, _email, _wallet);
    }

    /// @notice 검증자들이 이메일 검증결과를 등록한다.
    /// @param _id 요청 아이디
    function voteRequest(bytes32 _id) public onlyValidator {
        require(requests[_id].status != RequestStatus.INVALID, "Invalid ID");
        RequestItem storage req = requests[_id];
        if (req.status == RequestStatus.REQUESTED) {
            if (req.voters[msg.sender] == false) {
                req.voters[msg.sender] = true;
                req.agreement++;
            }
        }
    }

    /// @notice 개표를 진행할 수 있는지를 확인한다.
    /// @param _id 요청 아이디
    function canCountVote(bytes32 _id) public view returns (uint8) {
        RequestItem storage req = requests[_id];
        if (req.status == RequestStatus.REQUESTED) {
            if ((req.agreement * 1000) / validatorAddresses.length >= quorum) {
                return uint8(1);
            } else {
                return uint8(2);
            }
        }
        return uint8(0);
    }

    /// @notice 개표를 진행한다.
    /// @param _id 요청 아이디
    function countVote(bytes32 _id) public onlyValidator {
        RequestItem storage req = requests[_id];
        if (req.status == RequestStatus.REQUESTED) {
            if ((req.agreement * 1000) / validatorAddresses.length >= quorum) {
                if (addressToEmail[req.wallet] == bytes32(0x00)) {
                    address oldWallet = emailToAddress[req.email];
                    if (oldWallet != address(0x00)) {
                        delete addressToEmail[oldWallet];
                    }
                    emailToAddress[req.email] = req.wallet;
                    addressToEmail[req.wallet] = req.email;
                    req.status = RequestStatus.ACCEPTED;
                    emit AcceptedRequestItem(req.id, req.email, req.wallet);
                } else {
                    req.status = RequestStatus.REJECTED;
                    emit RejectedRequestItem(req.id, req.email, req.wallet);
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
        uint256 len = validatorAddresses.length;
        ValidatorItem[] memory items = new ValidatorItem[](len);
        for (uint256 i = 0; i < len; i++) {
            items[i] = validators[validatorAddresses[i]];
        }
        return items;
    }

    /// @notice 검증자들의 주소를 리턴한다.
    function getAddressOfValidators() public view returns (address[] memory) {
        uint256 len = validatorAddresses.length;
        address[] memory items = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            items[i] = validatorAddresses[i];
        }
        return items;
    }

    /// @notice 검증자들의 갯수를 리턴한다
    function getValidatorLength() public view returns (uint256) {
        return validatorAddresses.length;
    }

    /// @notice 검증자의 정보를 리턴한다.
    /// @param _idx 검증자의 인덱스
    function getValidator(uint _idx) public view returns (ValidatorItem memory) {
        require(_idx < validatorAddresses.length, "Out of range");
        return validators[validatorAddresses[_idx]];
    }

    function getRequestItem(bytes32 _id) public view returns (uint32 agreement, RequestStatus status) {
        return (requests[_id].agreement, requests[_id].status);
    }
}
