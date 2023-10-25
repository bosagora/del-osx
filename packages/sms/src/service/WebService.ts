import express from "express";
import http from "http";

export class WebService {
    public app: express.Application;
    public server: http.Server | null = null;
    private readonly address: string;
    private readonly port: number;

    constructor(port: number | string, address: string = "") {
        if (typeof port === "string") this.port = parseInt(port, 10);
        else this.port = port;

        this.address = address;

        this.app = express();
    }

    public start(): Promise<void> {
        // Listen on provided this.port on this.address.
        return new Promise<void>((resolve, reject) => {
            // Create HTTP server.
            this.app.set("port", this.port);
            this.server = http.createServer(this.app);
            this.server.on("error", reject);
            this.server.listen(this.port, this.address, () => {
                resolve();
            });
        });
    }
}
