import { Config } from "../common/Config";
import { Router } from "./Router";

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import http from "http";

export class ValidatorNode {
    private readonly _app: express.Application;
    private _server: http.Server | null = null;

    private readonly _config: Config;
    private readonly _router: Router;

    constructor(config: Config) {
        this._app = express();
        this._config = config;
        this._router = new Router(this, this._config);
    }

    public async start(): Promise<void> {
        this._app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
        this._app.use(bodyParser.json({ limit: "1mb" }));
        this._app.use(
            cors({
                allowedHeaders: "*",
                credentials: true,
                methods: "GET, POST",
                origin: "*",
                preflightContinue: false,
            })
        );
        this._router.registerRoutes();

        return new Promise<void>((resolve, reject) => {
            this._app.set("port", this._config.server.port);
            this._server = http.createServer(this._app);
            this._server.on("error", reject);
            this._server.listen(this._config.server.port, this._config.server.address, () => {
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (this._server != null) {
                this._server.close((err?) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else resolve();
        });
    }

    public get app(): express.Application {
        return this._app;
    }
}
