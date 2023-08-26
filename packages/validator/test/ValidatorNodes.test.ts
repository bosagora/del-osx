import { Config } from "../src/common/Config";
import { ContractUtils } from "../src/utils/ContractUtils";
import { PeerStatus } from "../src/validator/Peers";
import { LinkCollection } from "../typechain-types";
import { delay, TestClient, TestValidatorNode } from "./helper/Utility";

import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import * as hre from "hardhat";

import assert from "assert";
import ip from "ip";
import * as path from "path";
import URI from "urijs";
import { ValidatorNode } from "../src/validator/ValidatorNode";

chai.use(solidity);

describe("Test of ValidatorNode", function () {
    this.timeout(1000 * 60 * 5);
    const provider = hre.waffle.provider;
    const [deployer, validator1, validator2, validator3, user1, user2, user3] = provider.getWallets();

    const validators = [validator1, validator2, validator3];
    const users = [user1, user2, user3];
    const emailHashes: string[] = [
        ContractUtils.sha256String("a@example.com"),
        ContractUtils.sha256String("b@example.com"),
        ContractUtils.sha256String("c@example.com"),
    ];
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
                config.server.address = "0.0.0.0";
                config.server.port = 7070 + idx;

                for (let peerIdx = 0; peerIdx < maxValidatorCount; peerIdx++) {
                    if (idx === peerIdx) continue;
                    config.peers.items.push({
                        id: validators[peerIdx].address,
                        ip: ip.address(),
                        port: 7070 + peerIdx,
                    });
                }
                configs.push(config);
            }
        });

        before("Create Validator Nodes", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                validatorNodeURLs.push(`http://localhost:${configs[idx].server.port}`);
                validatorNodes.push(new TestValidatorNode(configs[idx]));
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
                assert.strictEqual(nodeInfo.nodeId, validators[idx].address);
                assert.strictEqual(nodeInfo.ip, ip.address());
                assert.strictEqual(nodeInfo.port, configs[idx].server.port);
            }
        });

        it("Wait", async () => {
            await delay(ValidatorNode.INIT_WAITING_SECONDS * 1000);
        });

        it("Get Validator Node Peers", async () => {
            for (let idx = 0; idx < maxValidatorCount; idx++) {
                const url = URI(validatorNodeURLs[idx]).filename("peers").toString();
                const response = await client.get(url);
                const expected = [
                    {
                        nodeId: configs[idx].peers.items[0].id,
                        ip: configs[idx].peers.items[0].ip,
                        port: configs[idx].peers.items[0].port,
                        version: "v1.0.0",
                        status: PeerStatus.ACTIVE,
                    },
                    {
                        nodeId: configs[idx].peers.items[1].id,
                        ip: configs[idx].peers.items[1].ip,
                        port: configs[idx].peers.items[1].port,
                        version: "v1.0.0",
                        status: PeerStatus.ACTIVE,
                    },
                ];
                assert.deepStrictEqual(response.data.data, expected);
            }
        });
    });
});
