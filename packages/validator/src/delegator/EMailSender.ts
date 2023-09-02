import { Config } from "../common/Config";

import * as nodemailer from "nodemailer";
import { logger } from "../common/Logger";
import { PeerStatus } from "../validator/Peers";

/**
 * 이메일 발송하는 델리게이트의 인터패이스입니다.
 */
export interface IEmailSender {
    send(validatorIndex: number, totalValidatorCount: number, code: string, email: string): Promise<boolean>;
}

/**
 * 이메일 발송하는 클래스입니다.
 */
export class EMailSender implements IEmailSender {
    private readonly _config: Config;

    constructor(config: Config) {
        this._config = config;
    }
    private ordinalSuffixOf(i: number) {
        const j = i % 10;
        const k = i % 100;
        if (j === 1 && k !== 11) {
            return i + "st";
        }
        if (j === 2 && k !== 12) {
            return i + "nd";
        }
        if (j === 3 && k !== 13) {
            return i + "rd";
        }
        return i + "th";
    }

    public async send(validatorIndex: number, totalValidator: number, code: string, email: string): Promise<boolean> {
        if (this._config.smtp.host === "") {
            logger.error({
                validatorIndex,
                method: "EMailSender.send()",
                message: `The host for smtp is not set up.`,
            });
            return false;
        }
        if (this._config.smtp.account === "") {
            logger.error({
                validatorIndex,
                method: "EMailSender.send()",
                message: `The account for smtp is not set up.`,
            });
            return false;
        }
        if (this._config.smtp.password === "") {
            logger.error({
                validatorIndex,
                method: "EMailSender.send()",
                message: `The password for smtp is not set up.`,
            });
            return false;
        }

        try {
            const contents: string[] = [];
            const validatorNumber: string = `${this.ordinalSuffixOf(validatorIndex + 1)}`;
            const column1: string = `${this.ordinalSuffixOf(validatorIndex * 2 + 1)}`;
            const column2: string = `${this.ordinalSuffixOf(validatorIndex * 2 + 2)}`;
            contents.push(`Dear User,`);
            contents.push(
                `You will receive different email verification codes from a total of ${totalValidator} validators.`
            );
            contents.push(`It is valid for 5 minutes.`);
            contents.push(`This is the ${validatorNumber} email.`);
            contents.push(`Your email verification code from the ${validatorNumber} validator is ${code}.`);
            contents.push(`Enter the code you received in the ${column1} and ${column2} columns.`);
            contents.push(
                `Please use the email verification code from the other validators for the codes in the other columns`
            );

            const info = await this.createTransport().sendMail({
                from: `${validatorNumber} validator<${this._config.smtp.account}>`,
                to: email,
                subject: "Email authentication",
                text: contents.map((m) => m + "\n").join("\n"),
                html: "",
            });

            logger.info({
                validatorIndex,
                method: "EMailSender.send()",
                message: `Email has been sent. ${info.messageId}`,
            });
            return true;
        } catch (e: any) {
            const message = e.message !== undefined ? e.message : "An error has occurred.";
            logger.warn({
                validatorIndex,
                method: "EMailSender.send()",
                message,
            });
            return false;
        }
    }

    public createTransport() {
        return nodemailer.createTransport({
            host: this._config.smtp.host,
            port: this._config.smtp.port,
            secure: true,
            auth: {
                user: this._config.smtp.account,
                pass: this._config.smtp.password,
            },
        });
    }
}

/**
 * 이메일 발송하는 클래스입니다.
 */
export class EMailNoSender implements IEmailSender {
    public async send(validatorIndex: number, totalValidator: number, code: string, email: string): Promise<boolean> {
        logger.info({
            validatorIndex: "n",
            method: "EMailNoSender.send()",
            message: `Email has not been sent.`,
        });
        return true;
    }
}
