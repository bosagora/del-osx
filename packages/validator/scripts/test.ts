import { Config } from "../src/common/Config";
import { AuthenticationMode, ValidatorNodeInfo } from "../src/types";
import { ContractUtils } from "../src/utils/ContractUtils";
import { delay, TestClient, TestValidatorNode } from "../test/helper/Utility";
import { EmailLinkCollection } from "../typechain-types";

import { GasPriceManager } from "../src/contract/GasPriceManager";

import { NonceManager } from "@ethersproject/experimental";
import "@nomiclabs/hardhat-ethers";

import { Wallet } from "ethers";
import { ethers } from "hardhat";

import URI from "urijs";

import assert from "assert";
import { expect } from "chai";
import ip from "ip";
import path from "path";

async function main() {
    const provider = ethers.provider;
    const deployerWallet = new Wallet(process.env.DEPLOYER || "");
    const validator1Wallet = new Wallet(process.env.VALIDATOR1 || "");
    const validator2Wallet = new Wallet(process.env.VALIDATOR2 || "");
    const validator3Wallet = new Wallet(process.env.VALIDATOR3 || "");

    console.log("deployerWallet", deployerWallet.address);
    const deployer = provider.getSigner(deployerWallet.address);
    const validator1 = new NonceManager(new GasPriceManager(provider.getSigner(validator1Wallet.address)));
    const validator2 = new NonceManager(new GasPriceManager(provider.getSigner(validator2Wallet.address)));
    const validator3 = new NonceManager(new GasPriceManager(provider.getSigner(validator3Wallet.address)));

    const validatorWallets = [validator1Wallet, validator2Wallet, validator3Wallet];
    const validators = [validator1, validator2, validator3];
    const users = [validator1Wallet, validator2Wallet, validator3Wallet];
    const emails: string[] = ["a@example.com", "b@example.com", "c@example.com"];
    const emailHashes: string[] = emails.map((m) => ContractUtils.sha256String(m));

    const validatorNodes: TestValidatorNode[] = [];
    const validatorNodeURLs: string[] = [];
    const configs: Config[] = [];
    const maxValidatorCount = 3;
    const client = new TestClient();

    console.log("Deploy");
    const contractFactory = await ethers.getContractFactory("EmailLinkCollection");
    const linkCollectionContract = (await contractFactory
        .connect(deployer)
        .deploy(validatorWallets.map((m) => m.address))) as EmailLinkCollection;
    await linkCollectionContract.deployTransaction.wait();

    console.log("Create Config");
    for (let idx = 0; idx < maxValidatorCount; idx++) {
        const config = new Config();
        config.readFromFile(path.resolve(process.cwd(), "test", "helper", "config.yaml"));
        config.contracts.emailLinkCollectionAddress = linkCollectionContract.address;
        config.validator.validatorKey = validatorWallets[idx].privateKey;
        config.validator.authenticationMode = AuthenticationMode.NoEMailKnownCode;
        config.node.protocol = "http";
        config.node.host = "0.0.0.0";
        config.node.port = 7070 + idx;
        configs.push(config);

        await linkCollectionContract.connect(validators[idx]).updateEndpoint(`http://${ip.address()}:${7070 + idx}`);
    }

    console.log("Create Validator Nodes");
    for (let idx = 0; idx < maxValidatorCount; idx++) {
        validatorNodeURLs.push(`http://localhost:${configs[idx].node.port}`);
        validatorNodes.push(new TestValidatorNode(configs[idx]));
    }

    console.log("Start Validator Nodes");
    for (let idx = 0; idx < maxValidatorCount; idx++) {
        await validatorNodes[idx].start();
    }

    console.log("Wait");
    await delay(5000);

    console.log("Get Validator Node Info");
    for (let idx = 0; idx < maxValidatorCount; idx++) {
        const url1 = URI(validatorNodeURLs[idx]).filename("info").toString();
        const response1 = await client.get(url1);
        assert.deepStrictEqual(response1.data.code, 200);
        const nodeInfo: ValidatorNodeInfo = response1.data.data;
        assert.strictEqual(nodeInfo.nodeId, validatorWallets[idx].address.toLowerCase());
        assert.strictEqual(nodeInfo.endpoint, `http://${ip.address()}:${configs[idx].node.port}`);
    }

    console.log("Wait");
    await delay(5000);

    console.log("Check validator's endpoint on contract");
    for (let idx = 0; idx < maxValidatorCount; idx++) {
        const res3 = await linkCollectionContract.getValidator(idx);
        assert.deepStrictEqual(res3.index.toString(), `${idx}`);
        assert.deepStrictEqual(res3.endpoint, `http://${ip.address()}:${7070 + idx}`);
    }

    console.log("Wait");
    await delay(5000);

    console.log("Add link data");
    let requestId = "";
    const nonce = await linkCollectionContract.nonceOf(users[0].address);
    const signature = await ContractUtils.signRequestData(users[0], emails[0], nonce);

    const url4 = URI(validatorNodeURLs[0]).filename("request").toString();
    const response4 = await client.post(url4, {
        email: emails[0],
        address: users[0].address,
        signature,
    });
    assert.deepStrictEqual(response4.status, 200);
    assert.deepStrictEqual(response4.data.code, 200);
    assert(response4.data.data.requestId !== undefined);
    requestId = response4.data.data.requestId;

    console.log("Wait");
    await delay(5000);

    console.log("Submit");
    const url5 = URI(validatorNodeURLs[0]).filename("submit").toString();
    const response5 = await client.post(url5, { requestId, code: "000102" });
    assert.strictEqual(response5.data.data, "OK");

    console.log("Wait");
    await delay(5000);

    console.log("Wait");
    await delay(5000);

    console.log("Check link data");
    {
        const item = await linkCollectionContract.getRequestItem(requestId);
        console.log(item.agreement);
        console.log(item.opposition);
        console.log(item.abstaining);
        expect(await linkCollectionContract.toAddress(emailHashes[0])).to.equal(users[0].address);
        expect(await linkCollectionContract.toEmail(users[0].address)).to.equal(emailHashes[0]);
    }

    for (let idx = 0; idx < maxValidatorCount; idx++) {
        await validatorNodes[idx].stop();
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
