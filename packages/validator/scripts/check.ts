import { ContractUtils } from "../src/utils/ContractUtils";
import { PhoneLinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import * as hre from "hardhat";

async function main() {
    const userPhone = process.env.SMS_RECEIVER || "";
    const userWallet = new hre.ethers.Wallet("0x21ebf5db0844666c762d8e3898d68b5a9714e9eecad89146ae53861b0ba389b3");
    const userPhoneHash = ContractUtils.getPhoneHash(userPhone);
    const factory = await hre.ethers.getContractFactory("PhoneLinkCollection");
    const contract = (await factory.attach(process.env.LINK_COLLECTION_ADDRESS || "")) as PhoneLinkCollection;
    const resAddress = await contract.toAddress(userPhoneHash);

    if (resAddress === userWallet.address) {
        console.log("Success");
    } else {
        console.log("User address :", userWallet.address);
        console.log("Register address :", resAddress);
    }

    const resPhone = await contract.toPhone(userWallet.address);
    if (resPhone === userPhoneHash) {
        console.log("Success");
    } else {
        console.log("User phone :", userPhoneHash);
        console.log("Register phone :", resPhone);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
