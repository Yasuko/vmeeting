import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import * as socketIo from 'socket.io-client';

import { SubjectsService } from './subjects.service';
import { WebSocketService } from './websocket.service';

@Injectable()
export class DrawService {

  public roomname = '';
  public mode = 'master';

  public showBitrate = 0;
  constructor(
      // private janusService: Janus,
      private subjectService: SubjectsService,
      private websocketService: WebSocketService
  ) {
  }

  public setup(): void {
      this.hub();
      // this.setup();
  }

  private hub(): void {
      this.subjectService.on('sys')
      .subscribe((msg: any) => {
        console.log(msg);
      });
      this.subjectService.on('on_' + this.roomname)
      .subscribe((msg: any) => {
          if (this.mode === 'master' && msg['msg'] === 'new_client') {
              this.websocketService.send(
                  this.roomname,
                  {
                      msg: 'connectionid',
                      data: this.roomname
                  }
              );
          }
      });
  }

  private socketHub(msg: any): void {
      if (msg['msg'] === 'connectionid') {
      } else if (msg['msg'] === 'text') {

      } else if (msg['msg'] === 'draw') {

      } else if (msg['msg'] === 'image') {

      }
  }
}
