import { LinkCollection } from "../../typechain-types";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { GasPriceManager } from "../contract/GasPriceManager";
import { ContractUtils } from "../utils/ContractUtils";
import { Peers } from "./Peers";
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
    private readonly _peers: Peers;
    private _contract: LinkCollection | undefined;

    private readonly nodeInfo: ValidatorNodeInfo;

    private _initialized: boolean = false;

    private _startTimeStamp: number = 0;
    private _oldTimeStamp: number = 0;
    private _periodNumber: number = 0;

    constructor(validator: ValidatorNode, config: Config, peers: Peers) {
        this._validator = validator;
        this._config = config;
        this._peers = peers;
        this._wallet = new Wallet(this._config.validator.validator_key);

        const host = this._config.node.external !== "" ? this._config.node.external : ip.address();
        this.nodeInfo = {
            nodeId: this._wallet.address,
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
                body("request.nonce").exists().trim(),
                body("request.signature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
                body("status").exists().trim(),
                body("requestId").exists().trim(),
                body("address").exists().trim().isEthereumAddress(),
                body("signature")
                    .exists()
                    .trim()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
            ],
            this.postBroadcast.bind(this)
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
            if (!ContractUtils.verify(address, email, nonce, signature)) {
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

            try {
                const contractTx = await (await this.getContract())
                    .connect(this.getSigner())
                    .addRequest(emailHash, address, signature);

                /// TODO 컨트랙트에 저장한 후 ReqestId를 트랜잭션에 포함하여 전송 이때 status 는 1입니다.
                /// TODO 검증자들의 투표

                return res.json(this.makeResponseData(200, { txHash: contractTx.hash }));
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
            status: Number(req.body.status),
            requestId: String(req.body.requestId),
            receiver: String(req.body.receiver).trim(),
            signature: String(req.body.signature).trim(),
        };

        const txHash = ContractUtils.getTxHash(tx);
        if (ContractUtils.verifyTx(tx.receiver, txHash, tx.signature)) {
            return res.json(
                this.makeResponseData(401, undefined, {
                    message: "The signature value entered is not valid.",
                })
            );
        }

        /// TODO tx.receiver 가 검증자 인지 체크

        if (tx.status === 0) {
            /// TODO 이메일인증 위한 코드 발송
        } else if (tx.status === 1) {
            /// 해당 txHash 에 해당하는 tx.requestId를 새로운 값으로 변경한다.
        }
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
            await this._peers.check();
            this._initialized = true;
        }

        const old_period = Math.floor(this._oldTimeStamp / ValidatorNode.INTERVAL_SECONDS);
        if (old_period !== this._periodNumber) {
            await this._peers.check();
            // 요청을 처리한다.
            // 진행이 되지 않는 요청을 해결한다.
            // 검증이 완료된 요청에 대해서 투표를 시작한다. (이것은 별도로 진행해도 됩니다.)
        }
        this._oldTimeStamp = currentTime;
    }

    private async updateEndpointOnContract() {
        await (await this.getContract()).connect(this.getSigner()).updateEndpoint(this.nodeInfo.endpoint);
    }
}
