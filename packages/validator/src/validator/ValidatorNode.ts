import { Config } from "../common/Config";
import { Peer, Peers } from "./Peers";
import { Router } from "./Router";
import { Worker } from "./Worker";

import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import http from "http";

export class ValidatorNode {
    public static INIT_WAITING_SECONDS: number = 2;
    public static INTERVAL_SECONDS: number = 5;
    private readonly _app: express.Application;
    private _server: http.Server | null = null;

    private readonly _config: Config;
    private readonly _router: Router;
    private readonly _peers: Peers;
    private readonly _worker: Worker;

    constructor(config: Config) {
        this._app = express();
        this._config = config;
        this._peers = new Peers();
        this._router = new Router(this, this._config, this._peers);
        this._worker = new Worker("*/1 * * * * *", this, this._router);
        for (const elem of this._config.peers.items) this._peers.items.push(new Peer(elem.id, elem.ip, elem.port, ""));
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
            this._server.listen(this._config.server.port, this._config.server.address, async () => {
                await this._worker.start();
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            await this._worker.stop();
            await this._worker.waitForStop();
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
