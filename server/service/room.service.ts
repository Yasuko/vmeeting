
export class RoomService {

    private Rooms: string[] = new Array<string>();
    constructor() {

    }

    public setRoom(room: string): void {
        this.Rooms.push(room);
    }

    public getAllRoom(): string[] {
        return this.Rooms;
    }

    public deleteRoom(room: string): void {
        const newRooms: string[] = this.Rooms.filter(n => n !== room);
        this.Rooms = newRooms;
    }

}
