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
    VOTED,
    CONFIRMED,
    EXPIRED,
}

export enum ProcessStep {
    NONE,
    RECEIVED_REGISTER, // => REGISTER
    RECEIVED_BROADCAST, // => SEND CODE
    SENT_EMAIL, // => WAITING
    RECEIVED_CODE, // => VOTE
    VOTED, // => COUNT
    FINISHED,
}

export enum AuthenticationMode {
    NoEMailNoCode,
    NoEMailKnownCode,
    YesEMailKnownCode,
    YesEMailUnknownCode,
}

export interface IValidationData {
    requestId: string;
    requestEmail: string;
    requestAddress: string;
    requestNonce: string;
    requestSignature: string;
    receiver: string;
    signature: string;
    validationStatus: EmailValidationStatus;
    sendCode: string;
    receiveCode: string;
    expire: number;
    processStep: ProcessStep;
}

export function toValidationData(tx: ITransaction): IValidationData {
    return {
        requestId: tx.requestId,
        requestEmail: tx.request.email,
        requestAddress: tx.request.address,
        requestNonce: tx.request.nonce,
        requestSignature: tx.request.signature,
        receiver: tx.receiver,
        signature: tx.signature,
        validationStatus: EmailValidationStatus.NONE,
        sendCode: "",
        receiveCode: "",
        expire: 0,
        processStep: ProcessStep.NONE,
    };
}

export function toTransaction(data: IValidationData): ITransaction {
    return {
        requestId: data.requestId,
        request: {
            email: data.requestEmail,
            address: data.requestAddress,
            nonce: data.requestNonce,
            signature: data.requestSignature,
        },
        receiver: data.receiver,
        signature: data.signature,
    };
}
