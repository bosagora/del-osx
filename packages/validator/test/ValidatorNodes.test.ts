import { Config } from "../src/common/Config";
import { ValidatorNodeInfo } from "../src/types";
import { ContractUtils } from "../src/utils/ContractUtils";
import { PeerStatus } from "../src/validator/Peers";
import { ValidatorNode } from "../src/validator/ValidatorNode";
import { LinkCollection } from "../typechain-types";
import { delay, TestClient, TestValidatorNode } from "./helper/Utility";

import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import * as hre from "hardhat";

import assert from "assert";
import ip from "ip";
import * as path from "path";
import URI from "urijs";

chai.use(solidity);

describe("Test of ValidatorNode", function () {
    this.timeout(1000 * 60 * 5);
    const provider = hre.waffle.provider;
    const [deployer, validator1, validator2, validator3, user1, user2, user3] = provider.getWallets();

    const validators = [validator1, validator2, validator3];
    const users = [user1, user2, user3];
    const emails: string[] = ["a@example.com", "b@example.com", "c@example.com"];
    const emailHashes: string[] = emails.map((m) => ContractUtils.sha256String(m));
    let linkCollectionContract: LinkCollection;

    const deployLinkCollection = async () => {
        const linkCollectionFactory = await hre.ethers.getContractFactory("LinkCollection");
        linkCollectionContract = (await linkCollectionFactory
            .connect(deployer)
            .deploy(validators.map((m) => m.address))) as LinkCollection;
        await linkCollectionContract.deployed();
        await linkCollectionContract.deployTransaction.wait();
    };

    const validatorNodes: TestValidatorNode[] = [];
    const validatorNodeURLs: string[] = [];
    const configs: Config[] = [];
    const maxValidatorCount = 3;
    const client = new TestClient();

    context("Test ValidatorNode", () => {
        before("Deploy", async () => {
            await deployLinkCollection();
        });

        before("Create Config", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const config = new Config();
                config.readFromFile(path.resolve(process.cwd(), "test", "helper", "config.yaml"));
                config.contracts.linkCollectionAddress = linkCollectionContract.address;
                config.validator.validator_key = validators[idx].privateKey;
                config.node.protocol = "http";
                config.node.host = "0.0.0.0";
                config.node.port = 7070 + idx;
                configs.push(config);

                await linkCollectionContract
                    .connect(validators[idx])
                    .updateEndpoint(`http://${ip.address()}:${7070 + idx}`);
            }
        });

        before("Create Validator Nodes", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                validatorNodeURLs.push(`http://localhost:${configs[idx].node.port}`);
                validatorNodes.push(new TestValidatorNode(configs[idx], idx));
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

        it("Get Validator Node Info", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const url = URI(validatorNodeURLs[idx]).filename("info").toString();
                const response = await client.get(url);
                assert.deepStrictEqual(response.data.code, 200);
                const nodeInfo: ValidatorNodeInfo = response.data.data;
                assert.strictEqual(nodeInfo.nodeId, validators[idx].address.toLowerCase());
                assert.strictEqual(nodeInfo.endpoint, `http://${ip.address()}:${configs[idx].node.port}`);
            }
        });

        it("Wait", async () => {
            await delay(ValidatorNode.INIT_WAITING_SECONDS * 1000);
        });

        it("Get Validator Node Peers", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const peers = [];
                for (let peerIdx = 0; peerIdx < maxValidatorCount; peerIdx++) {
                    if (idx === peerIdx) continue;
                    peers.push({
                        nodeId: validators[peerIdx].address.toLowerCase(),
                        endpoint: `http://${ip.address()}:${7070 + peerIdx}`,
                    });
                }
                const url = URI(validatorNodeURLs[idx]).filename("peers").toString();
                const response = await client.get(url);
                const expected = [
                    {
                        nodeId: peers[0].nodeId,
                        endpoint: peers[0].endpoint,
                        version: "v1.0.0",
                        status: PeerStatus.ACTIVE,
                    },
                    {
                        nodeId: peers[1].nodeId,
                        endpoint: peers[1].endpoint,
                        version: "v1.0.0",
                        status: PeerStatus.ACTIVE,
                    },
                ];
                assert.deepStrictEqual(response.data.data, expected);
            }
        });

        it("Check validator's endpoint on contract", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const res = await linkCollectionContract.getValidator(idx);
                assert.deepStrictEqual(res.index.toString(), `${idx}`);
                assert.deepStrictEqual(res.endpoint, `http://${ip.address()}:${7070 + idx}`);
            }
        });

        let txHash = "";
        it("Add link data", async () => {
            const nonce = await linkCollectionContract.nonceOf(users[0].address);
            const signature = await ContractUtils.sign(users[0], emails[0], nonce);

            const url = URI(validatorNodeURLs[0]).filename("request").toString();
            const response = await client.post(url, {
                email: emails[0],
                address: users[0].address,
                signature,
            });
            assert.deepStrictEqual(response.status, 200);
            assert.deepStrictEqual(response.data.code, 200);
            assert(response.data.data.txHash !== undefined);

            txHash = response.data.data.txHash;
        });

        it("Wait", async () => {
            await delay(3000);
        });

        it("Submit", async () => {
            const url = URI(validatorNodeURLs[0]).filename("submit").toString();
            const response = await client.post(url, { txHash, code: "000102" });
            assert.strictEqual(response.data.data, "OK");
        });

        it("Wait", async () => {
            await delay(3000);
        });

        it("Check link data", async () => {
            await expect(await linkCollectionContract.toAddress(emailHashes[0])).to.equal(users[0].address);
            await expect(await linkCollectionContract.toEmail(users[0].address)).to.equal(emailHashes[0]);
        });
    });
});
