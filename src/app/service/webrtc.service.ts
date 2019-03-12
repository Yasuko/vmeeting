import { Injectable } from '@angular/core';
import { SubjectsService } from './subjects.service';
import {
    RecorderService, SDPService,
    PearService
} from './';
import { SupportService } from './webrtc/support.service';

@Injectable()
export class WebRTCService {

    private LocalVideoTarget: any;
    private RemoteVideoTarget: any = {};
    private ContributeVideoTarget: any = null;

    private LocalStream: any = null;
    private RemoteStream: any = {};
    private ContributeStream: any = null;

    private SendDataConnect: any = {};
    // 配信モード 配信：contributor 音だけ：audio　受信：listener
    private videoMode: string = 'listener';

    constructor(
        private recordeService: RecorderService,
        private pearService: PearService,
        private sdpService: SDPService,
        private supportService: SupportService
    ) { }

    /**
     * 録画開始
     * @param time 録画時間
     */
    public startRecord(time: number = 1000): void {
        this.recordeService.startRecord(time);
    }
    /**
     * 録画停止
     */
    public stopRecord(): void {
        this.recordeService.stopRecord();
    }
    /**
     * 録画映像の再生先登録
     * @param target 録画再生ターゲットDOM
     */
    public setRecordePlayer(target): void {
        this.recordeService.setRecordePlayer(target);
    }
    /**
     * 録画の再生
     */
    public plyaRecord(): void {
        this.recordeService.plyaRecord();
    }

    /**
     * 録画データのDL用URL取得
    */
    public getRecordeURL(): string {
        return this.recordeService.getRecordeURL();
    }

    /**
     * ローカルストリームの取得
     */
    public getLocalStream(vmode: any = null, amode: boolean = false): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const mode = this.checkStreamMode(vmode, amode);
            if (!vmode && !amode) {
                reject(false);
            }
            navigator.mediaDevices.getUserMedia({
            // navigator.mediaDevices['getDisplayMedia']({
                video: mode.video,
                // video: {facingMode: 'user'},
                audio: mode.audio
            }).then((stream: MediaStream) => {
                // this.localStream = stream;
                console.log('Set Local Stream');
                this.setStream('local', stream);
                resolve(true);
            }).catch((error) => {
                console.error(error);
                reject(false);
            });
        });
    }

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

    /**
     * websocketIDが登録済み
     * もしくは接続上限か確認
     * @param id websocketのセッションID
     */
    public checkAuthConnection(id): boolean {
        return this.pearService.checkAuthConnection(id);
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
        return this.supportService.checkScreenShare();
    }

    /**
     * MediaDeviceが利用可能か
     */
    public checkMediaDevice(): Promise<object> {
        return new Promise((resolve) => {
            this.supportService.checkMediaDevice()
            .then((result) => {
                resolve(result);
            });
        });
    }

    /**
     * ビデオタグのDOMオブジェクトを登録
     * @param local ローカル用ビデオタグ
     */
    public setVideoTarget(local): void {
        this.LocalVideoTarget = local;
    }
    public setRemoteVideoTarget(element, id): void {
        this.RemoteVideoTarget[id] = element;
    }
    public setContributorTarget(element): void {
        this.ContributeVideoTarget = element;
        console.log(this.ContributeVideoTarget);
    }
    public setVideoMode(mode): void {
        this.videoMode = mode;
    }
    public getVideoMode(): string {
        return this.videoMode;
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

    /**
     * ビデオ再生
     * @param element ローカル映像かリモート映像か
     * @param id クライアントID
     */
    public playVideo(element, id = 0) {
        let videoTarget: any = '';
        if (element === 'local') {
            videoTarget = this.LocalVideoTarget;
            videoTarget.srcObject = this.LocalStream;
            videoTarget.volume = 0;
        } else if (element === 'contributor') {
            videoTarget = this.ContributeVideoTarget;
            videoTarget.srcObject = this.ContributeStream;
        } else if (element === 'remote') {
            // 自身が配信者、相互通信中の場合
            videoTarget = this.RemoteVideoTarget[id];
            videoTarget.srcObject = this.RemoteStream[id];
        }
        // ストリーム再生
        videoTarget.play();
    }

    /**
     * データチャンネルでデータ送信
     * @param data 送信データ
     */
    public sendData(data): boolean {
        return this.pearService.sendData(data);
    }

    /**
     * PeerConnection新規作成
     * @param id クライアントID
     */
    private NewPearConnection(id): any {
        const peer: any = this.pearService.initPearConnection(id);
        if ('ontrack' in peer) {
            peer.ontrack = (event) => {
                if (this.checkMode(['audio', 'listener'])) {
                    this.ContributeStream = event.streams[0];
                    this.playVideo('contributor');
                } else {
                    this.RemoteStream[id] = event.streams[0];
                    this.playVideo('remote', id);
                }
            };
        }
        // ローカルストリームの追加
        if (this.LocalStream) {
            // if (this.checkMode(['contributor'])) {
            console.log('Add local stream');
            peer.addStream(this.LocalStream);
            // }
        } else {
            console.warn('no local stream');
        }
        return peer;
    }

    /**
     * websocketからイベント受け取り
     * @param tag イベント名
     */
    public onSdpText(sdp: any, id: any): void {
        // オファーの受け取り
        if (sdp['type'] === 'offer') {
            if (this.checkMode(['contributor', 'audio', 'listener'])) {
                console.log('Receive offer');
                sdp = this.sdpStripper(sdp);
                const offer = new RTCSessionDescription(sdp);
                const peer = this.NewPearConnection(id);
                this.pearService.setOffer(offer, id, peer);
            }
        // アンサーの受け取り
        } else if (sdp['type'] === 'answer') {
            console.log('Receive answer');
            if (this.checkMode(['contributor', 'audio'])) {
                console.log('Receive answer');
                const answer = new RTCSessionDescription(sdp);
                this.pearService.setAnswer(answer, id);
            }
        // アイスの受け取り
        } else if (sdp['type'] === 'candidate') {
            console.log('Received ICE candidate');
            const candidate = new RTCIceCandidate(sdp['data']);
            this.pearService.setIceCandidate(candidate, id);
        }
    }

    /**
     * SDP情報から不要なコーデック情報を削除し再パッケージする
     * @param sdp SDP
     * 現在固定機能で「VP8」「VP9」を削除
     */
    private sdpStripper(sdp): object {
        return this.sdpService.sdpStripper(sdp);
    }

    /**
     * オファー作成
     * peerconnectionの作成とイベントを登録し
     * 接続待受の準備が出来た後にオファー情報を作成
     */
    public makeOffer(id): void {
        const options = {};
        /*
        if (this.videoMode === 'contributor') {
            console.log(this.videoMode);
            options = {
                mandatory: {
                'OfferToReceiveAudio': true,
                'OfferToReceiveVideo': false
                }
            };
        }*/
        const peer = this.NewPearConnection(id);
        this.pearService.makeOffer(id, options, peer);
    }

    /**
     * WebRTCコネクション切断
     */
    public hungUp(): void {
        this.pearService.hungUp();
    }


}
