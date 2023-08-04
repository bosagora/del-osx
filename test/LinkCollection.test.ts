import { LinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import assert from "assert";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

import * as hre from "hardhat";
import { sign } from "./Helper";

import { ContractUtils } from "./ContractUtils";

chai.use(solidity);

describe("Test for LinkCollection", () => {
    const provider = hre.waffle.provider;
    const [admin, owner, sender1, sender2] = provider.getWallets();

    let contract: LinkCollection;

    before(async () => {
        const factory = await hre.ethers.getContractFactory("LinkCollection");
        contract = (await factory.connect(admin).deploy()) as LinkCollection;
        await contract.deployed();
        await contract.deployTransaction.wait();
    });

    it("Add an item", async () => {
        const nonce = await contract.nonce(sender1.address);
        assert.deepStrictEqual(nonce.toString(), "0");
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await sign(sender1, hash, nonce);
        await expect(contract.connect(sender1).add(hash, sender1.address, signature))
            .to.emit(contract, "Added")
            .withArgs(hash, sender1.address);
        assert.deepStrictEqual((await contract.nonce(sender1.address)).toString(), "1");
        await expect(contract.toAddress(hash), sender1.address);
        await expect(contract.toHash(sender1.address), hash);
    });

    it("Add an item with the same email", async () => {
        const nonce = await contract.nonce(sender2.address);
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await sign(sender2, hash, nonce);
        await expect(contract.connect(sender2).add(hash, sender2.address, signature)).to.be.revertedWith("E001");
    });

    it("Add an item with the same address", async () => {
        const nonce = await contract.nonce(sender1.address);
        const email = "def@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await sign(sender1, hash, nonce);
        await expect(contract.connect(sender1).add(hash, sender1.address, signature)).to.be.revertedWith("E002");
    });

    it("Update an item", async () => {
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const nonce1 = await contract.nonce(sender1.address);
        const signature1 = await sign(sender1, hash, nonce1);

        const nonce2 = await contract.nonce(sender2.address);
        const signature2 = await sign(sender2, hash, nonce2);

        await expect(contract.connect(sender2).update(hash, sender1.address, signature1, sender2.address, signature2))
            .to.emit(contract, "Updated")
            .withArgs(hash, sender1.address, sender2.address);
        await expect(contract.toAddress(hash), sender2.address);
        await expect(contract.toHash(sender2.address), hash);
    });
});
