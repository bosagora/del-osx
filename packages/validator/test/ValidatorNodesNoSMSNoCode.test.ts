import { Config } from "../src/common/Config";
import { Storage } from "../src/storage/Storages";
import { AuthenticationMode } from "../src/types";
import { ContractUtils } from "../src/utils/ContractUtils";
import { ValidatorNode } from "../src/validator/ValidatorNode";
import { PhoneLinkCollection } from "../typechain-types";
import { delay, TestClient, TestValidatorNode } from "./helper/Utility";

import { expect } from "chai";

import assert from "assert";
import ip from "ip";
import * as path from "path";
import URI from "urijs";

import { ethers, upgrades } from "hardhat";
import { HardhatAccount } from "../src/HardhatAccount";

describe("Test of ValidatorNode - NoPhoneNoCode", function () {
    this.timeout(60 * 1000);

    const accounts = HardhatAccount.keys.map((m) => new ethers.Wallet(m, ethers.provider));
    const [deployer, validator1, validator2, validator3, user1, user2, user3] = accounts;
    const validators = [validator1, validator2, validator3];
    const users = [user1, user2, user3];

    const phones: string[] = ["01012341000", "01012341001", "01012341002"];
    const phoneHashes: string[] = phones.map((m) => ContractUtils.getPhoneHash(m));
    let linkCollectionContract: PhoneLinkCollection;

    const deployPhoneLinkCollection = async () => {
        const factory = await ethers.getContractFactory("PhoneLinkCollection");
        linkCollectionContract = (await upgrades.deployProxy(
            factory.connect(deployer),
            [validators.map((m) => m.address)],
            {
                initializer: "initialize",
                kind: "uups",
            }
        )) as unknown as PhoneLinkCollection;
        await linkCollectionContract.waitForDeployment();
    };

    const validatorNodes: TestValidatorNode[] = [];
    const storages: Storage[] = [];
    const validatorNodeURLs: string[] = [];
    const configs: Config[] = [];
    const maxValidatorCount = 3;
    const client = new TestClient();
    const basePort = 9010;

    context("Test ValidatorNode", () => {
        before("Deploy", async () => {
            await deployPhoneLinkCollection();
        });

        before("Create Config", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const config = new Config();
                config.readFromFile(path.resolve(process.cwd(), "test", "helper", "config.yaml"));
                config.contracts.phoneLinkCollectionAddress = await linkCollectionContract.getAddress();
                config.validator.validatorKey = validators[idx].privateKey;
                config.validator.authenticationMode = AuthenticationMode.NoSMSNoCode;
                config.node.protocol = "http";
                config.node.host = "0.0.0.0";
                config.node.port = basePort + idx;
                configs.push(config);

                await linkCollectionContract
                    .connect(validators[idx])
                    .updateEndpoint(`http://${ip.address()}:${basePort + idx}`);
            }
        });

        before("Create Storages", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                storages.push(await Storage.make(configs[idx].database.path));
            }
        });

        before("Create Validator Nodes", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                validatorNodeURLs.push(`http://localhost:${configs[idx].node.port}`);
                validatorNodes.push(new TestValidatorNode(configs[idx], storages[idx]));
            }
        });

        before("Start Validator Nodes", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                await validatorNodes[idx].start();
            }
        });

        after(async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                await validatorNodes[idx].stop();
            }
        });

        it("Wait", async () => {
            await delay(ValidatorNode.INIT_WAITING_SECONDS * 1000);
        });

        it("Add link data", async () => {
            const nonce = await linkCollectionContract.nonceOf(users[0].address);
            const signature = await ContractUtils.signRequestPhone(users[0], phones[0], nonce);

            const url = URI(validatorNodeURLs[0]).filename("request").toString();
            const response = await client.post(url, {
                phone: phones[0],
                address: users[0].address,
                signature,
            });
            assert.deepStrictEqual(response.status, 200);
            assert.deepStrictEqual(response.data.code, 200);
            assert(response.data.data.requestId !== undefined);
        });

        it("Wait", async () => {
            await delay(10000);
        });

        it("Check link data", async () => {
            expect(await linkCollectionContract.toAddress(phoneHashes[0])).to.equal(users[0].address);
            expect(await linkCollectionContract.toPhone(users[0].address)).to.equal(phoneHashes[0]);
        });
    });
});
