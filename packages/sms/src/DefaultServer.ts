import bodyParser from "body-parser";
import cors from "cors";
import { Config } from "./common/Config";
import { cors_options } from "./option/cors";
import { DefaultRouter } from "./routers/DefaultRouter";
import { WebService } from "./service/WebService";

export class DefaultServer extends WebService {
    private readonly config: Config;

    public readonly router: DefaultRouter;

    constructor(config: Config) {
        super(config.server.port, config.server.address);

        this.config = config;
        this.router = new DefaultRouter(this, this.config);
    }

    public async start(): Promise<void> {
        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
        // parse application/json
        this.app.use(bodyParser.json({ limit: "1mb" }));
        this.app.use(cors(cors_options));

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
