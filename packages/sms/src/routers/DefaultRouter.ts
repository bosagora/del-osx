import { Config } from "../common/Config";
import { logger } from "../common/Logger";
import { WebService } from "../service/WebService";

import { body, validationResult } from "express-validator";

import express from "express";
import { Utils } from "../utils/Utils";

// tslint:disable-next-line:no-var-requires
const aligoapi = require("aligoapi");

interface ISMSResponse {
    code: string;
    message: string;
}

export class DefaultRouter {
    private _web_service: WebService;
    private readonly _config: Config;

    constructor(service: WebService, config: Config) {
        this._web_service = service;
        this._config = config;
    }

    private get app(): express.Application {
        return this._web_service.app;
    }

    private makeResponseData(code: number, data: any, error?: any): any {
        return {
            code,
            data,
            error,
        };
    }

    public registerRoutes() {
        this.app.get("/", [], this.getHealthStatus.bind(this));
        this.app.post(
            "/send",
            [body("msg").exists(), body("sender").exists(), body("receiver").exists()],
            this.send.bind(this)
        );
    }

    private async getHealthStatus(req: express.Request, res: express.Response) {
        return res.status(200).json("OK");
    }

    private async send(req: express.Request, res: express.Response) {
        logger.http(`POST /send ${req.ip}:${JSON.stringify(req.body)}`);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json(
                this.makeResponseData(501, undefined, {
                    message: "Failed to check the validity of parameters.",
                    validation: errors.array(),
                })
            );
        }
        try {
            const accessKey = req.get("Authorization");
            if (accessKey !== this._config.sms.accessKey) {
                return res.json(
                    this.makeResponseData(400, undefined, {
                        message: "The access key entered is not valid.",
                    })
                );
            }

            const msg: string = String(req.body.msg);
            const sender: string = String(req.body.sender);
            const receiver: string = Utils.checkPhoneNumber(String(req.body.receiver));
            const smsResponse = await this.sendSMS(msg, sender, receiver);
            logger.info(`POST /send : ${smsResponse.message}`);
            return res.status(200).json(this.makeResponseData(200, smsResponse, null));
        } catch (error: any) {
            logger.error(`POST /send : ${error.message}`);
            return res.status(200).json(
                this.makeResponseData(500, undefined, {
                    message: error.message,
                })
            );
        } finally {
            ///
        }
    }

    private sendSMS(msg: string, sender: string, receiver: string): Promise<ISMSResponse> {
        const AuthData = {
            key: this._config.sms.apikey,
            user_id: this._config.sms.userid,
        };
        const req = {
            headers: { "content-type": "application/json" },
            body: {
                msg,
                sender,
                receiver,
                testmode_yn: process.env.SMS_TESTMODE || "",
            },
        };
        return new Promise<ISMSResponse>((resolve, reject) => {
            aligoapi
                .send(req, AuthData)
                .then((r: any) => {
                    resolve({ code: r.result_code, message: r.message });
                })
                .catch((e: any) => {
                    reject(e);
                });
        });
    }
}
