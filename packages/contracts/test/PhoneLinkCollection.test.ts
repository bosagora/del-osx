import "@nomicfoundation/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import { ethers, upgrades } from "hardhat";

import assert from "assert";
import chai, { expect } from "chai";

import { HardhatAccount } from "../src/HardhatAccount";
import { ContractUtils } from "../src/utils/ContractUtils";
import { PhoneLinkCollection } from "../typechain-types";

describe("Test for PhoneLinkCollection", async () => {
    const accounts = HardhatAccount.keys.map((m) => new ethers.Wallet(m, ethers.provider));
    const [admin, owner, user1, user2, user3, relay, validator1, validator2, validator3] = accounts;
    const validators = [validator1, validator2, validator3];
    let contract: PhoneLinkCollection;
    let requestId: string;

    before(async () => {
        const factory = await ethers.getContractFactory("PhoneLinkCollection");
        contract = (await upgrades.deployProxy(factory.connect(admin), [validators.map((m) => m.address)], {
            initializer: "initialize",
            kind: "uups",
        })) as unknown as PhoneLinkCollection;
        await contract.waitForDeployment();
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
            assert.strictEqual(item.status, 1n);
        }
    });

    it("Validator's address", async () => {
        const res = await contract.getAddressOfValidators();
        const expected = validators.map((m) => m.address);
        assert.deepStrictEqual(res.length, expected.length);
        for (let idx = 0; idx < res.length; idx++) {
            assert.deepStrictEqual(res[idx], expected[idx]);
        }
    });

    it("Validator length", async () => {
        const res = await contract.getValidatorLength();
        assert.deepStrictEqual(res, 3n);
    });

    it("Check Validator", async () => {
        const length = await contract.getValidatorLength();
        for (let idx = 0; idx < length; idx++) {
            const res = await contract.getValidator(idx);
            assert.strictEqual(res.validator, validators[idx++].address);
            assert.strictEqual(res.status, 1n);
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
