interface ValidatorNodeInfo {
    nodeId: string;
    endpoint: string;
    version: string;
}

interface Transaction {
    type: number;
    request: {
        email: string;
        address: string;
        signature: string;
    };
    validators: string[];
    signatures: [
        {
            validator: string;
            signature: string;
        }
    ];
    mail: string[];
}
