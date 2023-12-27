import dotenv from "dotenv";
dotenv.config({ path: "env/.env" });

import { PhoneNumberFormat, PhoneNumberUtil } from "google-libphonenumber";

import { Config } from "../src/common/Config";

import * as assert from "assert";
import path from "path";
import { Utils } from "../src/utils/Utils";

describe("Test of Config", () => {
    it("Test parsing the settings of a string", async () => {
        const config: Config = new Config();
        config.readFromFile(path.resolve("tests", "config.test.yaml"));

        assert.strictEqual(config.server.address, "0.0.0.0");
        assert.strictEqual(config.server.port, 3300);

        assert.strictEqual(config.logging.level, "debug");
    });

    it("Test Phone Number", async () => {
        const phoneUtil = PhoneNumberUtil.getInstance();
        const number = phoneUtil.parseAndKeepRawInput("+82 10-1000-2000", "ZZ");
        console.log(phoneUtil.isValidNumber(number));
        console.log(phoneUtil.getRegionCodeForNumber(number));
        console.log(phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL));
        console.log(phoneUtil.format(number, PhoneNumberFormat.NATIONAL));
    });

    it("Test Phone Number", async () => {
        const phoneUtil = PhoneNumberUtil.getInstance();
        const number = phoneUtil.parseAndKeepRawInput("+8201010002000", "ZZ");
        console.log(phoneUtil.isValidNumber(number));
        console.log(phoneUtil.getRegionCodeForNumber(number));
        console.log(phoneUtil.format(number, PhoneNumberFormat.INTERNATIONAL));
        console.log(phoneUtil.format(number, PhoneNumberFormat.NATIONAL).replace(/\-/g, ""));
    });
});
