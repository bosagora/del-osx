import dotenv from "dotenv";
dotenv.config({ path: "env/.env" });

import { Config } from "../src/common/Config";

import * as assert from "assert";
import path from "path";

describe("Test of Config", () => {
    it("Test parsing the settings of a string", async () => {
        const config: Config = new Config();
        config.readFromFile(path.resolve("tests", "config.test.yaml"));

        assert.strictEqual(config.server.address, "0.0.0.0");
        assert.strictEqual(config.server.port, 3300);

        assert.strictEqual(config.logging.level, "debug");
    });
});
