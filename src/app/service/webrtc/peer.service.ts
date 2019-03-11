import { Injectable } from '@angular/core';
import { SubjectsService } from '../subjects.service';
import { SDPService } from '../';

@Injectable()
export class PeerService {

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


    public setVideoMode(mode): void {
        this.videoMode = mode;
    }
    public getVideoMode(): string {
        return this.videoMode;
    }

    public sendData(data): Promise<boolean> {
        return new Promise((resolve) => {
            // console.log(this.SendDataConnect);
            for (const key in this.SendDataConnect) {
                if (this.SendDataConnect.hasOwnProperty(key)) {
                    try {
                        // console.log('Do Send Data' + data);
                        this.SendDataConnect[key].send(data);
                    } catch (error) {
                        console.error('Data Send ERROR : ' + error);
                    }
                }
            }
            resolve(true);
        });
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


        // データちゃんねる追加
        try {
            this.SendDataConnect[id] = peer.createDataChannel('label');
            this.SendDataConnect[id].onopen = () => {
                console.log('Send Data Channel OPEN');
            };
            this.SendDataConnect[id].onclose = () => {
                console.log('Send Close Data Channel');
            };
            peer.ondatachannel = (event) => {
                this.ReciveDataConnect[id] = event.channel;
                this.ReciveDataConnect[id].onerror = (error) => {
                    console.error('Data Channel Error : ' + error);
                };
                this.ReciveDataConnect[id].onmessage = (e) => {
                    console.log('SendData : ' + e);
                    this.onDataChannel(e.data);
                };
                this.ReciveDataConnect[id].onopen = () => {
                    console.log('Recive Data Channel OPEN');
                };
                this.ReciveDataConnect[id].onclose = () => {
                    console.log('Recive Close Data Channel');
                };
            };
        } catch (error) {
            console.error(error);
        }

        return peer;
    }

    /**
     * リモートから帰ってきたアンサーSDPをPeerConnectionに登録
     * @param sessionDescription リモートのSDP
     */
    public setAnswer(sessionDescription, id): void {
        if (!this.webRtcConnect[id]) {
            console.error('peerConnection Not exist');
            return;
        }
        this.setRemoteDescription(id, sessionDescription);
    }

    /**
     * リモートから送られてきたオファーSDPをPeerConnectionに登録
     * @param sessionDescription リモートのSDP
     */
    public setOffer(sessionDescription, id): void {
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
    public setRemoteDescription(id, sessionDescription): void {
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
        if (!this.webRtcConnect[id]) {
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
        if (!this.webRtcConnect[id]) {
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
        if (!this.webRtcConnect[id]) {
            this.addConnection(id, this.initPearConnection(id));
            this.webRtcConnect[id].createOffer((offer) => {
                this.webRtcConnect[id].setLocalDescription(offer)
                .then(() => {
                    // console.log(offer);
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
     * データストリームから受け取ったデータをコンポーネントにに投げる
     * @param data データストリームの受け取りデータ
     */
    private onDataChannel(data): void {
        this.subjectService.publish(
            'on_dchannel',
            JSON.parse(data));
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
