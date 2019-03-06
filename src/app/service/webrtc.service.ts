// import { Observable } from 'rxjs';
import { Injectable, ViewChild } from '@angular/core';
// import * as socketIo from 'socket.io-client';

import { SubjectsService } from './subjects.service';
// import { PercentPipe } from '@angular/common';

@Injectable()
export class WebRTCService {

    private LocalVideoTarget: any;
    private RemoteVideoTarget: any = {};
    private ContributeVideoTarget: any = null;

    private LocalStream: any = null;
    private RemoteStream: any = {};
    private ContributeStream: any = null;

    private webRtcConnect: any = {};
    private webRtcMode: any = {};
    // 配信モード 配信：contributor 受信：listener
    private videoMode: string = 'listener';

    private MAX_CONNECTION = 3;
    private dataOptions: any = {
      ordered:  true,
      maxRetransmitTime:  3000,
      iceServers: [
        {urls: 'stun:stun2.l.google.com:19302'}
      ]
    };

    private recorder: MediaRecorder;
    private recordData = [];
    private recordeTarget: any;
    private recordeURL: any;

    constructor(
        private subjectService: SubjectsService
    ) {}

    /**
     * 録画開始
     * @param time 録画時間
     * デフォルトで録画時間は10秒
     * コーデックはvp9
     * ビットレート　512kにて録画される
     */
    public startRecord(time: number = 1000): void {
      const options = {
        videoBitsPerSecond : 512000,
        mimeType : 'video/webm; codecs=vp9'
      };
      this.recorder = new MediaRecorder(this.LocalStream, options);
      this.recorder.ondataavailable = (result) => {
        this.recordData.push(result.data);
      };
      this.recorder.start(time);
    }
    /**
     * 録画停止
     */
    public stopRecord(): void {
      this.recorder.onstop =  (result) => {
        this.recorder = null;
      };
      this.recorder.stop();
    }

    /**
     * 録画映像の再生先登録
     * @param target 録画再生ターゲットDOM
     */
    public setRecordePlayer(target): void {
      this.recordeTarget = target;
    }
    /**
     * 録画の再生
     */
    public plyaRecord(): void {
      const videoBlob = new Blob(this.recordData, { type: 'video/webm'});
      this.recordeURL = window.URL.createObjectURL(videoBlob);

      if (this.recordeTarget.src) {
        window.URL.revokeObjectURL(this.recordeTarget.src);
        this.recordeTarget.src = null;
      }
      this.recordeTarget.src = this.recordeURL;
      this.recordeTarget.play();
    }

    /**
     * 録画データのDL用URL取得
     */
    public getRecordeURL(): string {
      return this.recordeURL;
    }

    /**
     * ローカルストリームの取得
     */
    public getLocalStream(vmode: any = null, amode: boolean = false): Promise<boolean> {
      return new Promise((resolve, reject) => {
        const mode = this.checkStreamMode(vmode, amode);
        navigator.mediaDevices.getUserMedia({
          video: mode.video,
          // video: {facingMode: 'user'},
          audio: mode.audio
        }).then((stream: MediaStream) => {
          // this.localStream = stream;
          console.log('Set Local Stream');
          this.setStream('local', stream);
          resolve(true);
        }).catch((error) => {
          console.log(error);
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
      if (typeof(vmode) === 'boolean' || vmode === null) {
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
      return {video: v, audio: a};
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
      if (typeof(navigator['getUserMedia']) === 'function') {
        return true;
      } else {
        return false;
      }
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
      } else if (element === 'contributor')  {
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
     * PeerConnection新規作成
     * @param id クライアントID
     */
    private initPearConnection(id): any {
      let peer: any = null;
      // PeerConnection新規作成
      try {
        peer = new RTCPeerConnection(this.dataOptions);
      } catch (error) {
        console.log('Failed to create PeerConnection', error);
      }
      if ('ontrack' in peer) {
        peer.ontrack = (event) => {
          if (this.checkMode(['listener'])) {
            this.ContributeStream = event.streams[0];
            this.playVideo('contributor');
          } else {
            this.RemoteStream[id] = event.streams[0];
            this.playVideo('remote', id);
          }
        };
      } else {
        if (this.checkMode(['listener'])) {
          peer.onaddstream = (event) => {
            console.log('Start Play Screen');
            this.ContributeStream = event.streams[0];
            this.playVideo('contributor');
          };
        } else if (this.checkMode(['contributor'])) {
          peer.onaddstream = (event) => {
            console.log('Start Remote Audio');
            this.RemoteStream[id] = event.streams[0];
            this.playVideo('remote', id);
          };
        }
      }
      peer.onicecandidate = (evt) => {
        if (evt.candidate) {
          this.sendIceCandidate(evt.candidate, id);
        } else {
          console.log('empty ice event');
        }
      };

      peer.oniceconnectionstatechange = () => {
        console.log('== ice connection status=' + peer.iceConnectionState);
        if (peer.iceConnectionState === 'disconnected') {
          console.log('-- disconnected --');
          this.hungUp();
        }
      };

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
        if (this.checkMode(['contributor', 'listener'])) {
          console.log('Receive offer');
          sdp = this.sdpStripper(sdp);
          const offer = new RTCSessionDescription(sdp);
          this.setOffer(offer, id);
        }
      // アンサーの受け取り
      } else if (sdp['type'] === 'answer') {
        console.log('Receive answer');
        if (this.checkMode(['contributor', 'listener'])) {
          console.log('Receive answer');
          const answer = new RTCSessionDescription(sdp);
          this.setAnswer(answer, id);
        }
      // アイスの受け取り
      } else if (sdp['type'] === 'candidate') {
        console.log('Received ICE candidate');
        const candidate = new RTCIceCandidate(sdp['data']);
        this.setIceCandidate(candidate, id);
      }
    }

    /**
     * SDP情報から不要なコーデック情報を削除し再パッケージする
     * @param sdp SDP
     * 現在固定機能で「VP8」「VP9」を削除
     */
    private sdpStripper(sdp): object {
      const _sdp = sdp['sdp'].split(/\r\n|\r|\n/);
      const _conv = [];
      const deleteCode = this.sdpSplitVideoCodeIndex(_sdp, ['VP8', 'VP9']);
      // const deleteCode = this.sdpSplitVideoCodeIndex(_sdp, []);
      // 削除コーデックが宣言されている行を削除
      const codeCheck = (s) => {
        let result = false;
        for (const i in deleteCode) {
          if (deleteCode.hasOwnProperty(i)) {
            if (s.match('\\:' + String(deleteCode[i])) !== null) {
              result = true;
            }
          }
        }
        return result;
      };
      // videoコーデックのペイロード一覧から不要なものを消す
      const deleteIndex = (s) => {
        console.log(deleteCode);
        for (const i in deleteCode) {
          if (deleteCode.hasOwnProperty(i)) {
            s = s.replace(deleteCode[i] + ' ', '');
          }
        }
        return s;
      };

      // SDP整形処理
      for (const key in _sdp) {
        if (_sdp.hasOwnProperty(key)) {
          if (_sdp[key].match('m\\=video') !== null) {
            _sdp[key] = deleteIndex(_sdp[key]);
            _conv.push(_sdp[key]);
          } else if (!codeCheck(_sdp[key])) {
            _conv.push(_sdp[key]);
          }
        }
      }
      // 整形済みのSDPをオブジェクトに戻す
      sdp['sdp'] = _conv.join('\r\n');
      return sdp;
    }

    /**
     * 削除コーデックのペイロード番号を取得
     * 削除コーデックのRTXペイロードも取得
     * @param sdp 配列変換されたsdpデータ
     * @param codec 削除対象のコーデック
     */
    private sdpSplitVideoCodeIndex(sdp, codec): object {
      const index = [];
      const apt = [];

      const codec_check = codec.join('|');
      for (const key in sdp) {
        if (sdp.hasOwnProperty(key)) {
          if (sdp[key].match(('apt=')) !== null) {
            apt.push(sdp[key]);
          }
          if (sdp[key].match(codec_check) !== null) {
            index.push(this.stlipCodecIndex(sdp[key]));
　        }
        }
      }
      const apt_check = index.join('|');
      for (const key in apt) {
        if (apt.hasOwnProperty(key)) {
          if (apt[key].match(apt_check) !== null) {
            const apt_index = this.stplipAPTIndex(apt[key]);
            if (!index.includes(apt_index)) {
              index.push(apt_index);
            }
          }
        }
      }
      return index;
    }

    /**
     * SDPからコーデック情報を取得
     * @param codec コーデック
     */
    private stlipCodecIndex(codec): number {
      const _co = codec.split(' ');
      const _co2 = _co[0].split(':');
      return Number(_co2[1]);
    }

    /**
     * @param sdp
     */
    private stplipAPTIndex(sdp): number {
      const _apt = sdp.split(' ');
      const _apt2 = _apt[0].split(':');
      return Number(_apt2[1]);
    }

    /**
     * リモートから帰ってきたアンサーSDPをPeerConnectionに登録
     * @param sessionDescription リモートのSDP
     */
    private setAnswer(sessionDescription, id): void {
      if (! this.webRtcConnect[id]) {
        console.error('peerConnection Not exist');
        return;
      }
      this.setRemoteDescription(id, sessionDescription);
    }

    /**
     * リモートから送られてきたオファーSDPをPeerConnectionに登録
     * @param sessionDescription リモートのSDP
     */
    private setOffer(sessionDescription, id): void {
      if (this.webRtcConnect[id]) {
        console.error('peerConnection already exist');
      }
      this.addConnection(id, this.initPearConnection(id));
      this.setRemoteDescription(id, sessionDescription);
    }

    /**
     * SDP情報をPeerConnectionに格納
     * @param id websocketのセッションID
     * @param sessionDescription SDP情報
     */
    private setRemoteDescription(id, sessionDescription): void {
      this.webRtcConnect[id].setRemoteDescription(sessionDescription)
        .then(() => {
          console.log('setremoveDescription success');
          this.makeAnswer(id);
        }).catch((err) => {
          console.error('setremoteDescription ERROR', err);
        });
    }

    /**
     * リモートから送られてきたICE情報をPeerConnectionに登録
     * @param sessionDescription ice情報を含めたSDP
     */
    private setIceCandidate(sessionDescription, id): void {
      // console.log(this.webRtcConnect[id]);
      if (! this.webRtcConnect[id]) {
        console.error('PeerConnection not exist');
        return;
      }
      this.webRtcConnect[id].addIceCandidate(sessionDescription);
    }

    /**
     * ICE情報情報をリモートに送る
     * @param candidate ICE情報
     */
    private sendIceCandidate(candidate, id): void {
      console.log('sending ICE candidate');
      const data = {
        type: 'candidate',
        data: candidate
      };
      this.publish(id, data, 'candidate');
    }
    /**
     * 空のWebsocketセッションIDを登録
     * @param id websocketセッションID
     */
    public setNullID(id): void {
      if (! this.webRtcConnect[id]) {
        this.webRtcConnect[id] = {};
        this.webRtcMode[id] = {};
      }
    }
    /**
     * オファー作成
     * peerconnectionの作成とイベントを登録し
     * 接続待受の準備が出来た後にオファー情報を作成
     */
    public makeOffer(id): void {
      let options = {};
      if (this.videoMode === 'contributor') {
        console.log(this.videoMode);
        options = {
          mandatory: {
            'OfferToReceiveAudio': true,
            'OfferToReceiveVideo': false
          }
        };
      }
      if (! this.webRtcConnect[id]) {
        this.addConnection(id, this.initPearConnection(id));
        this.webRtcConnect[id].createOffer((offer) => {
          this.webRtcConnect[id].setLocalDescription(offer)
          .then(() => {
            console.log(offer);
              this.publish(id, offer);
          });
        }, (error) => {
          console.log(error);
        }, options);
      } else {
        console.log('peer already exist');
      }
    }

    /**
     * アンサー作成
     * 自身のPeerConnectionが済んでいること
     * 受け取ったオファーからアンサー情報を作成
     */
    private makeAnswer(id): void {
      console.log('send Answer');
      if (!this.webRtcConnect[id]) {
        console.error('peerConnection Not exist');
        return;
      }
      this.webRtcConnect[id].createAnswer()
        .then((sessionDescription) => {
          console.log('setLocalDescription');
          this.webRtcConnect[id].setLocalDescription(sessionDescription)
            .then(() => {
              this.publish(id, sessionDescription);
            });
        }).catch((err) => {
          console.error(err);
        });
    }

    /**
     * 更新された各種情報をObserbableに配信
     * @param id websocketセッションID
     * @param data 送信するデータ
     * @param type データタイプ
     */
    private publish(id, data, type: string = ''): void {
      this.subjectService.publish(
        'on_webrtc',
        {
          job: 'send_sdp',
          id: id,
          data: JSON.stringify(data),
          type: type
        });
    }

    /**
     * WebRTCコネクション切断
     */
    public hungUp(): void {
      if (this.webRtcConnect) {
        console.log('hung up');
        this.webRtcConnect.close();
        this.webRtcConnect = null;
      } else {
        console.log('peer not exist');
      }
    }


}
