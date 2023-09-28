import { ContractUtils } from "../src/utils/ContractUtils";
import { EmailLinkCollection } from "../typechain-types";

import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";

import assert from "assert";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

import * as hre from "hardhat";

import { BigNumber } from "ethers";

chai.use(solidity);

describe("Test for EmailLinkCollection", () => {
    const provider = hre.waffle.provider;
    const [admin, owner, user1, user2, user3, relay, validator1, validator2, validator3] = provider.getWallets();

    const validators = [validator1, validator2, validator3];
    let contract: EmailLinkCollection;
    let requestId: string;

    before(async () => {
        const factory = await hre.ethers.getContractFactory("EmailLinkCollection");
        contract = (await factory.connect(admin).deploy(validators.map((m) => m.address))) as EmailLinkCollection;
        await contract.deployed();
        await contract.deployTransaction.wait();
    });

    it("Add an request item", async () => {
        const nonce = await contract.nonceOf(user1.address);
        assert.deepStrictEqual(nonce.toString(), "0");
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await ContractUtils.sign(user1, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user1.address, nonce);
        expect(await contract.connect(relay).isAvailable(requestId)).to.equal(true);
        await expect(contract.connect(relay).addRequest(requestId, hash, user1.address, signature))
            .to.emit(contract, "AddedRequestItem")
            .withArgs(requestId, hash, user1.address);
        assert.deepStrictEqual((await contract.nonceOf(user1.address)).toString(), "1");
        expect(await contract.connect(relay).isAvailable(requestId)).to.equal(false);
    });

    it("Vote of request item", async () => {
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        await contract.connect(validator1).voteRequest(requestId);
        await contract.connect(validator2).voteRequest(requestId);

        await expect(contract.connect(validator1).countVote(requestId))
            .to.emit(contract, "AcceptedRequestItem")
            .withArgs(requestId, hash, user1.address);

        assert.deepStrictEqual(await contract.toAddress(hash), user1.address);
        assert.deepStrictEqual(await contract.toEmail(user1.address), hash);
    });

    it("Add an item with the same email", async () => {
        const nonce = await contract.nonceOf(user2.address);
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await ContractUtils.sign(user2, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user2.address, nonce);
        await expect(
            contract.connect(validators[1]).addRequest(requestId, hash, user2.address, signature)
        ).to.be.revertedWith("Invalid email hash");
    });

    it("Add an item with the same address", async () => {
        const nonce = await contract.nonceOf(user1.address);
        const email = "def@example.com";
        const hash = ContractUtils.sha256String(email);
        const signature = await ContractUtils.sign(user1, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user1.address, nonce);
        await expect(contract.connect(relay).addRequest(requestId, hash, user1.address, signature)).to.be.revertedWith(
            "Invalid address"
        );
    });

    it("Update an item", async () => {
        const email = "abc@example.com";
        const hash = ContractUtils.sha256String(email);
        const nonce1 = await contract.nonceOf(user1.address);
        const signature1 = await ContractUtils.sign(user1, hash, nonce1);

        const nonce2 = await contract.nonceOf(user2.address);
        const signature2 = await ContractUtils.sign(user2, hash, nonce2);

        await expect(contract.connect(relay).update(hash, user1.address, signature1, user2.address, signature2))
            .to.emit(contract, "UpdatedLinkItem")
            .withArgs(hash, user1.address, user2.address);
        assert.deepStrictEqual(await contract.toAddress(hash), user2.address);
        assert.deepStrictEqual(await contract.toEmail(user2.address), hash);
    });

    it("Check Null", async () => {
        const email = "";
        const hash = ContractUtils.sha256String(email);
        expect(hash).to.equal("0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        const nonce = await contract.nonceOf(user3.address);
        const signature = await ContractUtils.sign(user3, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user3.address, nonce);
        await expect(contract.connect(relay).addRequest(requestId, hash, user3.address, signature)).to.be.revertedWith(
            "Invalid email hash"
        );
    });

    it("Validator's data", async () => {
        const res = await contract.getValidators();
        assert.deepStrictEqual(res.length, validators.length);
        let idx = 0;
        for (const item of res) {
            assert.strictEqual(item.validator, validators[idx++].address);
            assert.strictEqual(item.status, 1);
        }
    });

    it("Validator's address", async () => {
        const res = await contract.getAddressOfValidators();
        assert.deepStrictEqual(
            res,
            validators.map((m) => m.address)
        );
    });

    it("Validator length", async () => {
        const res = await contract.getValidatorLength();
        assert.deepStrictEqual(res, BigNumber.from(3));
    });

    it("Check Validator", async () => {
        const length = (await contract.getValidatorLength()).toNumber();
        for (let idx = 0; idx < length; idx++) {
            const res = await contract.getValidator(idx);
            assert.strictEqual(res.validator, validators[idx++].address);
            assert.strictEqual(res.status, 1);
        }
    });

    it("Set endpoint", async () => {
        for (let idx = 0; idx < validators.length; idx++) {
            const res = await contract.getValidator(idx);
            assert.strictEqual(res.endpoint, "");
        }

        for (let idx = 0; idx < validators.length; idx++) {
            const res = await contract.connect(validators[idx]).updateEndpoint(`http://127.0.0.1:${idx + 7070}`);
        }

        for (let idx = 0; idx < validators.length; idx++) {
            const res = await contract.getValidator(idx);
            assert.strictEqual(res.endpoint, `http://127.0.0.1:${idx + 7070}`);
        }
    });
});
