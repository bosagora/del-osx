import { ContractUtils } from "../src/utils/ContractUtils";
import { LinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import * as hre from "hardhat";

async function main() {
    const userEmail = "worldia@naver.com";
    const userWallet = new hre.ethers.Wallet("0x21ebf5db0844666c762d8e3898d68b5a9714e9eecad89146ae53861b0ba389b3");
    const userEmailHash = ContractUtils.sha256String(userEmail);
    const factory = await hre.ethers.getContractFactory("LinkCollection");
    const contract = (await factory.attach(process.env.LINK_COLLECTION_ADDRESS || "")) as LinkCollection;
    const resAddress = await contract.toAddress(userEmailHash);

    if (resAddress === userWallet.address) {
        console.log("Success");
    } else {
        console.log("User address :", userWallet.address);
        console.log("Register address :", resAddress);
    }

    const resEmail = await contract.toEmail(userWallet.address);
    if (resEmail === userEmailHash) {
        console.log("Success");
    } else {
        console.log("User email :", userEmailHash);
        console.log("Register email :", resEmail);
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
