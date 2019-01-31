
export class NameSpaceService {

    private NameSpaces: string[] = new Array<string>();
    constructor() {

    }

    public checkNameSpace(name: string): boolean {
        return this.NameSpaces.includes(name);
    }

    public setNameSpace(name: string): void {
        this.NameSpaces.push(name);
    }

    public getAllNameSpace(): string[] {
        return this.NameSpaces;
    }

    public deleteNameSpace(name: string): void {
        const newNameSpaces: string[] = this.NameSpaces.filter(n => n !== name);
        this.NameSpaces = newNameSpaces;
    }

}
