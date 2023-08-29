import { ISubmitData, ITransaction } from "../types";

import crypto from "crypto";
import { BigNumberish, Signer } from "ethers";
// tslint:disable-next-line:no-submodule-imports
import { arrayify } from "ethers/lib/utils";
import * as hre from "hardhat";

export class ContractUtils {
    public static NullAddress = "0x0000000000000000000000000000000000000000";
    public static NullBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

    public static sha256(data: Buffer): Buffer {
        return crypto.createHash("sha256").update(data).digest();
    }

    public static sha256String(data: string): string {
        return ContractUtils.BufferToString(crypto.createHash("sha256").update(Buffer.from(data.trim())).digest());
    }

    public static StringToBuffer(hex: string): Buffer {
        const start = hex.substring(0, 2) === "0x" ? 2 : 0;
        return Buffer.from(hex.substring(start), "hex");
    }

    public static BufferToString(data: Buffer): string {
        return "0x" + data.toString("hex");
    }

    public static getTimeStamp(): number {
        return Math.floor(new Date().getTime() / 1000);
    }

    public static getRequestId(emailHash: string, address: string, nonce: BigNumberish): string {
        const encodedResult = hre.ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "address", "uint256", "bytes32"],
            [emailHash, address, nonce, crypto.randomBytes(32)]
        );
        return hre.ethers.utils.keccak256(encodedResult);
    }

    public static getRequestHash(email: string, address: string, nonce: BigNumberish): Uint8Array {
        const encodedResult = hre.ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "address", "uint256"],
            [ContractUtils.sha256String(email), address, nonce]
        );
        return arrayify(hre.ethers.utils.keccak256(encodedResult));
    }

    public static async signRequestData(signer: Signer, email: string, nonce: BigNumberish): Promise<string> {
        const message = ContractUtils.getRequestHash(email, await signer.getAddress(), nonce);
        return signer.signMessage(message);
    }

    public static verifyRequestData(address: string, email: string, nonce: BigNumberish, signature: string): boolean {
        const message = ContractUtils.getRequestHash(email, address, nonce);
        let res: string;
        try {
            res = hre.ethers.utils.verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === address.toLowerCase();
    }

    public static getTxHash(tx: ITransaction): Uint8Array {
        const encodedResult = hre.ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "address", "uint256", "bytes32", "address"],
            [
                ContractUtils.sha256String(tx.request.email),
                tx.request.address,
                tx.request.nonce,
                tx.requestId,
                tx.receiver,
            ]
        );
        return arrayify(hre.ethers.utils.keccak256(encodedResult));
    }

    public static async signTx(signer: Signer, tx: ITransaction): Promise<string> {
        const message = ContractUtils.getTxHash(tx);
        return signer.signMessage(message);
    }

    public static verifyTx(address: string, tx: ITransaction, signature: string): boolean {
        const message = ContractUtils.getTxHash(tx);
        let res: string;
        try {
            res = hre.ethers.utils.verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === address.toLowerCase();
    }

    public static getSubmitHash(data: ISubmitData): Uint8Array {
        const encodedResult = hre.ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "string", "address"],
            [data.requestId, data.code, data.receiver]
        );
        return arrayify(hre.ethers.utils.keccak256(encodedResult));
    }

    public static async signSubmit(signer: Signer, data: ISubmitData): Promise<string> {
        const message = ContractUtils.getSubmitHash(data);
        return signer.signMessage(message);
    }

    public static verifySubmit(address: string, data: ISubmitData, signature: string): boolean {
        const message = ContractUtils.getSubmitHash(data);
        let res: string;
        try {
            res = hre.ethers.utils.verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === address.toLowerCase();
    }
}
