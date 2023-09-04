import { ArgumentParser } from "argparse";
import extend from "extend";
import fs from "fs";
import path from "path";
import { readYamlEnvSync } from "yaml-env-defaults";
import { Utils } from "../utils/Utils";

export class Config implements IConfig {
    public node: NodeConfig;

    public logging: LoggingConfig;

    public validator: ValidatorConfig;

    public contracts: ContractsConfig;

    public smtp: SMTPConfig;

    constructor() {
        this.node = new NodeConfig();
        this.logging = new LoggingConfig();
        this.validator = new ValidatorConfig();
        this.contracts = new ContractsConfig();
        this.smtp = new SMTPConfig();
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
        this.node.readFromObject(cfg.node);
        this.logging.readFromObject(cfg.logging);
        this.validator.readFromObject(cfg.validator);
        this.contracts.readFromObject(cfg.contracts);
        this.smtp.readFromObject(cfg.smtp);
    }
}

export class NodeConfig implements INodeConfig {
    public protocol: string;
    public host: string;
    public port: number;
    public external: string;
    public delayLoading: number;

    constructor(host?: string, port?: number) {
        const conf = extend(true, {}, NodeConfig.defaultValue());
        extend(true, conf, { host, port });

        this.protocol = conf.protocol;
        this.host = conf.host;
        this.port = Number(conf.port);
        this.external = conf.external;
        this.delayLoading = Number(conf.delayLoading);
    }

    public static defaultValue(): INodeConfig {
        return {
            protocol: "http",
            host: "127.0.0.1",
            port: 3000,
            external: "",
            delayLoading: 0,
        };
    }

    public readFromObject(config: INodeConfig) {
        const conf = extend(true, {}, NodeConfig.defaultValue());
        extend(true, conf, config);

        this.protocol = conf.protocol;
        this.host = conf.host;
        this.port = Number(conf.port);
        this.external = conf.external;
        this.delayLoading = Number(conf.delayLoading);
    }
}

export class ValidatorConfig implements IValidatorConfig {
    public validatorKey: string;
    public authenticationMode: number;

    constructor() {
        const defaults = ValidatorConfig.defaultValue();

        this.validatorKey = defaults.validatorKey;
        this.authenticationMode = Number(defaults.authenticationMode);
    }

    public static defaultValue(): IValidatorConfig {
        return {
            validatorKey: process.env.VALIDATOR_KEY || "",
            authenticationMode: 3,
        };
    }

    public readFromObject(config: IValidatorConfig) {
        if (config.validatorKey !== undefined) this.validatorKey = config.validatorKey;
        if (config.authenticationMode !== undefined) this.authenticationMode = Number(config.authenticationMode);
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

export class SMTPConfig implements ISMTPConfig {
    public host: string;
    public port: number;
    public account: string;
    public password: string;

    constructor() {
        const defaults = SMTPConfig.defaultValue();
        this.host = defaults.host;
        this.port = Number(defaults.port);
        this.account = defaults.account;
        this.password = defaults.password;
    }

    public static defaultValue(): ISMTPConfig {
        return {
            host: process.env.SMTP_HOST || "",
            port: Number(process.env.SMTP_PORT || "465"),
            account: process.env.SMTP_ACCOUNT || "",
            password: process.env.SMTP_PASSWORD || "",
        };
    }

    public readFromObject(config: ISMTPConfig) {
        if (config.host !== undefined) this.host = config.host;
        if (config.port !== undefined) this.port = Number(config.port);
        if (config.account !== undefined) this.account = config.account;
        if (config.password !== undefined) this.password = config.password;
    }
}
export interface INodeConfig {
    protocol: string;
    host: string;
    port: number;
    external: string;
    delayLoading: number;
}

export interface ILoggingConfig {
    level: string;
}

export interface IValidatorConfig {
    validatorKey: string;
    authenticationMode: number;
}

export interface IContractsConfig {
    linkCollectionAddress: string;
}

export interface ISMTPConfig {
    host: string;
    port: number;
    account: string;
    password: string;
}

export interface IConfig {
    node: INodeConfig;
    logging: ILoggingConfig;
    validator: IValidatorConfig;
    contracts: IContractsConfig;
    smtp: ISMTPConfig;
}
