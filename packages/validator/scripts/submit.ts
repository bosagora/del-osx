import "@nomiclabs/hardhat-ethers";

import axios from "axios";
import URI from "urijs";

async function main() {
    const validatorNodeURL = "http://localhost:7080";

    const requestId = "0x8db50a07fbe7ad84255e352507131593f8408b860adac939bbe9d841526c5ad3";
    const code = "000102";

    const client = axios.create();
    const url = URI(validatorNodeURL).filename("submit").toString();
    const response = await client.post(url, { requestId, code });
    console.log(response.data);
}
// async function main() {
//     const code = Math.floor(Math.random() * 100)
//         .toString()
//         .padStart(2, "0");
//     console.log(code);
// }
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
