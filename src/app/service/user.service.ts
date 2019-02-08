import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import * as socketIo from 'socket.io-client';
import { SubjectsService } from './subjects.service';

@Injectable()
export class UserService {

    private users: User[];

    public addUser(user: User): void {
        this.users.push(user);
    }
    public addMultiUser(users: User[]): void {
        this.users = users;
    }
    public delUser(name: string): void {
        const users = this.users.filter(n => n.name !== name);
        this.users = users;
    }

    public getUserByName(name: string): User {
        const users = this.users.filter(n => n.name === name);
        return users[0];
    }
    public getUserById(id: string): User {
        const users = this.users.filter(n => n.userid === id);
        return users[0];
    }
    public getAllUser(): User[] {
        return this.users;
    }
}

export class User {
    name: string;
    userid: string;
}
