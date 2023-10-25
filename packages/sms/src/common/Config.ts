import { ArgumentParser } from "argparse";
import extend from "extend";
import fs from "fs";
import ip from "ip";
import path from "path";
import { readYamlEnvSync } from "yaml-env-defaults";
import { Utils } from "../utils/Utils";

/**
 * Main config
 */
export class Config implements IConfig {
    public server: ServerConfig;
    public logging: LoggingConfig;
    public sms: SMSConfig;

    constructor() {
        this.server = new ServerConfig();
        this.logging = new LoggingConfig();
        this.sms = new SMSConfig();
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
            console.error(error.message);
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
        this.sms.readFromObject(cfg.sms);
    }
}

export class ServerConfig implements IServerConfig {
    public address: string;
    public port: number;

    constructor(address?: string, port?: number) {
        const conf = extend(true, {}, ServerConfig.defaultValue());
        extend(true, conf, { address, port });

        if (!ip.isV4Format(conf.address) && !ip.isV6Format(conf.address)) {
            console.error(`${conf.address}' is not appropriate to use as an IP address.`);
            process.exit(1);
        }

        this.address = conf.address;
        this.port = conf.port;
    }

    public static defaultValue(): IServerConfig {
        return {
            address: "127.0.0.1",
            port: 3300,
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

export class SMSConfig implements ISMSConfig {
    public endpoint: string;
    public apikey: string;
    public userid: string;
    public accessKey: string;

    constructor() {
        const defaults = SMSConfig.defaultValue();
        this.endpoint = defaults.endpoint;
        this.apikey = defaults.apikey;
        this.userid = defaults.userid;
        this.accessKey = defaults.accessKey;
    }

    public static defaultValue(): ISMSConfig {
        return {
            endpoint: process.env.SMS_ENDPOINT || "",
            apikey: process.env.SMS_APIKEY || "",
            userid: process.env.SMS_USERID || "",
            accessKey: process.env.SMS_ACCESSKEY || "",
        };
    }

    public readFromObject(config: ISMSConfig) {
        if (config.endpoint !== undefined) this.endpoint = config.endpoint;
        if (config.apikey !== undefined) this.apikey = config.apikey;
        if (config.userid !== undefined) this.userid = config.userid;
        if (config.accessKey !== undefined) this.accessKey = config.accessKey;
    }
}

export interface IServerConfig {
    address: string;
    port: number;
}

export interface ILoggingConfig {
    level: string;
}

export interface ISMSConfig {
    endpoint: string;
    apikey: string;
    userid: string;
    accessKey: string;
}

export interface IConfig {
    server: IServerConfig;
    logging: ILoggingConfig;
    sms: ISMSConfig;
}
