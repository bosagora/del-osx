import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import "@openzeppelin/hardhat-upgrades";
import { ethers, upgrades, waffle } from "hardhat";

import { ContractUtils } from "../src/utils/ContractUtils";
import { PhoneLinkCollection } from "../typechain-types";

import assert from "assert";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";

import { BigNumber } from "ethers";

// tslint:disable-next-line:no-implicit-dependencies
import { AddressZero, HashZero } from "@ethersproject/constants";

chai.use(solidity);

describe("Test for PhoneLinkCollection", () => {
    const provider = waffle.provider;
    const [admin, owner, user1, user2, user3, relay, validator1, validator2, validator3] = provider.getWallets();

    const validators = [validator1, validator2, validator3];
    let contract: PhoneLinkCollection;
    let requestId: string;

    before(async () => {
        const factory = await ethers.getContractFactory("PhoneLinkCollection");
        contract = (await upgrades.deployProxy(factory.connect(admin), [validators.map((m) => m.address)], {
            initializer: "initialize",
            kind: "uups",
        })) as PhoneLinkCollection;
        await contract.deployed();
    });

    it("Add an request item", async () => {
        const nonce = await contract.nonceOf(user1.address);
        assert.deepStrictEqual(nonce.toString(), "0");
        const phone = "08201012341234";
        const hash = ContractUtils.getPhoneHash(phone);
        const signature = await ContractUtils.signRequestHash(user1, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user1.address, nonce);
        expect(await contract.connect(relay).isAvailable(requestId)).to.equal(true);
        await expect(contract.connect(relay).addRequest(requestId, hash, user1.address, signature))
            .to.emit(contract, "AddedRequestItem")
            .withArgs(requestId, hash, user1.address);
        assert.deepStrictEqual((await contract.nonceOf(user1.address)).toString(), "1");
        expect(await contract.connect(relay).isAvailable(requestId)).to.equal(false);
    });

    it("Vote of request item", async () => {
        const phone = "08201012341234";
        const hash = ContractUtils.getPhoneHash(phone);
        await contract.connect(validator1).voteRequest(requestId);
        await contract.connect(validator2).voteRequest(requestId);

        await expect(contract.connect(validator1).countVote(requestId))
            .to.emit(contract, "AcceptedRequestItem")
            .withArgs(requestId, hash, user1.address);

        assert.deepStrictEqual(await contract.toAddress(hash), user1.address);
        assert.deepStrictEqual(await contract.toPhone(user1.address), hash);
    });

    it("Update an item", async () => {
        const phone = "08201012341234";
        const hash = ContractUtils.getPhoneHash(phone);

        const nonce = await contract.nonceOf(user2.address);
        const signature = await ContractUtils.signRequestHash(user2, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user2.address, nonce);
        expect(await contract.connect(relay).isAvailable(requestId)).to.equal(true);
        await expect(contract.connect(relay).addRequest(requestId, hash, user2.address, signature))
            .to.emit(contract, "AddedRequestItem")
            .withArgs(requestId, hash, user2.address);
        assert.deepStrictEqual((await contract.nonceOf(user2.address)).toString(), "1");
        expect(await contract.connect(relay).isAvailable(requestId)).to.equal(false);
    });

    it("Vote of update item", async () => {
        const phone = "08201012341234";
        const hash = ContractUtils.getPhoneHash(phone);
        await contract.connect(validator1).voteRequest(requestId);
        await contract.connect(validator2).voteRequest(requestId);

        await expect(contract.connect(validator1).countVote(requestId))
            .to.emit(contract, "AcceptedRequestItem")
            .withArgs(requestId, hash, user2.address);

        assert.deepStrictEqual(await contract.toAddress(hash), user2.address);
        assert.deepStrictEqual(await contract.toPhone(user2.address), hash);
    });

    it("Remove item", async () => {
        const phone = "08201012341234";
        const hash = ContractUtils.getPhoneHash(phone);
        const nonce = await contract.nonceOf(user2.address);
        const message = ContractUtils.getRemoveMessage(user2.address, nonce);
        const signature = await ContractUtils.signMessage(user2, message);

        await expect(contract.connect(validator1).remove(user2.address, signature))
            .to.emit(contract, "RemovedItem")
            .withArgs(hash, user2.address);

        assert.deepStrictEqual(await contract.toAddress(hash), AddressZero);
        assert.deepStrictEqual(await contract.toPhone(user2.address), HashZero);
    });

    it("Check Null", async () => {
        const phone = "";
        const hash = ContractUtils.getPhoneHash(phone);
        expect(hash).to.equal("0x32105b1d0b88ada155176b58ee08b45c31e4f2f7337475831982c313533b880c");
        const nonce = await contract.nonceOf(user3.address);
        const signature = await ContractUtils.signRequestHash(user3, hash, nonce);
        requestId = ContractUtils.getRequestId(hash, user3.address, nonce);
        await expect(contract.connect(relay).addRequest(requestId, hash, user3.address, signature)).to.be.revertedWith(
            "Invalid phone hash"
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
