import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import * as socketIo from 'socket.io-client';

import { SubjectsService } from './subjects.service';


@Injectable()
export class WebSocketService {

    // private server: string = 'http://localhost:3000/';
    private server: string = 'https://yasukosan.dip.jp:3000/';
    // private server: string = 'https://moriya.uzaking.uza:3000/';
    private socket;
    ioConnection: any;

    private groupname: string = 'test';
    private roomname: string = 'test1';
    private username: string = 'ゲスト';

    private connected: boolean = false;

    constructor(
        private subjectService: SubjectsService
    ) {}

   /**
     * websocketオブジェクト作成
     */
    private initSocket(): void {
      this.socket = socketIo(
        this.server + this.roomname,
        {
          secure: true
        });
    }

    public initial(events: object): void {
        this.initSocket();

        for (const key in events) {
          if (events.hasOwnProperty(key)) {
            this.onData(events[key]);
          }
        }

        this.onSys();
        this.onEvent('connect')
          .subscribe(() => {
            console.log('Connected');
            this.join();
            this.connected = true;
          });
        this.onEvent('disconnect')
          .subscribe(() => {
            console.log('Disconnect');
            this.disconnect();
            this.connected = false;
          });
      }

      public getConnectStatus(): boolean {
          return this.connected;
      }

      public connection(events: object): void {
        this.initial(events);
      }

      public setRoom(room: string): void {
        this.roomname = room;
      }

      public setGroup(group: string): void {
        this.groupname = group;
      }
      public setName(name: string): void {
        this.username = name;
      }

      /**
       * websocket切断
       */
      public disconnect(): void {
        if (this.socket.connected) {
            this.socket.disconnect();
            this.connected = false;
        }
      }
      /**
       * 部屋に入る
       */
      public join(): void {
        this.socket.emit('join',
        {
          'group' : this.groupname,
          'target': 'group',
          'name': this.username
        });
      }

      public send(tag: string, message: any): void {
        this.socket.emit(
          tag,
          {
            'data': message,
            'group' : this.groupname,
            'target': 'group'
          }
        );
      }

      public onSys(): void {
        new Observable<any>(observer => {
          this.socket.on('sys', (data: any) => observer.next(data));
        }).subscribe((result) => {
            if (result['job'] === 'join') {
              this.subjectService
              .publish('on_join', result);
            } else if (result['job'] === 'replicate') {
              this.subjectService
              .publish('on_replicate', result);
            } else if (result['job'] === 'leave') {
              this.subjectService
              .publish('on_leave', result);
            }
        });

      }

      /**
       * websocketの受け取りイベント登録
       * @param tag イベント名
       */
      public onData(tag: string): void {
        new Observable<any>(observer => {
          this.socket.on(tag, (data: any) => observer.next(data));
        }).subscribe(
          (image: any) => {
            this.subjectService
              .publish('on_' + tag, image);
          });
      }
      /**
       * 接続、切断等オフィシャルイベントの受け取り用
       * @param event イベント名
       */
      public onEvent(event: string): Observable<string> {
        return new Observable<string>(observer => {
          this.socket.on(event, () => observer.next());
        });
      }
}
