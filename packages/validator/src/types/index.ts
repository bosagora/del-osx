interface ValidatorNodeInfo {
    nodeId: string;
    endpoint: string;
    version: string;
}

interface ITransaction {
    request: {
        email: string;
        address: string;
        nonce: string;
        signature: string;
    };
    status: number;
    requestId: string;
    receiver: string;
    signature: string;
}
