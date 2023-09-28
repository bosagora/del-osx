import { ContractUtils } from "../src/utils/ContractUtils";
import { EmailLinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import * as hre from "hardhat";

async function main() {
    const requestId = "0x7dc901902ade544638b443ad904c3fabf7fab3d8b26d9424bc45d822d1689083";
    const userEmail = "worldia@naver.com";
    const userWallet = new hre.ethers.Wallet("0x21ebf5db0844666c762d8e3898d68b5a9714e9eecad89146ae53861b0ba389b3");
    const userEmailHash = ContractUtils.sha256String(userEmail);
    const factory = await hre.ethers.getContractFactory("EmailLinkCollection");
    const contract = (await factory.attach(process.env.LINK_COLLECTION_ADDRESS || "")) as EmailLinkCollection;
    const item = await contract.getRequestItem(requestId);
    console.log(item.agreement);
    console.log(item.opposition);
    console.log(item.abstaining);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
