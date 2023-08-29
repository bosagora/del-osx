import axios, { AxiosInstance } from "axios";
import { ISubmitData, ITransaction, ValidatorNodeInfo } from "../types";

export enum PeerStatus {
    UNKNOWN,
    ACTIVE,
    INACTIVE,
    ABNORMAL,
}

export interface IPeer {
    nodeId: string;
    index: number;
    endpoint: string;
    version: string;
    status: PeerStatus;
}

export class Peer implements IPeer {
    public nodeId: string;
    public index: number;
    public endpoint: string;
    public version: string;
    public status: PeerStatus;
    private client: AxiosInstance;

    constructor(nodeId: string, index: number, endpoint: string, version: string) {
        this.nodeId = nodeId;
        this.index = index;
        this.endpoint = endpoint;
        this.version = version;
        this.status = PeerStatus.UNKNOWN;
        this.client = axios.create({
            baseURL: endpoint,
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

    public async broadcast(data: ITransaction): Promise<void> {
        try {
            await this.client.post("/broadcast", data);
        } catch (e) {
            this.status = PeerStatus.INACTIVE;
        }
    }

    public async broadcastSubmit(data: ISubmitData): Promise<void> {
        try {
            await this.client.post("/broadcastSubmit", data);
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

    public async broadcast(data: ITransaction) {
        for (const item of this.items.filter((m) => m.status === PeerStatus.ACTIVE)) {
            await item.broadcast(data);
        }
    }

    public async broadcastSubmit(data: ISubmitData) {
        for (const item of this.items.filter((m) => m.status === PeerStatus.ACTIVE)) {
            await item.broadcastSubmit(data);
        }
    }
}
