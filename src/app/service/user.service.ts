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

    public getIndexByName(name: string): number {
        const index = this.users.filter((n, i, a) => {
            if (n.name === name) {
                return i;
            }
        });
        return Number(index[0]);
    }

    public getAllUser(): User[] {
        return this.users;
    }


    public getColor(): string {
        let color = Math.floor(Math.random() * 0xFFFFFF).toString(16);
        for (let count = color.length; count < 6; count++) {
            color = '0' + color;
        }
        const randomColor = '#' + color;

        return randomColor;
    }
}

export class User {
    name: string;
    userid: string;
    color: string;
}
