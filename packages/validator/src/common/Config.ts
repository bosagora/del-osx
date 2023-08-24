import { ArgumentParser } from "argparse";
import extend from "extend";
import fs from "fs";
import ip from "ip";
import path from "path";
import { readYamlEnvSync } from "yaml-env-defaults";
import { Utils } from "../utils/Utils";

export class Config implements IConfig {
    public server: ServerConfig;

    public logging: LoggingConfig;

    public validator: ValidatorConfig;

    public contracts: ContractsConfig;

    constructor() {
        this.server = new ServerConfig();
        this.logging = new LoggingConfig();
        this.validator = new ValidatorConfig();
        this.contracts = new ContractsConfig();
    }

    public static createWithArgument(): Config {
        // Parse the arguments
        const parser = new ArgumentParser();
        parser.add_argument("-c", "--config", {
            default: "config.yaml",
            help: "Path to the config file to use",
        });
        const args = parser.parse_args();

        let configPath = path.resolve(Utils.getInitCWD(), args.config);
        if (!fs.existsSync(configPath)) configPath = path.resolve(Utils.getInitCWD(), "config", "config.yaml");
        if (!fs.existsSync(configPath)) {
            console.error(`Config file '${configPath}' does not exists`);
            process.exit(1);
        }

        const cfg = new Config();
        try {
            cfg.readFromFile(configPath);
        } catch (error: any) {
            // Logging setup has not been completed and is output to the console.
            console.error(error.message);

            // If the process fails to read the configuration file, the process exits.
            process.exit(1);
        }
        return cfg;
    }

    public readFromFile(config_file: string) {
        const cfg = readYamlEnvSync([path.resolve(Utils.getInitCWD(), config_file)], (key) => {
            return (process.env || {})[key];
        }) as IConfig;
        this.server.readFromObject(cfg.server);
        this.logging.readFromObject(cfg.logging);
        this.validator.readFromObject(cfg.validator);
        this.contracts.readFromObject(cfg.contracts);
    }
}

export class ServerConfig implements IServerConfig {
    public address: string;
    public port: number;
    public external: string;
    constructor(address?: string, port?: number) {
        const conf = extend(true, {}, ServerConfig.defaultValue());
        extend(true, conf, { address, port });

        if (!ip.isV4Format(conf.address) && !ip.isV6Format(conf.address)) {
            console.error(`${conf.address}' is not appropriate to use as an IP address.`);
            process.exit(1);
        }

        this.address = conf.address;
        this.port = conf.port;
        this.external = conf.external;
    }

    public static defaultValue(): IServerConfig {
        return {
            address: "127.0.0.1",
            port: 3000,
            external: "",
        };
    }

    public readFromObject(config: IServerConfig) {
        const conf = extend(true, {}, ServerConfig.defaultValue());
        extend(true, conf, config);

        if (!ip.isV4Format(conf.address) && !ip.isV6Format(conf.address)) {
            console.error(`${conf.address}' is not appropriate to use as an IP address.`);
            process.exit(1);
        }
        this.address = conf.address;
        this.port = conf.port;
        this.external = conf.external;
    }
}

export class ValidatorConfig implements IValidatorConfig {
    public validator_key: string;

    constructor() {
        const defaults = ValidatorConfig.defaultValue();

        this.validator_key = defaults.validator_key;
    }

    public static defaultValue(): IValidatorConfig {
        return {
            validator_key: process.env.VALIDATOR_KEY || "",
        };
    }

    public readFromObject(config: IValidatorConfig) {
        if (config.validator_key !== undefined) this.validator_key = config.validator_key;
    }
}

export class ContractsConfig implements IContractsConfig {
    public linkCollectionAddress: string;

    constructor() {
        const defaults = ContractsConfig.defaultValue();
        this.linkCollectionAddress = defaults.linkCollectionAddress;
    }

    public static defaultValue(): IContractsConfig {
        return {
            linkCollectionAddress: process.env.EMAIL_LINKER_CONTRACT_ADDRESS || "",
        };
    }

    public readFromObject(config: IContractsConfig) {
        if (config.linkCollectionAddress !== undefined) this.linkCollectionAddress = config.linkCollectionAddress;
    }
}

export class LoggingConfig implements ILoggingConfig {
    public level: string;

    constructor() {
        const defaults = LoggingConfig.defaultValue();
        this.level = defaults.level;
    }

    public static defaultValue(): ILoggingConfig {
        return {
            level: "info",
        };
    }

    public readFromObject(config: ILoggingConfig) {
        if (config.level) this.level = config.level;
    }
}

export interface IServerConfig {
    address: string;
    port: number;
    external: string;
}

export interface ILoggingConfig {
    level: string;
}

export interface IValidatorConfig {
    validator_key: string;
}

export interface IContractsConfig {
    linkCollectionAddress: string;
}

export interface IConfig {
    server: IServerConfig;
    logging: ILoggingConfig;
    validator: IValidatorConfig;
    contracts: IContractsConfig;
}
