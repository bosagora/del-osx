import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
// tslint:disable-next-line:no-submodule-imports
import { DeployFunction } from "hardhat-deploy/types";
// tslint:disable-next-line:no-submodule-imports
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { LinkCollection } from "../../typechain-types";

// tslint:disable-next-line:only-arrow-functions
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    console.log(`\nDeploying LinkCollection.`);

    const { deployments, getNamedAccounts, ethers } = hre;
    const { deploy } = deployments;
    const { deployer, owner, validator1, validator2, validator3 } = await getNamedAccounts();
    const validators = [validator1, validator2, validator3];

    await deploy("LinkCollection", {
        from: deployer,
        args: [validators],
        log: true,
    });
};

export default func;
func.tags = ["LinkCollection"];
