import axios, { AxiosInstance } from "axios";

export enum PeerStatus {
    UNKNOWN,
    ACTIVE,
    INACTIVE,
    ABNORMAL,
}

export interface IPeer {
    nodeId: string;
    ip: string;
    port: number;
    version: string;
    status: PeerStatus;
}

export class Peer implements IPeer {
    public nodeId: string;
    public ip: string;
    public port: number;
    public version: string;
    public status: PeerStatus;
    private client: AxiosInstance;

    constructor(nodeId: string, ip: string, port: number, version: string) {
        this.nodeId = nodeId;
        this.ip = ip;
        this.port = port;
        this.version = version;
        this.status = PeerStatus.UNKNOWN;
        this.client = axios.create({
            baseURL: `http://${this.ip}:${this.port}`,
        });
    }

    public async check(): Promise<boolean> {
        try {
            const response = await this.client.get("/info");
            const info: ValidatorNodeInfo = response.data.data;
            if (info.nodeId === this.nodeId) {
                this.version = info.version;
                this.status = PeerStatus.ACTIVE;
                return true;
            } else {
                this.status = PeerStatus.ABNORMAL;
                return false;
            }
        } catch (e) {
            this.status = PeerStatus.INACTIVE;
            return false;
        }
    }

    public async handshake(): Promise<void> {
        try {
            await this.client.post("/handshake", {
                nodeId: this.nodeId,
                ip: this.ip,
                port: this.port,
                version: this.version,
            });
        } catch (e) {
            this.status = PeerStatus.INACTIVE;
        }
    }

    public async broadcast(data: any): Promise<void> {
        try {
            await this.client.post("/broadcast", data);
        } catch (e) {
            this.status = PeerStatus.INACTIVE;
        }
    }
}

export class Peers {
    public items: Peer[];

    constructor() {
        this.items = [];
    }

    public async check() {
        for (const item of this.items.filter((m) => m.status !== PeerStatus.ABNORMAL)) {
            await item.check();
        }
    }
    public async broadcast(data: any) {
        for (const item of this.items.filter((m) => m.status !== PeerStatus.ACTIVE)) {
            await item.broadcast(data);
        }
    }
}
