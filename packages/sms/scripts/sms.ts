import axios from "axios";
// tslint:disable-next-line:no-var-requires
const aligoapi = require("aligoapi");
import * as dotenv from "dotenv";
dotenv.config({ path: "env/.env" });

async function main() {
    const contents: string[] = [];
    const validatorNumber: string = `${1}`;
    contents.push(`검증자 번호 [${validatorNumber}]`);
    contents.push(`인증번호 [${25}]. `);
    contents.push(`5분가 유효합니다.`);
    console.log(process.env.SMS_APIKEY || "");
    console.log(process.env.SMS_USERID || "");
    console.log(process.env.SMS_SENDER || "");
    console.log(process.env.SMS_RECEIVER || "");

    const AuthData = {
        key: process.env.SMS_APIKEY || "",
        user_id: process.env.SMS_USERID || "",
    };
    const req = {
        headers: { "content-type": "application/json" },
        body: {
            sender: process.env.SMS_SENDER || "",
            receiver: process.env.SMS_RECEIVER || "",
            msg: contents.map((m) => m + "\n").join("\n"),
            testmode_yn: process.env.SMS_TESTMODE || "",
        },
    };
    aligoapi
        .send(req, AuthData)
        .then((r: any) => {
            console.log(r);
        })
        .catch((e: any) => {
            console.log(e);
        });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
