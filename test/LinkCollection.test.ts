import { LinkCollection } from "../typechain-types";

import assert from "assert";
import chai from "chai";
import { solidity } from "ethereum-waffle";

import * as hre from "hardhat";

chai.use(solidity);

describe("Test for LinkCollection", () => {

    const provider = hre.waffle.provider;
    const [admin, owner] = provider.getWallets();

    let contract: LinkCollection;

    before(async () => {
        const factory = await hre.ethers.getContractFactory("LinkCollection");
        contract = (await factory.connect(admin).deploy()) as LinkCollection;
        await contract.deployed();
        await contract.deployTransaction.wait();
    });

    it("Check nonce", async () => {
        assert.deepStrictEqual((await contract.nonce(admin.address)).toString(), "0");
        await contract.connect(admin).add();
        assert.deepStrictEqual((await contract.nonce(admin.address)).toString(), "1");
    });

});