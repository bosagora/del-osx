import { ContractUtils } from "../src/utils/ContractUtils";
import { PhoneLinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import * as hre from "hardhat";

async function main() {
    const requestId = "0x7dc901902ade544638b443ad904c3fabf7fab3d8b26d9424bc45d822d1689083";
    const userPhone = process.env.SMS_RECEIVER || "";
    const userWallet = new hre.ethers.Wallet("0x21ebf5db0844666c762d8e3898d68b5a9714e9eecad89146ae53861b0ba389b3");
    const userPhoneHash = ContractUtils.getPhoneHash(userPhone);
    const factory = await hre.ethers.getContractFactory("PhoneLinkCollection");
    const contract = (await factory.attach(process.env.LINK_COLLECTION_ADDRESS || "")) as PhoneLinkCollection;
    const item = await contract.getRequestItem(requestId);
    console.log(item.agreement);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
