export interface IEmailSender {
    send(validatorIndex: number, code: string): Promise<boolean>;
}

export class EMailSender implements IEmailSender {
    public async send(validatorIndex: number, code: string): Promise<boolean> {
        return true;
    }
}
