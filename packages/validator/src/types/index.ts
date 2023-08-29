export interface ValidatorNodeInfo {
    nodeId: string;
    endpoint: string;
    version: string;
}

export interface ITransaction {
    request: {
        email: string;
        address: string;
        nonce: string;
        signature: string;
    };
    requestId: string;
    receiver: string;
    signature: string;
}

export interface ISubmitData {
    requestId: string;
    code: string;
    receiver: string;
    signature: string;
}

export enum EmailValidationStatus {
    NONE,
    SENT,
    CONFIRMED,
}

export interface IEmailValidation {
    tx: ITransaction;
    status: EmailValidationStatus;
    sendCode: string;
    receiveCode: string;
}

export enum Ballot {
    NONE,
    AGREEMENT,
    OPPOSITION,
    ABSTAINING,
}
