import { Component, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import {
    SubjectsService, ImageService,
    WebSocketService, MouseService,
    WebRTCService
} from '../service';
import {
    UserService, ContentService, TextService,
    StoryService, FileService
} from '../service';
import { ImageSaveService } from '../_lib_service';

@Component({
  selector: 'app-screen',
  templateUrl: './screen.component.html',
  styleUrls: [
      '../app.component.css',
      './screen.component.scss'
    ]
})

export class ScreenComponent implements OnInit {

    private URL = 'http://happypazdra.dip.jp:8088/janus';
    private URLS = 'https://happypazdra.dip.jp:8089/janus';

    private screen = null;
    private server = null;
    private videoElement = null;
    private remoteElement = [];

    private audioBox = document.getElementById('audioBox');

    public onStart = false;
    public onwebrtcUp = false;

    public capture = '';
    public desc = '';
    public myusername = '';
    public feeds = [];
    public roomid: Number = 0;
    public room: Number = 0;
    public role = '';

    public name = 'Guest';
    public userColor = '';

    // テキストチャット
    public chatMess = '';

    // ドラッグ、ドロップ
    public onDrag = false;
    public Reader: FileReader = null;

    // キャプチャ編集
    private canvasID = 'artbox';
    private canvasBase: HTMLCanvasElement;
    private ctx;

    private captureEditerID = 'editbox';
    private captureLayerID = 'layerbox';

    canvasColorList = [
      '#E60012', '#F39800', '#FFF100', '#8FC31F', '#009944',
      '#00A0E9', '#1D2088', '#E4007F', '#E5004F',
      '#808080', '#000000', '#FFFFFF'
    ];

    canvasLineColor = '#555555';
    canvasLineCap = 'round';
    canvasLineWidth = 4;
    canvasAlpha = 1;

    public session = '';
    public title = '';

    public source = null;

    public editCaptureTarget = 0;

    public myvideoState = {
        'width': 1024,
        'height': 600,
        'muted': 'muted',
    };
    public peervideoState = {
        'width': 320,
        'height': 240,
    };

    public roomname = '';
    public mode = 'contributor';

    public showBitrate = 0;
    constructor(
        // private janusService: Janus,
        private renderer2: Renderer2,
        private router: ActivatedRoute,
        private subjectService: SubjectsService,
        private imageService: ImageService,
        private websocketService: WebSocketService,
        private webrtcService: WebRTCService,
        private mouseService: MouseService,
        private userService: UserService,
        private contentService: ContentService,
        private textService: TextService,
        private storyService: StoryService,
        private fileService: FileService,
        private imageSaveService: ImageSaveService
    ) {
    }

    ngOnInit(): void {
        this.initial();
        // this.setup();
        this.setRoomName();
    }

    private hub(): void {
        this.subjectService.on('on_leave')
        .subscribe((msg: any) => {
          console.log(msg);
          this.userService.delUserByUserId(msg['data']['id']);
        });
        this.subjectService.on('on_allusers')
        .subscribe((msg: any) => {
            console.log(msg);
            this.userService.addMultiUser(msg);
        });
        this.subjectService.on('pub_file_send')
        .subscribe((msg: any) => {
            const data = {
                msg: 'file_send',
                data: msg
            };
            this.webrtcService.sendData(JSON.stringify(data));
        });
        this.subjectService.on('on_webrtc')
        .subscribe((msg: any) => {
            this.webrtcManager(msg);
        });
        this.subjectService.on('on_dchannel')
        .subscribe((msg: any) => {
            this.socketHub(msg);
        });
        this.subjectService.on('on_' + this.roomname)
            .subscribe((msg: any) => {
                if (this.mode === 'contributor' && msg['msg'] === 'new_client') {
                    this.websocketService.send(
                        this.roomname,
                        {
                            msg: 'connectionid',
                            data: this.roomname
                        }
                    );
                } else {
                    this.socketHub(msg);
                }
            });
    }

    private socketHub(msg: any): void {
        if (msg['msg'] === 'connectionid') {
            if (this.roomid === 0) {
                this.roomid = msg['data'];
            }
        } else if (msg['msg'] === 'text') {
            console.log(msg);
            this.textService.addChat(msg['data']);
        } else if (msg['msg'] === 'draw') {
            this.pointer(msg['data']['position']);
            // console.log(msg);
        } else if (msg['msg'] === 'file_send') {
            this.fileService.addRemoteFile(msg['data']);
            const data = {
                msg: 'sys',
                state: 'file_get'
            };
            this.webrtcService.sendData(JSON.stringify(data));
        } else if (msg['msg'] === 'webrtc') {
            this.webrtcManager(msg);
        } else if (msg['msg'] === 'sys') {
            if (msg['state'] === 'file_get') {
                this.fileService.checkSend();
            }
        }
    }

    private setRoomName(): void {
        const room = this.router.snapshot.queryParams;
        if (room.hasOwnProperty('room')) {
            console.log(room);
            this.roomname = room['room'];
            // ゲスト接続の場合にroomname要求
            this.mode = 'listener';
        }
    }

    private setupSocket(): void {
        this.websocketService.setColor(this.userColor);
        this.websocketService.setRoomName(this.roomname);
        this.websocketService.setNameSpace('test1');
        this.websocketService.setName(this.name);
        this.websocketService.connection(
            [
                this.roomname, 'allusers'
            ]
        );
    }

    private getConnectionCode(): void {
        console.log('send mes ' + this.roomname);
        this.websocketService.send(
            this.roomname,
            {
                msg: 'new_client'
            }
        );
    }

    /**
     * チャット
     */
    public getChatData(): object {
        return this.textService.getAllChat();
    }

    public sendChatByEnter(event): void {
        if (event.hasOwnProperty('charCode')) {
            const theCode = event.charCode;
            if (theCode === 13) {
                this.sendChat();
            }
        }
        return;
    }
    public sendChat(): void {
        this.textService.addChat({
            text: this.chatMess,
            tstamp: this.textService.getTimeStamp(),
            name: this.name,
            color: this.userColor,
            userid: ''
        });
        const data = {
            msg: 'text',
            data: {
                name: this.name,
                text: this.chatMess,
                tstamp: this.textService.getTimeStamp()
            }
        };
        this.webrtcService.sendData(JSON.stringify(data));
        this.chatMess = '';
    }

    public onDragOverHandler(e: any): void {
        e.preventDefault();
        this.onDrag = true;
    }

    public onDragLeaveHandler(e: any): void {
        e.stopPropagation();
        this.onDrag = false;
    }

    public onSelectHandler(e: any): void {
        this.onDrag = false;
        e.preventDefault();
        this.fileService.getDragFile(e);
    }

    public getAllImage(): object {
        return this.fileService.getAllImage();
    }
    public getAllFile(): object {
        return this.fileService.getAllFile();
    }
    public getIcon(type): string {
        return this.fileService.getIcon(type);
    }

    public saveFile(target, index): void {
        let file: any = {};
        if (target === 'image') {
            file = this.fileService.getImageByIndex(index);
        } else {
            file = this.fileService.getFileByIndex(index);
        }
        console.log(file);
        this.imageSaveService.setParam(
            file.name,
            file.type,
            file.data
        );
        this.imageSaveService.saveImage();
    }
    /**
     *
     * お絵かき
     *
     */
    private setMouseEvent(): void {
        console.log('start art box');
        this.canvasBase = <HTMLCanvasElement> document.getElementById(this.canvasID);
        this.ctx = this.canvasBase.getContext('2d');
        this.ctx.clearRect(0, 0, this.myvideoState.width, this.myvideoState.height);

        const rect = this.canvasBase.getBoundingClientRect();
        console.log(rect);
        // this.mouseService.setCorrection(rect);

        this.canvasBase.addEventListener('mousedown', (e: MouseEvent) => {
            this.mouseService.setStartPosition(e);
        });
        this.canvasBase.addEventListener('mouseup', (e) => {
            this.ctx.clearRect(0, 0, this.myvideoState.width, this.myvideoState.height);
            this.mouseService.end(e);
        });
        this.canvasBase.addEventListener('mousemove', (e: MouseEvent) => {
            this.mouseMoveJob(e);
        });
        this.canvasBase.addEventListener('touchstart', (e) => {
            this.mouseService.setStartPosition(e);
        });
        this.canvasBase.addEventListener('touchend', (e) => {
            this.mouseService.end(e);
        });
        this.canvasBase.addEventListener('touchmove', (e) => {
            this.mouseMoveJob(e);
        });
    }
    private mouseMoveJob(e): void {
        if (this.mouseService.getMoveFlag()) {
            this.mouseService.mouseMove(e);
            const position = this.buildDrawStatus(this.mouseService.getMousePosition());
            this.pointer(position);
            const data = {
                msg: 'draw',
                data: {
                    'position': position
                }
            };
            this.webrtcService.sendData(JSON.stringify(data));
            /*this.websocketService.send(
                this.roomname,
                {
                    msg: 'draw',
                    data: {
                        'position': position
                    }
                }
            );*/
        }
    }


    /**
     * キャンバスに絵を書く
     * @param mouse_position array
     */
    private draw(mouse_position): void {
        this.ctx.beginPath();
        this.ctx.moveTo(
            mouse_position['startx'], mouse_position['starty']
        );
        this.ctx.lineTo(
            mouse_position['movex'], mouse_position['movey']
        );
        this.ctx.lineCap = mouse_position['linecap'];
        this.ctx.lineWidth = mouse_position['linewidth'];
        this.ctx.strokeStyle = mouse_position['linecolor'];
        this.ctx.stroke();
    }
    /**
     * マウスカーソルの表示
     * @param mouse_position array
     */
    private pointer(mouse_position): void {
        this.ctx.clearRect(0, 0, this.myvideoState.width, this.myvideoState.height);
        this.ctx.beginPath();
        this.ctx.arc(mouse_position['movex'], mouse_position['movey'], 20, 0, Math.PI * 2, false);
        this.ctx.lineCap = mouse_position['linecap'];
        this.ctx.lineWidth = mouse_position['linewidth'];
        this.ctx.strokeStyle = mouse_position['linecolor'];
        this.ctx.stroke();
        this.ctx.font = 'italic 10px Arial';
        this.ctx.fillStyle = mouse_position['linecolor'];

        this.ctx.fillText(mouse_position['name'], mouse_position['movex'] + 20, mouse_position['movey'] - 15);
    }
    /**
    * キャンバスに描く内容と描画オプションを結合
    * @param position object
    */
    private buildDrawStatus(position: object): object {
        const options = {
            linecap: this.canvasLineCap,
            linewidth: this.canvasLineWidth,
            linealpha: this.canvasAlpha,
            linecolor: this.userColor,
            name: this.name
        };
        return Object.assign(position, options);
    }

    /**
     *
     * 画面切り替え
     *
     */

    public showContent(target): boolean {
        return this.contentService.checkShow(target);
    }

    public changeContent(target: string, bool: boolean = null): void {
        this.contentService.changeState(target, bool);
    }

    public changeDashbordeContent(target: string): void {
        this.contentService.showDashbordeContent(target);
    }

    public closeDashborde(): void {
        this.contentService.closeDashborde();
    }

    /**
     *
     * 接続中ユーザー
     *
     */
    public getUsers(): object {
        return this.userService.getAllUser();
    }

    /**
     * 画面キャプチャ
     */
    public setCaptureTarget(): void {
        this.imageService.setTarget(
            document.getElementById('screenvideo'),
            ''
        );
    }

    public captureScreen(): void {
        this.imageService.addCapture();
    }

    /**
     * キャプチャ確認
     */
    public getAllCapture(): object {
        return this.imageService.getCapture();
    }
    public getCapture(): string {
        return this.imageService.getCaptureToIndex(
                    this.editCaptureTarget
                );
    }

    public getCaptureTags(): object {
        return this.imageService.getTags();
    }

    /**
     * キャプチャ編集
     */
    public startCaptureEdit(target): void {
        this.editCaptureTarget = target;
        this.contentService.changeState('CaptureEditer', true);
        this.imageService.setEditer(this.captureEditerID, this.captureLayerID);
        this.imageService.setupEditImage(target).
            then(() => {
                this.imageService.setupEditer();
            });
    }

    /**
    * ペイント色の変更
    * @param color string
    */
    public setPaintColor(color: string): void {
        this.imageService.setLineColor(color);
    }
    /**
     * タグ移動On/OFF
     */
    public moveEditerTag(index, on, e: any = null): void {
        if (on) {
            this.imageService.setMoveTag(index, e);
        } else {
            this.imageService.closeMoveTag(e);
        }
    }
    /**
     * タグ移動処理
     * @param e マウスイベント
     */
    public moveEditerTagPosition(e): void {
        this.imageService.moveTag(e);
    }
    public deleteTag(index): void {
        this.imageService.deleteTag(index);
    }

    public addEditerTag(e): void {
        this.imageService.setupTag();
    }
    public closeCaputureEdit(): void {
        this.imageService.closeEditer(this.editCaptureTarget);
        this.contentService.changeState('CaptureEditer', false);
        this.editCaptureTarget = null;
    }

    /**
     *
     * Janus
     *
     */


    /**
     * 画面共有モードの設定
     * @param mode 画面共有モード
     */
    public setShareMode(mode: string): void {
        if (mode === 'screen') {
            this.capture = mode;
        } else if (mode === 'window') {
            this.capture = mode;
        } else if (mode === 'application') {
            this.capture = mode;
        }
        this.setup();
    }

    public checkEnterShare(event): boolean {
        const theCode = event.charCode;
        if (theCode === 13) {
            this.preShareScreen();
            return false;
        } else {
            return true;
        }
    }

    public preShareScreen(): void {
        // Create a new room
        this.contentService.changeState('ScreenMenu', false);
        if (this.desc === '') {
            // before bootbox alert
            console.log('Please insert a description for the room');
            this.contentService.screenReset();
            return;
        }
        this.title = this.desc;

        // this.capture = 'screen';

        // ブラウザがgetUserMediaに対応しているか判定
        if (this.webrtcService.checkScreenShare()) {
            this.contentService.changeState('ScreenSelect', true);
            // Firefox needs a different constraint for screen and window sharing
        } else {
            alert('Not Support');
        }
    }

    /**
     * クライアントを配信に参加させる
     */
    public joinScreen(): Promise<boolean> {
        // Join an existing screen sharing session
        this.contentService.changeState('ScreenMenu', false);
        if (isNaN(Number(this.roomid))) {
            // before bootbox alert
            console.log('Session identifiers are numeric only');
            this.contentService.changeState('ScreenStart', false);
            this.contentService.changeState('ScreenMenu', true);
            return;
        }
        this.room = this.roomid;
        this.myusername = this.name;

        if (this.mode === 'listener') {
            return new Promise((resolve) => {
                this.webrtcService.getLocalStream(false, true)
                .then((result) => {
                    resolve(result);
                });
            });
        }
    }

    public videoPlaying(): void {
        this.contentService.showVideoPlay();
    }


    /**
     * httpとhttpsに応じてサーバー接続先切り替え
     */
    private initial(): void {
        console.log(window.location.protocol);
        if (window.location.protocol === 'http:') {
            this.server = this.URL;
        } else if (window.location.protocol === 'https:') {
            this.server = this.URLS;
        }
        this.audioBox = document.getElementById('audioBox');
    }

    /**
     * スタート処理
     */
    public start(): void {
        this.onStart = true;
        this.userColor = this.userService.getColor();
        this.contentService.showStartSequence();

        if (this.mode === 'listener') {
            // ローカルストリーム表示
            this.contentService.showListenerSequence();
            console.log('Setup Websocket Client Mode');
            this.webrtcService.setVideoMode('listener');

            this.joinScreen()
                .then((result) => {
                    // websocket受信待受
                    this.hub();
                    // websocket 接続開始
                    this.roomid = Number(this.roomname);
                    this.room = this.roomid;
                    this.setupSocket();
                    // スクリーンイベント登録
                    this.setMouseEvent();
                    // スクリーン表示準備
                    this.setScreeElement();
                    this.getConnectionCode();
                    this.startStream();
                });

        } else if (this.mode === 'contributor') {
            this.webrtcService.setVideoMode('contributor');
            this.room = this.webrtcService.getRandomNumber(8);
            this.roomid = this.room;
            this.roomname = String(this.roomid);
        }
    }

    public stop(): void {
        this.onStart = false;
    }


    /**
     *
     * WebRTCヒデオ送信
     *
     */
    private setScreeElement(): void {
        this.videoElement = document.getElementById('screenvideo');
        this.webrtcService.setContributorTarget(
            this.videoElement
        );
    }
    private setVideoElement(): void {
        this.videoElement = document.getElementById('screenvideo');
        this.webrtcService.setVideoTarget(
            this.videoElement
        );
    }

    public videoSetup(): Promise<boolean> {
        this.setVideoElement();
        return new Promise((resolve, reject) => {
            this.webrtcService.getLocalStream(this.capture, true)
                .then((result) => {
                    resolve(result);
                });
        });
    }
    /**
     * ストリーム開始
     */
    public setup(): void {
        this.videoSetup().then((result) => {
            if (result) {
                // ローカルストリーム表示
                this.contentService.showLocalStream();

                // 画面キャプチャセットアップ
                this.setCaptureTarget();

                // webソケットイベント受信設定開始
                this.hub();
                // websocket接続開始
                this.setupSocket();
                // スクリーンイベント登録
                this.setMouseEvent();

                if (this.contentService.checkShow('ScreenVideo') === false) {
                    this.myvideoState.muted = 'muted';
                    this.contentService.changeState('ScreenVideo', true);
                }
                const video: any = document.getElementById('screenvideo');
                video.muted = true;
                this.webrtcService.playVideo('local');
            }
        });
    }

    /**
     * ストリームを止める
     */
    public shutdown(): void {
        this.videoElement.pause();
        if (this.videoElement.src && (this.videoElement.src !== '') ) {
            window.URL.revokeObjectURL(this.videoElement.src);
        }
        this.videoElement.src = '';
    }

    /**
     * WebRTC通信開始
     */
    public startStream(): void {
        console.log('Start Stream for ' + this.mode);
        this.websocketService.send(
            this.roomname,
            {
                'msg': 'webrtc',
                'job': 'request_offer'
            }
        );
    }

    /**
     * WebRTC通信止める
     */
    public stopStream(): void {
        this.webrtcService.hungUp();
    }

    private webrtcManager(result): void {
        const mode = this.webrtcService.getVideoMode();
        if (result['job'] === 'send_sdp') {
            this.websocketService.send(
            this.roomname,
            {
                'msg': 'webrtc',
                'job': 'remote_sdp',
                'data': result['data'],
                'to': result['id'],
                'mode': this.mode
            });
        } else if (result['job'] === 'remote_sdp') {
            const data = JSON.parse(result['data']);
            if ('id' in result) {
                if (this.webrtcService.checkAuthConnection(result['id']) === true
                    && this.webrtcService.checkMode(['listener'])
                ) {
                    if (result['mode'] === 'contributor') {
                        console.log('Screen On');
                        this.addScreenElement(result['id']);
                    } else {
                        this.addAudioElement(result['id']);
                    }
                }
            }
            this.webrtcService.onSdpText(data, result['id']);
        } else if (
            result['job'] === 'request_offer'
            && this.webrtcService.checkMode(['contributor'])) {

            console.log('get offer request');
            console.log(result);
            if (this.webrtcService.checkAuthConnection(result['id'])) {
                this.webrtcService.makeOffer(result['id']);
                if (mode === 'contributor') {
                    console.log('Add Audio Element');
                    this.addAudioElement(result['id']);
                }
            }
        }
    }

    private addScreenElement(id): void {
        this.webrtcService.setContributorTarget(this.videoElement);
    }
    private addAudioElement(id): void {
        if (!this.remoteElement[id]) {
            const video = this.addRemoteVideoElement(id);
            this.webrtcService.setRemoteVideoTarget(video, id);
        }
    }
    private addRemoteVideoElement(id): void {
        const video = this.createVideoElement('remote_video_' + id);
        this.remoteElement[id] = video;
        return this.remoteElement[id];
    }

    private deleteRemoteVideoElement(id, type = 'id'): void {
        if (type === 'id') {
            this.removeVideoElement('remote_video_' + id);
            delete this.remoteElement[id];
        } else if (type === 'all') {
            for (const key in this.remoteElement) {
                if (this.remoteElement.hasOwnProperty(key)) {
                    this.removeVideoElement('remote_video_' + key);
                    delete this.remoteElement[key];
                }
            }
        }
    }

    private createVideoElement(id): any {
        const audio = this.renderer2.createElement('audio');
        audio.id = id;
        audio.setAttribute('class', 'hideon');

        this.audioBox.appendChild(audio);
        return audio;
    }

    private removeVideoElement(id): any {
        const audio = document.getElementById(id);
        this.audioBox.removeChild(audio);
        return audio;
    }


    /**
     * 録画再生
     */

    public start_recorde(id): void {
        const hideo = document.getElementById(id);
        this.webrtcService.setRecordePlayer(hideo);
        this.webrtcService.startRecord();
    }

    public stop_recorde(): void {
        this.webrtcService.stopRecord();
    }

    public play_recorde(): void {
        this.webrtcService.plyaRecord();
    }

    public dl_recorde(id): void {
        const dl: any = document.getElementById(id);
        dl.download = 'hideo.webm';
        dl.href = this.webrtcService.getRecordeURL();
    }

    private AllReset(): void {
        this.contentService.screenReset();

        this.onStart = false;

        this.capture = '';
        this.desc = '';
        this.myusername = '';
        this.roomid = 0;
        this.room = 0;
        this.role = '';

        this.session = '';
        this.title = '';

        this.source = null;
    }
}


