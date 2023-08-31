import { logger } from "../common/Logger";

/**
 * 이메일 발송하는 델리게이트의 인터패이스입니다.
 */
export interface IEmailSender {
    send(validatorIndex: number, code: string): Promise<boolean>;
}

/**
 * 이메일 발송하는 클래스입니다.
 */
export class EMailSender implements IEmailSender {
    public async send(validatorIndex: number, code: string): Promise<boolean> {
        logger.info({
            validatorIndex: "n",
            method: "EMailSender.send()",
            message: `Email has been sent.`,
        });
        return true;
    }
}

/**
 * 이메일 발송하는 클래스입니다.
 */
export class EMailNoSender implements IEmailSender {
    public async send(validatorIndex: number, code: string): Promise<boolean> {
        logger.info({
            validatorIndex: "n",
            method: "EMailNoSender.send()",
            message: `Email has not been sent.`,
        });
        return true;
    }
}
