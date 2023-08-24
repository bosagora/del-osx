import winston from "winston";

const { combine, timestamp, label, printf } = winston.format;
// tslint:disable-next-line:no-shadowed-variable
const logFormat = printf(({ level, message, label, timestamp }) => {
    return `[${label}] [${timestamp}] ${message}`;
});

export class Logger {
    public static defaultConsoleTransport() {
        // console log mode options
        const options = {
            handleExceptions: true,
            json: false,
            colorize: false,
            format: combine(label({ label: "validator" }), timestamp(), logFormat),
        };

        return new winston.transports.Console(options);
    }

    public static create(): winston.Logger {
        switch (process.env.NODE_ENV) {
            case "test":
                return winston.createLogger({
                    level: "error",
                    transports: [Logger.defaultConsoleTransport()],
                });
            case "development":
            case "production":
            default:
                return winston.createLogger({
                    level: "info",
                    transports: [Logger.defaultConsoleTransport()],
                });
        }
    }
}

export const logger: winston.Logger = Logger.create();
