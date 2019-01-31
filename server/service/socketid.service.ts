export class SocketIDService {

    private Sockets: string[] = new Array<string>();

    constructor() {}

    public checkSocketid(id: string): boolean {
        if (this.Sockets[id]) {
            return true;
        } else {
            return false;
        }
    }

    public setSocketid(id: string, data: object): void {
        this.Sockets[id] = data;
    }

    public getSocketid(id: string): string[] {
        return this.Sockets[id];
    }

    public getAllSocketid(): string[] {
        return this.Sockets;
    }

    public deleteSocketid(id: string): void {
        const newSockets: string[] = this.Sockets.filter(n => n !== id);
        this.Sockets = newSockets;
    }

}
