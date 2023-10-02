import { Config } from "../src/common/Config";
import { Storage } from "../src/storage/Storages";
import { AuthenticationMode } from "../src/types";
import { ContractUtils } from "../src/utils/ContractUtils";
import { ValidatorNode } from "../src/validator/ValidatorNode";
import { EmailLinkCollection } from "../typechain-types";
import { delay, TestClient, TestValidatorNode } from "./helper/Utility";

import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import * as hre from "hardhat";

import assert from "assert";
import ip from "ip";
import * as path from "path";
import URI from "urijs";

chai.use(solidity);

describe("Test of ValidatorNode - NoEMailNoCode", function () {
    this.timeout(60 * 1000);
    const provider = hre.waffle.provider;
    const [deployer, validator1, validator2, validator3, user1, user2, user3] = provider.getWallets();

    const validators = [validator1, validator2, validator3];
    const users = [user1, user2, user3];
    const emails: string[] = ["a@example.com", "b@example.com", "c@example.com"];
    const emailHashes: string[] = emails.map((m) => ContractUtils.getEmailHash(m));
    let linkCollectionContract: EmailLinkCollection;

    const deployEmailLinkCollection = async () => {
        const linkCollectionFactory = await hre.ethers.getContractFactory("EmailLinkCollection");
        linkCollectionContract = (await linkCollectionFactory
            .connect(deployer)
            .deploy(validators.map((m) => m.address))) as EmailLinkCollection;
        await linkCollectionContract.deployed();
        await linkCollectionContract.deployTransaction.wait();
    };

    const validatorNodes: TestValidatorNode[] = [];
    const storages: Storage[] = [];
    const validatorNodeURLs: string[] = [];
    const configs: Config[] = [];
    const maxValidatorCount = 3;
    const client = new TestClient();

    context("Test ValidatorNode", () => {
        before("Deploy", async () => {
            await deployEmailLinkCollection();
        });

        before("Create Config", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const config = new Config();
                config.readFromFile(path.resolve(process.cwd(), "test", "helper", "config.yaml"));
                config.contracts.emailLinkCollectionAddress = linkCollectionContract.address;
                config.validator.validatorKey = validators[idx].privateKey;
                config.validator.authenticationMode = AuthenticationMode.NoEMailNoCode;
                config.node.protocol = "http";
                config.node.host = "0.0.0.0";
                config.node.port = 7070 + idx;
                configs.push(config);

                await linkCollectionContract
                    .connect(validators[idx])
                    .updateEndpoint(`http://${ip.address()}:${7070 + idx}`);
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
            const signature = await ContractUtils.signRequestEmail(users[0], emails[0], nonce);

            const url = URI(validatorNodeURLs[0]).filename("request").toString();
            const response = await client.post(url, {
                email: emails[0],
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
            expect(await linkCollectionContract.toAddress(emailHashes[0])).to.equal(users[0].address);
            expect(await linkCollectionContract.toEmail(users[0].address)).to.equal(emailHashes[0]);
        });
    });
});
