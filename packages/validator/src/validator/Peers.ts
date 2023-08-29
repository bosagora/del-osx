import axios, { AxiosInstance } from "axios";
import { ISubmitData, ITransaction, ValidatorNodeInfo } from "../types";

/**
 * 피어의 상태코드
 */
export enum PeerStatus {
    UNKNOWN,
    ACTIVE,
    INACTIVE,
    ABNORMAL,
}

/**
 * 피어의 데이터구조
 */
export interface IPeer {
    /**
     * 검증자 노드의 아이디(주소)
     */
    nodeId: string;

    /**
     * 검증자의 번호
     */
    index: number;

    /**
     * 검증자의 엔드포인트
     */
    endpoint: string;

    /**
     * 검증자 클라이언트 프로그램의 버전
     */
    version: string;

    /**
     * 피어의 상태코드
     */
    status: PeerStatus;
}

/**
 * 피어의 정보와 메세지 전달 함수를 가지고 있는 클래스
 */
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

    /**
     * 피어의 정보를 조회한다.
     */
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

    /**
     * 요청정보를 전파한다.
     */
    public async broadcast(data: ITransaction): Promise<void> {
        try {
            await this.client.post("/broadcast", data);
        } catch (e) {
            this.status = PeerStatus.INACTIVE;
        }
    }

    /**
     * 인증코드를 전파한다.
     */
    public async broadcastSubmit(data: ISubmitData): Promise<void> {
        try {
            await this.client.post("/broadcastSubmit", data);
        } catch (e) {
            this.status = PeerStatus.INACTIVE;
        }
    }
}

/**
 * 여러 피어들의 정보를 가지고 있는 클래스
 */
export class Peers {
    public items: Peer[];

    constructor() {
        this.items = [];
    }

    /**
     * 피어들의 상태를 확인한다.
     */
    public async check() {
        for (const item of this.items.filter((m) => m.status !== PeerStatus.ABNORMAL)) {
            await item.check();
        }
    }

    /**
     * 요청정보를 전파한다.
     */
    public async broadcast(data: ITransaction) {
        for (const item of this.items.filter((m) => m.status === PeerStatus.ACTIVE)) {
            await item.broadcast(data);
        }
    }

    /**
     * 인증코드를 전파한다.
     */
    public async broadcastSubmit(data: ISubmitData) {
        for (const item of this.items.filter((m) => m.status === PeerStatus.ACTIVE)) {
            await item.broadcastSubmit(data);
        }
    }
}
