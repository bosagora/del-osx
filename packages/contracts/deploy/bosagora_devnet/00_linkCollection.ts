import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
// tslint:disable-next-line:no-submodule-imports
import { DeployFunction } from "hardhat-deploy/types";
// tslint:disable-next-line:no-submodule-imports
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ContractUtils } from "../../src/utils/ContractUtils";
import { LinkCollection } from "../../typechain-types";
import { getContractAddress } from "../helpers";

import { BigNumber, Wallet } from "ethers";
import * as fs from "fs";

// tslint:disable-next-line:only-arrow-functions
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    console.log(`\nDeploying LinkCollection.`);

    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer, owner, validator1, validator2, validator3 } = await getNamedAccounts();
    const validators = [validator1];

    const deployResult = await deploy("LinkCollection", {
        from: deployer,
        args: [validators],
        log: true,
    });

    if (deployResult.newlyDeployed) {
        const linkCollectionContractAddress = await getContractAddress("LinkCollection", hre);
        const linkCollectionContract = (await ethers.getContractAt(
            "LinkCollection",
            linkCollectionContractAddress
        )) as LinkCollection;

        const foundationAccount = ContractUtils.sha256String(process.env.FOUNDATION_EMAIL || "");
        const nonce = await linkCollectionContract.nonceOf(owner);
        const signature = await ContractUtils.sign(await ethers.getSigner(owner), foundationAccount, nonce);

        const reqId1 = ContractUtils.getRequestId(foundationAccount, owner, nonce);
        const tx1 = await linkCollectionContract
            .connect(await ethers.getSigner(validators[0]))
            .addRequest(reqId1, foundationAccount, owner, signature);
        console.log(`Add email-address of foundation (tx: ${tx1.hash})...`);
        await tx1.wait();
        console.log(`Req ID:  ${reqId1.toString()}`);

        const tx2 = await linkCollectionContract.connect(await ethers.getSigner(validator1)).voteRequest(reqId1, 1);
        console.log(`Vote of validator1 (tx: ${tx2.hash})...`);
        await tx2.wait();

        if ((await linkCollectionContract.toAddress(foundationAccount)) === owner) {
            console.log(`Success ${owner}`);
        } else {
            console.log(`Fail ${owner}`);
        }
        console.log(`Foundation address : ${await linkCollectionContract.toAddress(foundationAccount)}`);

        const users = JSON.parse(fs.readFileSync("./deploy/data/users.json", "utf8"));
        for (const user of users) {
            if (!user.register) continue;
            const userAccount = ContractUtils.sha256String(user.email);
            const userNonce = await linkCollectionContract.nonceOf(user.address);
            const userSignature = await ContractUtils.sign(new Wallet(user.privateKey), userAccount, userNonce);
            const reqId2 = ContractUtils.getRequestId(userAccount, user.address, userNonce);
            const tx5 = await linkCollectionContract
                .connect(await ethers.getSigner(validators[0]))
                .addRequest(reqId2, userAccount, user.address, userSignature);
            console.log(`Add email-address of user (tx: ${tx5.hash})...`);
            await tx5.wait();
            console.log(`Req ID:  ${reqId2.toString()}`);

            const tx6 = await linkCollectionContract.connect(await ethers.getSigner(validator1)).voteRequest(reqId2, 1);
            console.log(`Vote of validator1 (tx: ${tx6.hash})...`);
            await tx6.wait();

            if ((await linkCollectionContract.toAddress(userAccount)) === user.address) {
                console.log(`Success ${user.address}`);
            } else {
                console.log(`Fail ${user.address}`);
            }
        }
    }
};

export default func;
func.tags = ["LinkCollection"];
