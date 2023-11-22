import { Utils } from "../src/utils/Utils";

import * as assert from "assert";
describe("Test of Utils", () => {
    it("Remove National Code", async () => {
        assert.deepStrictEqual(Utils.removeNationCode("+08201012341234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("08201012341234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("(+082)010-1234-1234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("+0821012341234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("0821012341234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("(+082)10-1234-1234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("+0801012341234"), "01012341234");
        assert.deepStrictEqual(Utils.removeNationCode("0801012341234"), "01012341234");
    });
});
