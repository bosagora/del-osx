/**
 *  Includes various useful functions for the solidity
 *
 *  Copyright:
 *      Copyright (c) 2022 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { defaultAbiCoder } from "@ethersproject/abi";

import { BigNumberish } from "@ethersproject/bignumber";
import { arrayify } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { randomBytes } from "@ethersproject/random";
import { verifyMessage } from "@ethersproject/wallet";

import { Signer } from "ethers";

export class ContractUtils {
    /**
     * Convert hexadecimal strings into Buffer.
     * @param hex The hexadecimal string
     */
    public static StringToBuffer(hex: string): Buffer {
        const start = hex.substring(0, 2) === "0x" ? 2 : 0;
        return Buffer.from(hex.substring(start), "hex");
    }

    /**
     * Convert Buffer into hexadecimal strings.
     * @param data The data
     */
    public static BufferToString(data: Buffer): string {
        return "0x" + data.toString("hex");
    }

    public static getTimeStamp(): number {
        return Math.floor(new Date().getTime() / 1000);
    }

    public static getPhoneHash(phone: string): string {
        const encodedResult = defaultAbiCoder.encode(["string", "string"], ["BOSagora Phone Number", phone]);
        return keccak256(encodedResult);
    }

    public static getEmailHash(phone: string): string {
        const encodedResult = defaultAbiCoder.encode(["string", "string"], ["BOSagora Email", phone]);
        return keccak256(encodedResult);
    }

    public static getRequestId(hash: string, address: string, nonce: BigNumberish): string {
        const encodedResult = defaultAbiCoder.encode(
            ["bytes32", "address", "uint256", "bytes32"],
            [hash, address, nonce, randomBytes(32)]
        );
        return keccak256(encodedResult);
    }

    public static getRequestHash(hash: string, address: string, nonce: BigNumberish): Uint8Array {
        const encodedResult = defaultAbiCoder.encode(["bytes32", "address", "uint256"], [hash, address, nonce]);
        return arrayify(keccak256(encodedResult));
    }

    public static async signRequestHash(signer: Signer, hash: string, nonce: BigNumberish): Promise<string> {
        const message = ContractUtils.getRequestHash(hash, await signer.getAddress(), nonce);
        return await signer.signMessage(message);
    }

    public static verifyRequestHash(address: string, hash: string, nonce: BigNumberish, signature: string): boolean {
        const message = ContractUtils.getRequestHash(hash, address, nonce);
        let res: string;
        try {
            res = verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === address.toLowerCase();
    }

    public static getRequestPhoneHash(phone: string, address: string, nonce: BigNumberish): Uint8Array {
        const encodedResult = defaultAbiCoder.encode(
            ["bytes32", "address", "uint256"],
            [ContractUtils.getPhoneHash(phone), address, nonce]
        );
        return arrayify(keccak256(encodedResult));
    }

    public static async signRequestPhone(signer: Signer, phone: string, nonce: BigNumberish): Promise<string> {
        const message = ContractUtils.getRequestPhoneHash(phone, await signer.getAddress(), nonce);
        return await signer.signMessage(message);
    }

    public static verifyRequestPhone(address: string, phone: string, nonce: BigNumberish, signature: string): boolean {
        const message = ContractUtils.getRequestPhoneHash(phone, address, nonce);
        let res: string;
        try {
            res = verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === address.toLowerCase();
    }

    public static getRequestEmailHash(email: string, address: string, nonce: BigNumberish): Uint8Array {
        const encodedResult = defaultAbiCoder.encode(
            ["bytes32", "address", "uint256"],
            [ContractUtils.getEmailHash(email), address, nonce]
        );
        return arrayify(keccak256(encodedResult));
    }

    public static async signRequestEmail(signer: Signer, email: string, nonce: BigNumberish): Promise<string> {
        const message = ContractUtils.getRequestEmailHash(email, await signer.getAddress(), nonce);
        return await signer.signMessage(message);
    }

    public static verifyRequestEmail(address: string, email: string, nonce: BigNumberish, signature: string): boolean {
        const message = ContractUtils.getRequestEmailHash(email, address, nonce);
        let res: string;
        try {
            res = verifyMessage(message, signature);
        } catch (error) {
            return false;
        }
        return res.toLowerCase() === address.toLowerCase();
    }
}
