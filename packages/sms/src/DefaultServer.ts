import bodyParser from "body-parser";
import cors from "cors";
import { Config } from "./common/Config";
import { DefaultRouter } from "./routers/DefaultRouter";
import { WebService } from "./service/WebService";

import { register } from "prom-client";
import { Metrics } from "./metrics/Metrics";

export class DefaultServer extends WebService {
    private readonly config: Config;
    private readonly metrics: Metrics;

    public readonly router: DefaultRouter;

    constructor(config: Config) {
        super(config.server.port, config.server.address);
        register.clear();
        this.metrics = new Metrics();
        this.metrics.create("gauge", "status", "serve status");
        this.metrics.create("summary", "success", "request success");
        this.metrics.create("summary", "failure", "request failure");

        this.config = config;
        this.router = new DefaultRouter(this, this.config, this.metrics);
    }

    public async start(): Promise<void> {
        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
        // parse application/json
        this.app.use(bodyParser.json({ limit: "1mb" }));
        this.app.use(
            cors({
                origin: "*",
                methods: "GET, POST, OPTIONS",
                allowedHeaders: "Content-Type, Authorization",
                credentials: true,
                preflightContinue: false,
            })
        );

        this.router.registerRoutes();

        return super.start();
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (this.server != null) {
                this.server.close((err?) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else resolve();
        });
    }
}
