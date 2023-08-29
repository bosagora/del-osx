export interface ICodeGenerator {
    getCode(): string;
}

export class CodeGenerator implements ICodeGenerator {
    public getCode(): string {
        return Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0");
    }
}
