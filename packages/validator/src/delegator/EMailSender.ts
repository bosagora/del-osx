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
        return true;
    }
}
