import { LinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import assert from "assert";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

import * as hre from "hardhat";

import { ContractUtils } from "./ContractUtils";

chai.use(solidity);

describe("Test for LinkCollection", () => {
    const provider = hre.waffle.provider;
    const [admin, owner, user1, user2, validator1, validator2, validator3] = provider.getWallets();

    const validators = [validator1, validator2, validator3];
    let contract: LinkCollection;

    before(async () => {
        const factory = await hre.ethers.getContractFactory("LinkCollection");
        contract = (await factory.connect(admin).deploy(validators.map((m) => m.address))) as LinkCollection;
        await contract.deployed();
        await contract.deployTransaction.wait();
    });

    it("Add an item", async () => {
        const nonce = await contract.nonce(user1.address);
        assert.deepStrictEqual(nonce.toString(), "0");
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await ContractUtils.sign(user1, hash, nonce);
        await expect(contract.connect(validators[0]).add(hash, user1.address, signature))
            .to.emit(contract, "Added")
            .withArgs(hash, user1.address);
        assert.deepStrictEqual((await contract.nonce(user1.address)).toString(), "1");
        assert.deepStrictEqual(await contract.toAddress(hash), user1.address);
        assert.deepStrictEqual(await contract.toHash(user1.address), hash);
    });

    it("Add an item with the same email", async () => {
        const nonce = await contract.nonce(user2.address);
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await ContractUtils.sign(user2, hash, nonce);
        await expect(contract.connect(validators[1]).add(hash, user2.address, signature)).to.be.revertedWith("E001");
    });

    it("Add an item with the same address", async () => {
        const nonce = await contract.nonce(user1.address);
        const email = "def@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await ContractUtils.sign(user1, hash, nonce);
        await expect(contract.connect(validators[2]).add(hash, user1.address, signature)).to.be.revertedWith("E002");
    });

    it("Update an item", async () => {
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const nonce1 = await contract.nonce(user1.address);
        const signature1 = await ContractUtils.sign(user1, hash, nonce1);

        const nonce2 = await contract.nonce(user2.address);
        const signature2 = await ContractUtils.sign(user2, hash, nonce2);

        await expect(contract.connect(validators[2]).update(hash, user1.address, signature1, user2.address, signature2))
            .to.emit(contract, "Updated")
            .withArgs(hash, user1.address, user2.address);
        assert.deepStrictEqual(await contract.toAddress(hash), user2.address);
        assert.deepStrictEqual(await contract.toHash(user2.address), hash);
    });
});
