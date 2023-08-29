/**
 * 검증자 노드의 정보
 */
export interface ValidatorNodeInfo {
    /**
     * 검증자 노드의 아이디(검증자의 주소)
     */
    nodeId: string;

    /**
     * 검증자의 엔드포인트
     */
    endpoint: string;

    /**
     * 검증자 클라이언트 프로그램의 버전
     */
    version: string;
}

/**
 * 등록 요청을 검증자들에게 전파할 때 사용되는 데이터구조
 */
export interface ITransaction {
    /**
     * 요청데이터
     */
    request: {
        email: string;
        address: string;
        nonce: string;
        signature: string;
    };

    /**
     * 요청아이디
     */
    requestId: string;

    /**
     * 요청을 받은 검증자의 주소
     */
    receiver: string;

    /**
     * 요청을 받은 검증자의 서명
     */
    signature: string;
}

/**
 * 사용자가 검증자에게 제출한 이메일 인증코드를 다른 검증자들에게 전파할 때 사용하는 데이터구조
 */
export interface ISubmitData {
    requestId: string;
    code: string;
    receiver: string;
    signature: string;
}

/**
 * 이메일 인증에 대한 상태정보
 */
export enum EmailValidationStatus {
    NONE,
    SENT,
    CONFIRMED,
}

/**
 * 이메일 인증의 상태를 기록하기 위한 데이터
 */
export interface IEmailValidation {
    tx: ITransaction;
    status: EmailValidationStatus;
    sendCode: string;
    receiveCode: string;
}

/**
 * 검증자의 투표
 */
export enum Ballot {
    NONE,
    AGREEMENT,
    OPPOSITION,
    ABSTAINING,
}
