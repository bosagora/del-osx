/**
 * 이메일 인증에 사용될 랜덤숫자를 생성하는 델리게이트의 인터패이스입니다.
 */
export interface ICodeGenerator {
    getCode(): string;
}

/**
 * 이메일 인증에 사용될 랜덤숫자를 생성하는 클래스입니다.
 */
export class CodeGenerator implements ICodeGenerator {
    public getCode(): string {
        return Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0");
    }
}
