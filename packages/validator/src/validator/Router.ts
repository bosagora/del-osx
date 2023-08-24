import { LinkCollection } from "../../typechain-types";
import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { GasPriceManager } from "../contract/GasPriceManager";
import { ContractUtils } from "../utils/ContractUtils";
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
    private _contract: LinkCollection | undefined;

    private readonly nodeInfo: ValidatorNodeInfo;

    constructor(validator: ValidatorNode, config: Config) {
        this._validator = validator;
        this._config = config;
        this._wallet = new Wallet(this._config.validator.validator_key);

        this.nodeInfo = {
            nodeId: this._wallet.address,
            ip: this._config.server.external !== "" ? this._config.server.external : ip.address(),
            port: this._config.server.port,
            version: "v1.0.0",
        };
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
        this._validator.app.post(
            "/request",
            [
                body("email")
                    .exists()
                    .matches(/^(0x)[0-9a-f]{64}$/i),
                body("address").exists().isEthereumAddress(),
                body("signature")
                    .exists()
                    .matches(/^(0x)[0-9a-f]{130}$/i),
            ],
            this.postRequest.bind(this)
        );
    }

    private async getInfo(req: express.Request, res: express.Response) {
        logger.http(`GET /info`);

        return res.json(this.makeResponseData(200, this.nodeInfo, undefined));
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
            const email: string = String(req.body.email); // 이메일 해시
            const address: string = String(req.body.address); // 주소
            const signature: string = String(req.body.signature); // 서명
            const nonce = await (await this.getContract()).nonceOf(address);

            if (!ContractUtils.verify(address, email, nonce, signature)) {
                return res.json(
                    this.makeResponseData(401, undefined, {
                        message: "The signature value entered is not valid.",
                    })
                );
            }

            const emailToAddress: string = await (await this.getContract()).toAddress(email);
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
                const tx = await (await this.getContract())
                    .connect(this.getSigner())
                    .addRequest(email, address, signature);

                /// TODO 이메일인증
                /// TODO 검증자들의 투표

                return res.json(this.makeResponseData(200, { txHash: tx.hash }));
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
}
