import { Injectable } from '@angular/core';
import { SubjectsService } from '../subjects.service';

@Injectable()
export class SupportService {

    private LocalVideoTarget: any;
    private RemoteVideoTarget: any = {};
    private ContributeVideoTarget: any = null;

    private LocalStream: any = null;
    private RemoteStream: any = {};
    private ContributeStream: any = null;

    private webRtcConnect: any = {};
    private ReciveDataConnect: any = {};
    private SendDataConnect: any = {};
    private webRtcMode: any = {};
    // 配信モード 配信：contributor 受信：listener
    private videoMode: string = 'listener';

    private MAX_CONNECTION = 5;
    private dataOptions: any = {
        ordered: true,
        maxRetransmitTime: 3000,
        iceServers: [
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };
    private dataChannelOptions: any = {
        ordered: true,
        maxPacketLifeTime: 3000,
    };
    constructor(
        private subjectService: SubjectsService,
    ) { }


    public getRandomString(len, charSet: string = null): string {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        for (let i = 0; i < len; i++) {
            const randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return randomString;
    }

    public getRandomNumber(len, charSet: string = null): number {
        charSet = charSet || '0123456789';
        let randomString = '';
        for (let i = 0; i < len; i++) {
            const randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return Number(randomString);
    }

    private checkStreamMode(vmode, amode): any {
        let v = null;
        const a = amode;
        if (typeof (vmode) === 'boolean' || vmode === null) {
            if (vmode === null) {
                v = true;
            } else {
                v = vmode;
            }
        } else {
            v = {
                mediaSource: vmode
            };
        }
        return { video: v, audio: a };
    }


    private getConnectionCount(): number {
        return this.webRtcConnect.length;
    }

    private canConnectionMore(): boolean {
        return (this.getConnectionCount() < this.MAX_CONNECTION);
    }

    private isConnectedWith(id): boolean {
        if (!this.webRtcConnect[id]) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * コネクション情報を追加
     * @param id websocketのセッションID
     * @param peer 生成されたPeerConnection
     */
    private addConnection(id, peer): void {
        this.webRtcConnect[id] = peer;
    }

    /**
     * コネクション情報を削除
     * @param id websocketのセッションID
     * @param type 削除モード
     * typeの内訳
     * id：指定IDの削除
     * all：全コネクション情報の削除
     */
    public deleteConnection(id, type = 'id'): void {
        if (type === 'id') {
            delete this.webRtcConnect[id];
        } else if (type === 'all') {
            for (const key in this.webRtcConnect) {
                if (this.webRtcConnect.hasOwnProperty(key)) {
                    delete this.webRtcConnect[key];
                    delete this.ReciveDataConnect[key];
                    delete this.SendDataConnect[key];
                }
            }
        }
    }

    /**
     * websocketIDが登録済み
     * もしくは接続上限か確認
     * @param id websocketのセッションID
     */
    public checkAuthConnection(id): boolean {
        if (this.canConnectionMore()) {
            console.log('TOO MANY connections');
            return false;
        } else if (this.isConnectedWith(id)) {
            console.log('already connected');
            return false;
        }
        return true;
    }

    /**
     * webrtcの接続モードが設定とあっているか確認
     * @param check_mode webrtcの接続モード
     * 接続モード
     * listener：受信専用
     * contributor：配信専用
     */
    public checkMode(check_mode): boolean {
        if (check_mode.includes(this.videoMode)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * GetUserMediaに対応しているか
     */
    public checkScreenShare(): boolean {
        if (typeof (navigator['getUserMedia']) === 'function') {
            return true;
        } else {
            return false;
        }
    }


    /**
     * ストリームデータを変数に格納
     * @param target ローカルかリモートか
     * @param stream 映像ストリーム
     */
    public setStream(target, stream): void {
        if (target === 'local') {
            this.LocalStream = stream;
        } else if (target === 'remote') {
            // 現在未使用
            // this.RemoteStream = stream;
        }
    }


}
