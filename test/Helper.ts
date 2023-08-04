import "@nomiclabs/hardhat-ethers";

import crypto from "crypto";
import { BigNumberish, Wallet } from "ethers";
// @ts-ignore
import * as hre from "hardhat";

export function sign(signer: Wallet, hash: string, nonce: BigNumberish): Promise<string> {
    const encodedResult = hre.ethers.utils.defaultAbiCoder.encode(
        ["bytes32", "address", "uint256"],
        [hash, signer.address, nonce]
    );
    const sig = signer._signingKey().signDigest(hre.ethers.utils.keccak256(encodedResult));
    return Promise.resolve(hre.ethers.utils.joinSignature(sig));
}
