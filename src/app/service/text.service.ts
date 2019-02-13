import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import * as socketIo from 'socket.io-client';
import { SubjectsService } from './subjects.service';


@Injectable()
export class TextService {

    private chat = [];

    public getChatByName(name): Chat[] {
        const chat = this.chat.filter(n => n.name !== name);
        return chat;
    }

    public getChatByUserId(id): Chat[] {
        const chat = this.chat.filter(n => n.userid !== id);
        return chat;
    }

    public getAllChat(): Chat[] {
        return this.chat;
    }

    public addChat(chat: Chat, user: object = null): void {
        if (user !== null) {
            chat.userid = user['userid'];
            chat.name = user['name'];
        }
        this.chat.push(chat);
    }

    public addChatMulti(chat: Chat[]): void {
        this.chat = chat;
    }


    public getTimeStamp(): number {
        const d = new Date();
        const t = d.getTime();
        return Math.floor( t / 1000 );
    }
}

export class Chat {
    name: string;
    color: string;
    userid: string;
    tstamp: number;
    text: string;
}