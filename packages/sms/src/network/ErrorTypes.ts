export class NetworkError extends Error {
    public status: number;

    public statusText: string;

    public statusMessage: string;

    constructor(status: number, statusText: string, statusMessage: string) {
        super(statusText);
        this.name = "NetworkError";
        this.status = status;
        this.statusText = statusText;
        this.statusMessage = statusMessage;
    }
}

export class NotFoundError extends NetworkError {
    constructor(status: number, statusText: string, statusMessage: string) {
        super(status, statusText, statusMessage);
        this.name = "NotFoundError";
    }
}

export class BadRequestError extends NetworkError {
    constructor(status: number, statusText: string, statusMessage: string) {
        super(status, statusText, statusMessage);
        this.name = "BadRequestError";
    }
}

export function handleNetworkError(error: any): Error {
    if (
        error.response !== undefined &&
        error.response.status !== undefined &&
        error.response.statusText !== undefined
    ) {
        let statusMessage: string;
        if (error.response.data !== undefined) {
            if (typeof error.response.data === "string") statusMessage = error.response.data;
            else if (typeof error.response.data === "object" && error.response.data.statusMessage !== undefined)
                statusMessage = error.response.data.statusMessage;
            else if (typeof error.response.data === "object" && error.response.data.errorMessage !== undefined)
                statusMessage = error.response.data.errorMessage;
            else statusMessage = error.response.data.toString();
        } else statusMessage = "";

        switch (error.response.status) {
            case 400:
                return new BadRequestError(error.response.status, error.response.statusText, statusMessage);
            case 404:
                return new NotFoundError(error.response.status, error.response.statusText, statusMessage);
            default:
                return new NetworkError(error.response.status, error.response.statusText, statusMessage);
        }
    } else {
        if (error.message !== undefined) return new Error(error.message);
        else return new Error("An unknown error has occurred.");
    }
}
