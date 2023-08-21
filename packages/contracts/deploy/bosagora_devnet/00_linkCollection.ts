import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
// tslint:disable-next-line:no-submodule-imports
import { DeployFunction } from "hardhat-deploy/types";
// tslint:disable-next-line:no-submodule-imports
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ContractUtils } from "../../test/ContractUtils";
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
    const validators = [validator1, validator2, validator3];

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
        const nonce = await linkCollectionContract.nonce(owner);
        const signature = await ContractUtils.sign(await ethers.getSigner(owner), foundationAccount, nonce);

        const tx1 = await linkCollectionContract
            .connect(await ethers.getSigner(validators[0]))
            .addRequest(foundationAccount, owner, signature);
        console.log(`Add email-address of foundation (tx: ${tx1.hash})...`);
        const receipt = await tx1.wait();
        const events = receipt.events?.filter((x) => x.event === "AddedRequestItem");
        const reqId =
            events !== undefined && events.length > 0 && events[0].args !== undefined
                ? BigNumber.from(events[0].args[0])
                : BigNumber.from(0);
        console.log(`Req ID:  ${reqId.toString()}`);

        const tx2 = await linkCollectionContract.connect(await ethers.getSigner(validator1)).voteRequest(reqId, 1);
        console.log(`Vote of validator1 (tx: ${tx2.hash})...`);
        await tx2.wait();

        const tx3 = await linkCollectionContract.connect(await ethers.getSigner(validator2)).voteRequest(reqId, 1);
        console.log(`Vote of validator2 (tx: ${tx3.hash})...`);
        await tx3.wait();

        console.log(`Foundation address : ${await linkCollectionContract.toAddress(foundationAccount)}`);

        const users = JSON.parse(fs.readFileSync("./deploy/data/users.json", "utf8"));
        for (const user of users) {
            if (!user.register) continue;
            const userAccount = ContractUtils.sha256String(user.email);
            const userNonce = await linkCollectionContract.nonce(user.address);
            const userSignature = await ContractUtils.sign(new Wallet(user.privateKey), userAccount, userNonce);
            const tx5 = await linkCollectionContract
                .connect(await ethers.getSigner(validators[0]))
                .addRequest(userAccount, user.address, userSignature);
            console.log(`Add email-address of user (tx: ${tx5.hash})...`);
            const receipt2 = await tx5.wait();
            const events2 = receipt2.events?.filter((x) => x.event === "AddedRequestItem");
            const reqId2 =
                events2 !== undefined && events2.length > 0 && events2[0].args !== undefined
                    ? BigNumber.from(events2[0].args[0])
                    : BigNumber.from(0);
            console.log(`Req ID:  ${reqId2.toString()}`);

            const tx6 = await linkCollectionContract.connect(await ethers.getSigner(validator1)).voteRequest(reqId2, 1);
            console.log(`Vote of validator1 (tx: ${tx6.hash})...`);
            await tx6.wait();

            const tx7 = await linkCollectionContract.connect(await ethers.getSigner(validator2)).voteRequest(reqId2, 1);
            console.log(`Vote of validator2 (tx: ${tx7.hash})...`);
            await tx7.wait();
        }
    }
};

export default func;
func.tags = ["LinkCollection"];
