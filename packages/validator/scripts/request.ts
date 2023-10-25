import { ContractUtils } from "../src/utils/ContractUtils";
import { PhoneLinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import * as hre from "hardhat";

import axios, { AxiosInstance } from "axios";
import URI from "urijs";

async function main() {
    const userPhone = process.env.SMS_RECEIVER || "";
    const userWallet = new hre.ethers.Wallet("0x21ebf5db0844666c762d8e3898d68b5a9714e9eecad89146ae53861b0ba389b3");
    const validatorNodeURL = "http://localhost:7080";

    const factory = await hre.ethers.getContractFactory("PhoneLinkCollection");
    const contract = (await factory.attach(process.env.PHONE_LINK_COLLECTION_ADDRESS || "")) as PhoneLinkCollection;
    const nonce = await contract.nonceOf(userWallet.address);
    const signature = await ContractUtils.signRequestPhone(userWallet, userPhone, nonce);

    const url = URI(validatorNodeURL).filename("request").toString();
    const client = axios.create();
    const response = await client.post(url, {
        phone: userPhone,
        address: userWallet.address,
        signature,
    });
    console.log(response.data.code);
    console.log(response.data);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
