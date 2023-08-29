import { LinkCollection } from "../../typechain-types";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { GasPriceManager } from "../contract/GasPriceManager";
import { ICodeGenerator } from "../delegator/CodeGenerator";
import { IEmailSender } from "../delegator/EMailSender";
import {
    Ballot,
    EmailValidationStatus,
    IEmailValidation,
    ISubmitData,
    ITransaction,
    ValidatorNodeInfo,
} from "../types";
import { ContractUtils } from "../utils/ContractUtils";
import { Peer, Peers } from "./Peers";
import { ValidatorNode } from "./ValidatorNode";

import { NonceManager } from "@ethersproject/experimental";
import "@nomiclabs/hardhat-ethers";
import { Signer, Wallet } from "ethers";
import * as hre from "hardhat";

import express from "express";
import { body, validationResult } from "express-validator";
import ip from "ip";

export class Router {
    private readonly _validator: ValidatorNode;
    private readonly _config: Config;
    private readonly _wallet: Wallet;
    private _peers: Peers;
    private _contract: LinkCollection | undefined;

    private readonly nodeInfo: ValidatorNodeInfo;

    private _initialized: boolean = false;

    private _startTimeStamp: number = 0;
    private _oldTimeStamp: number = 0;
    private _periodNumber: number = 0;

    private _validatorIndex: number;
    private _validators: Map<string, string> = new Map<string, string>();
    private _validations: Map<string, IEmailValidation> = new Map<string, IEmailValidation>();

    private readonly _emailSender: IEmailSender;
    private readonly _codeGenerator: ICodeGenerator;

    constructor(
        validator: ValidatorNode,
        config: Config,
        peers: Peers,
        emailSender: IEmailSender,
        codeGenerator: ICodeGenerator
    ) {
        this._validator = validator;
        this._config = config;
        this._peers = peers;
        this._emailSender = emailSender;
        this._codeGenerator = codeGenerator;
        this._wallet = new Wallet(this._config.validator.validator_key);
        this._validatorIndex = -1;

        const host = this._config.node.external !== "" ? this._config.node.external : ip.address();
        this.nodeInfo = {
            nodeId: this._wallet.address.toLowerCase(),
            endpoint: `${this._config.node.protocol}://${host}:${this._config.node.port}`,
            version: "v1.0.0",
        };
        this._startTimeStamp = ContractUtils.getTimeStamp();
    }

    private async getContract(): Promise<LinkCollection> {
        if (this._contract === undefined) {
            const factory = await hre.ethers.getContractFactory("LinkCollection");
            this._contract = factory.attach(this._config.contracts.linkCollectionAddress) as LinkCollection;
        }
        return this._contract;
    }

    private getSigner(): Signer {
        return new NonceManager(new GasPriceManager(hre.ethers.provider.getSigner(this._wallet.address)));
    }

    private makeResponseData(code: number, data: any, error?: any): any {
        return {
            code,
            data,
            error,
        };
    }

    public async makePeers() {
        const res = await (await this.getContract()).getValidators();

        // 신규 검증자 맵에 추가
        for (const item of res) {
            this._validators.set(item.validator.toLowerCase(), item.endpoint);
        }

        // 없어진 검증자를 맵에서 제거
        for (const key of this._validators.keys()) {
            if (res.find((m) => m.validator.toLowerCase() === key) === undefined) {
                this._validators.delete(key);
            }
        }

        // 새로 추가된 검증자 맵에 추가
        for (const item of res) {
            const nodeId = item.validator.toLowerCase();
            const index = item.index.toNumber();
            const endpoint = item.endpoint;
            if (this._wallet.address.toLowerCase() === nodeId) {
                this._validatorIndex = index;
            } else {
                const oldPeer = this._peers.items.find((m) => m.nodeId === nodeId);
                if (oldPeer !== undefined) {
                    oldPeer.endpoint = endpoint;
                    oldPeer.index = index;
                } else {
                    this._peers.items.push(new Peer(nodeId, index, endpoint, ""));
                }
            }
        }

        // 없어진 Peer 를 찾아서 맵에서 제거한다
        let done = false;
        while (!done) {
            done = true;
            for (let idx = 0; idx < this._peers.items.length; idx++) {
                if (res.find((m) => m.validator.toLowerCase() === this._peers.items[idx].nodeId) === undefined) {
                    this._peers.items.splice(idx, 1);
                    done = false;
                    break;
                }
            }
        }
    }

    public registerRoutes() {
        this._validator.app.get("/info", [], this.getInfo.bind(this));
        this._validator.app.get("/peers", [], this.getPeers.bind(this));
        this._validator.app.post(
            "/request",
            [
                body("email").exists().trim().isEmail(),
                body("address").exists().trim().isEthereumAddress(),
                body("signature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
            ],
            this.postRequest.bind(this)
        );
        this._validator.app.post(
            "/broadcast",
            [
                body("request").exists(),
                body("request.email").exists().trim().isEmail(),
                body("request.address").exists().trim().isEthereumAddress(),
                body("request.nonce")
                    .exists()
                    .trim()
                    .matches(/^[0-9]+$/),
                body("request.signature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
                body("requestId")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("receiver").exists().trim().isEthereumAddress(),
                body("signature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
            ],
            this.postBroadcast.bind(this)
        );
        this._validator.app.post(
            "/submit",
            [
                body("requestId")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("code")
                    .exists()
                    .trim()
                    .matches(/^[0-9]+$/),
            ],
            this.postSubmit.bind(this)
        );
        this._validator.app.post(
            "/broadcastSubmit",
            [
                body("requestId")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("code")
                    .exists()
                    .trim()
                    .matches(/^[0-9]+$/),
                body("receiver").exists().trim().isEthereumAddress(),
                body("signature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
            ],
            this.postBroadcastSubmit.bind(this)
        );
    }

    private async getInfo(req: express.Request, res: express.Response) {
        logger.http(`GET /info`);

        return res.json(this.makeResponseData(200, this.nodeInfo, undefined));
    }

    private async getPeers(req: express.Request, res: express.Response) {
        logger.http(`GET /peers`);

        const data = this._peers.items.map((m) => {
            return { nodeId: m.nodeId, endpoint: m.endpoint, version: m.version, status: m.status };
        });

        return res.json(this.makeResponseData(200, data, undefined));
    }

    private async postRequest(req: express.Request, res: express.Response) {
        logger.http(`POST /request`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(
                this.makeResponseData(400, undefined, {
                    message: "Failed to check the validity of parameters.",
                    validation: errors.array(),
                })
            );
        }

        try {
            const email: string = String(req.body.email).trim(); // 이메일 해시
            const address: string = String(req.body.address).trim(); // 주소
            const signature: string = String(req.body.signature).trim(); // 서명
            const nonce = await (await this.getContract()).nonceOf(address);
            const emailHash = ContractUtils.sha256String(email);
            if (!ContractUtils.verifyRequestData(address, email, nonce, signature)) {
                return res.json(
                    this.makeResponseData(401, undefined, {
                        message: "The signature value entered is not valid.",
                    })
                );
            }

            const emailToAddress: string = await (await this.getContract()).toAddress(emailHash);
            if (emailToAddress !== ContractUtils.NullAddress) {
                return res.json(
                    this.makeResponseData(402, undefined, {
                        message: "This email is already registered.",
                    })
                );
            }

            const addressToEmail: string = await (await this.getContract()).toEmail(address);
            if (addressToEmail !== ContractUtils.NullBytes32) {
                return res.json(
                    this.makeResponseData(403, undefined, {
                        message: "This address is already registered.",
                    })
                );
            }
            const requestId = ContractUtils.getRequestId(emailHash, address, nonce);
            const tx: ITransaction = {
                request: {
                    email,
                    address,
                    nonce: nonce.toString(),
                    signature,
                },
                requestId,
                receiver: this._wallet.address,
                signature: "",
            };
            tx.signature = await ContractUtils.signTx(this.getSigner(), tx);
            this._validations.set(requestId, {
                tx,
                status: EmailValidationStatus.NONE,
                sendCode: "",
                receiveCode: "",
            });
            await this._peers.broadcast(tx);
            const sendCode = this._codeGenerator.getCode();
            await this._emailSender.send(this._validatorIndex, sendCode);
            const validation = this._validations.get(requestId);
            if (validation !== undefined) {
                validation.sendCode = sendCode;
                validation.status = EmailValidationStatus.SENT;
            }

            try {
                const contractTx = await (await this.getContract())
                    .connect(this.getSigner())
                    .addRequest(tx.requestId, emailHash, address, signature);

                await contractTx.wait();

                return res.json(
                    this.makeResponseData(200, {
                        requestId,
                        contractTxHash: contractTx.hash,
                    })
                );
            } catch (error: any) {
                const message = error.message !== undefined ? error.message : "Failed save request";
                return res.json(
                    this.makeResponseData(800, undefined, {
                        message,
                    })
                );
            }
        } catch (error: any) {
            const message = error.message !== undefined ? error.message : "Failed save request";
            return res.json(
                this.makeResponseData(500, undefined, {
                    message,
                })
            );
        }
    }

    private async postBroadcast(req: express.Request, res: express.Response) {
        logger.http(`POST /broadcast`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(
                this.makeResponseData(400, undefined, {
                    message: "Failed to check the validity of parameters.",
                    validation: errors.array(),
                })
            );
        }

        const email = String(req.body.request.email).trim();
        const address = String(req.body.request.address).trim();
        const nonce = String(req.body.request.nonce).trim();
        const signature = String(req.body.request.signature).trim();

        const tx: ITransaction = {
            request: {
                email,
                address,
                nonce,
                signature,
            },
            requestId: String(req.body.requestId).trim(),
            receiver: String(req.body.receiver).trim(),
            signature: String(req.body.signature).trim(),
        };

        if (!ContractUtils.verifyTx(tx.receiver, tx, tx.signature)) {
            return res.json(
                this.makeResponseData(401, undefined, {
                    message: "The signature value entered is not valid.",
                })
            );
        }

        if (this._validators.get(tx.receiver.toLowerCase()) === undefined) {
            return res.json(
                this.makeResponseData(402, undefined, {
                    message: "Receiver is not validator.",
                })
            );
        }

        const sendCode = this._codeGenerator.getCode();
        await this._emailSender.send(this._validatorIndex, sendCode);
        this._validations.set(tx.requestId, {
            tx,
            status: EmailValidationStatus.SENT,
            sendCode,
            receiveCode: "",
        });
        return res.json(this.makeResponseData(200, {}));
    }

    private async postSubmit(req: express.Request, res: express.Response) {
        logger.http(`POST /submit`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(
                this.makeResponseData(400, undefined, {
                    message: "Failed to check the validity of parameters.",
                    validation: errors.array(),
                })
            );
        }

        const requestId = String(req.body.requestId).trim();
        const code = String(req.body.code).trim();
        const submitData: ISubmitData = {
            requestId,
            code,
            receiver: this._wallet.address,
            signature: "",
        };
        submitData.signature = await ContractUtils.signSubmit(this.getSigner(), submitData);

        const validation = this._validations.get(requestId);
        if (validation !== undefined) {
            if (validation.status === EmailValidationStatus.SENT) {
                validation.receiveCode = code.substring(this._validatorIndex * 2, this._validatorIndex * 2 + 2);
                if (validation.sendCode === validation.receiveCode) {
                    await this.voteAgreement(validation.tx.requestId, Ballot.AGREEMENT);
                    validation.status = EmailValidationStatus.CONFIRMED;
                    await this._peers.broadcastSubmit(submitData);
                    return res.json(this.makeResponseData(200, "OK"));
                } else {
                    await this._peers.broadcastSubmit(submitData);
                    return res.json(
                        this.makeResponseData(401, null, { message: "The authentication code is different." })
                    );
                }
            } else {
                await this._peers.broadcastSubmit(submitData);
            }
        } else {
            await this._peers.broadcastSubmit(submitData);
            return res.json(this.makeResponseData(400, null, { message: "No such request found." }));
        }
    }

    private async postBroadcastSubmit(req: express.Request, res: express.Response) {
        logger.http(`POST /broadcastSubmit`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(
                this.makeResponseData(400, undefined, {
                    message: "Failed to check the validity of parameters.",
                    validation: errors.array(),
                })
            );
        }

        const requestId = String(req.body.requestId).trim();
        const code = String(req.body.code).trim();
        const submitData: ISubmitData = {
            requestId,
            code,
            receiver: String(req.body.receiver).trim(),
            signature: String(req.body.signature).trim(),
        };

        if (!ContractUtils.verifySubmit(submitData.receiver, submitData, submitData.signature)) {
            return res.json(
                this.makeResponseData(401, undefined, {
                    message: "The signature value entered is not valid.",
                })
            );
        }

        if (this._validators.get(submitData.receiver.toLowerCase()) === undefined) {
            return res.json(
                this.makeResponseData(402, undefined, {
                    message: "Receiver is not validator.",
                })
            );
        }

        const validation = this._validations.get(requestId);
        if (validation !== undefined) {
            if (validation.status === EmailValidationStatus.SENT) {
                validation.receiveCode = code.substring(this._validatorIndex * 2, this._validatorIndex * 2 + 2);
                if (validation.sendCode === validation.receiveCode) {
                    await this.voteAgreement(validation.tx.requestId, Ballot.AGREEMENT);
                    validation.status = EmailValidationStatus.CONFIRMED;
                    return res.json(this.makeResponseData(200, "OK"));
                } else {
                    return res.json(
                        this.makeResponseData(401, null, { message: "The authentication code is different." })
                    );
                }
            }
        } else {
            return res.json(this.makeResponseData(400, null, { message: "No such request found." }));
        }
    }

    private async voteAgreement(requestId: string, ballot: Ballot) {
        await (await this.getContract()).connect(this.getSigner()).voteRequest(requestId, ballot);
    }

    public async onWork() {
        const currentTime = ContractUtils.getTimeStamp();
        if (currentTime - this._startTimeStamp < ValidatorNode.INIT_WAITING_SECONDS) {
            this._oldTimeStamp = currentTime;
            return;
        }

        this._periodNumber = Math.floor(currentTime / ValidatorNode.INTERVAL_SECONDS);

        if (!this._initialized) {
            await this.updateEndpointOnContract();
            await this.makePeers();
            await this._peers.check();
            this._initialized = true;
        }

        const old_period = Math.floor(this._oldTimeStamp / ValidatorNode.INTERVAL_SECONDS);
        if (old_period !== this._periodNumber) {
            await this._peers.check();
            await this.makePeers();
            /// TODO 진행이 되지 않는 요청건이 있는지 검사한다
        }
        this._oldTimeStamp = currentTime;
    }

    private async updateEndpointOnContract() {
        await (await this.getContract()).connect(this.getSigner()).updateEndpoint(this.nodeInfo.endpoint);
    }
}
