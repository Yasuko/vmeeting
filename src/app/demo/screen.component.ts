import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
declare var adapter: any;
declare var Janus: any;
import { SubjectsService, ImageService } from '../service';
import { WebSocketService, MouseService } from '../service';
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

    private server = null;
    private janus = null;
    private screen = null;
    private opaqueId = '';

    public onStart = false;
    public onwebrtcUp = false;

    public capture = '';
    public desc = '';
    public myusername = '';
    public myid = '';
    public mypvtid = '';
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
    public mode = 'master';

    public showBitrate = 0;
    constructor(
        // private janusService: Janus,
        private router: ActivatedRoute,
        private subjectService: SubjectsService,
        private imageService: ImageService,
        private websocketService: WebSocketService,
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
            this.websocketService.send(
                this.roomname,
                {
                    msg: 'file_send',
                    data: msg
                }
            );
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
                } else {
                    this.socketHub(msg);
                }
            });
    }

    private socketHub(msg: any): void {
        if (msg['msg'] === 'connectionid') {
            if (this.roomid === 0) {
                console.log(msg);
                this.roomid = msg['data'];
            }
        } else if (msg['msg'] === 'text') {
            // console.log(msg);
            this.textService.addChat(msg['data']);
        } else if (msg['msg'] === 'draw') {
            this.pointer(msg['data']['position']);
            // console.log(msg);
        } else if (msg['msg'] === 'file_send') {
            this.fileService.addRemoteFile(msg['data']);
        }
    }

    private setRoomName(): void {
        const room = this.router.snapshot.queryParams;
        if (room.hasOwnProperty('room')) {
            console.log(room);
            this.roomname = room['room'];
            // ゲスト接続の場合にroomname要求
            this.mode = 'client';
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
        this.websocketService.send(
            this.roomname,
            {
                msg: 'text',
                data: {
                    name: this.name,
                    text: this.chatMess,
                    tstamp: this.textService.getTimeStamp()
                }
            }
        );
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
            this.websocketService.send(
                this.roomname,
                {
                    msg: 'draw',
                    data: {
                        'position': position
                    }
                }
            );
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
     *
     * Janus
     *
     */

    private initial(): void {
        console.log(window.location.protocol);
        if (window.location.protocol === 'http:') {
            this.server = this.URL;
        } else if (window.location.protocol === 'https:') {
            this.server = this.URLS;
        }

        this.opaqueId = 'screensharingtest-' + Janus.randomString(12);
    }

     public start(): void {
        this.onStart = true;
        // Make sure the browser supports WebRTC
        if (!Janus.isWebrtcSupported()) {
            this.subjectService.publish('alert', 'No WebRTC support... ');
            return;
        }
        // this.initial();
        this.userColor = this.userService.getColor();
        this.setup();
    }

    public stop(): void {
        this.onStart = false;
        this.janus.destroy();
    }

    public setShareMode(mode: string): void {
        if (mode === 'screen') {
            this.capture = mode;
        } else if (mode === 'window') {
            this.capture = mode;
        }
        this.shareScreen();
    }

    public randomString(len, charSet = null): string {
        charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        for (let i = 0; i < len; i++) {
            const randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return randomString;
    }
    public randomNumber(len, charSet = null): number {
        charSet = charSet || '0123456789';
        let randomString = '';
        for (let i = 0; i < len; i++) {
            const randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return Number(randomString);
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
        if (!Janus.isExtensionEnabled()) {
            // before bootbox alert
            console.log(
        'You`re using Chrome but don`t have the screensharing extension installed: click <b>', () => {
                window.location.reload();
            });
            return;
        }
        // Create a new room
        this.contentService.changeState('ScreenMenu', false);
        if (this.desc === '') {
            // before bootbox alert
            console.log('Please insert a description for the room');
            this.contentService.screenReset();
            return;
        }
        this.capture = 'screen';
        if (typeof(navigator['mozGetUserMedia']) === 'function') {
            this.contentService.changeState('ScreenSelect', true);
            // Firefox needs a different constraint for screen and window sharing
        } else {
            this.shareScreen();
        }
    }

    public shareScreen(): void {
        // Create a new room
        const desc = this.desc;
        this.role = 'publisher';
/*
        const create = { 'request': 'create', 'description': desc, 'bitrate': 500000 };
        this.screen.send({'message': create, success: (result) => {
            const event = result['videoroom'];
            Janus.debug('Event: ' + event);
            if (event !== undefined && event != null) {
                // Our own screen sharing session has been created, join it
                this.room = result['room'];
                this.roomname = String(this.room);
                Janus.log('Screen sharing session created: ' + this.room);
                this.myusername = this.randomString(12);
                const register = {
                    'request': 'join',
                    'room': Number(this.room),
                    'ptype': 'publisher',
                    'display': this.myusername
                };
                this.screen.send({'message': register});
            }
        }});
*/
        this.room = 1234;
        this.roomname = String(this.room);
        Janus.log('Screen sharing session created: ' + this.room);
        this.myusername = this.randomString(12);
        const register = {
            'request': 'join',
            'room': Number(this.room),
            'ptype': 'publisher',
            'display': this.myusername
        };
        this.screen.send({'message': register});
    }
    public checkEnterJoin(event): boolean {
        const theCode = event.charCode;
        if (theCode === 13) {
            this.joinScreen();
            return false;
        } else {
            return true;
        }
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

    public joinScreen(): void {
        // Join an existing screen sharing session
        this.contentService.changeState('ScreenMenu', false);
        const roomid = this.roomid;
        if (isNaN(Number(roomid))) {
            // before bootbox alert
            console.log('Session identifiers are numeric only');
            this.contentService.changeState('ScreenStart', false);
            this.contentService.changeState('ScreenMenu', true);
            return;
        }
        this.room = roomid;
        // this.role = 'listener';
        this.role = 'publisher';
        // this.myusername = this.randomString(12);
        const register = {
            request: 'join',
            room: Number(this.room),
            ptype: 'publisher',
            display: this.name
        };

        this.myusername = this.name;
        console.log(register);
        this.screen.send({'message': register});

    }

    public videoPlaying(): void {
        this.contentService.showVideoPlay();
    }
    private publishOwnFeed(useVideo) {
        // Publish our stream
        let _media = {};
        if (useVideo) {
            _media = { audioRecv: false, videoRecv: false, audioSend: true, videoSend: useVideo, video: this.capture };
        } else {
            _media = { audioRecv: false, videoRecv: false, audioSend: true, videoSend: useVideo};
        }
        this.screen.createOffer(
            {
                media: _media,
                // simulcast: doSimulcast,
                success: (jsep) => {
                    Janus.debug('Got publisher SDP!');
                    Janus.debug(jsep);
                    const publish = { 'request': 'configure', 'audio': true, 'video': useVideo };
                    this.screen.send({'message': publish, 'jsep': jsep});
                },
                error: (error) => {
                    Janus.error('WebRTC error:', error);
                    if (useVideo) {
                         this.publishOwnFeed(false);
                    } else {
                        console.log('WebRTC error... ' + JSON.stringify(error));
                    }
                }
            });
    }
    public newRemoteFeed(id, display, audio, video): void {
        // A new feed has been published, create a new plugin handle and attach to it as a listener
        this.source = id;
        let remoteFeed = null;
        this.janus.attach(
            {
                plugin: 'janus.plugin.videoroom',
                opaqueId: this.opaqueId,
                success: (pluginHandle) => {
                    remoteFeed = pluginHandle;
                    Janus.log(
                        'Plugin attached! (' +
                        remoteFeed.getPlugin() + ', id=' + remoteFeed.getId() + ')'
                    );
                    Janus.log('  -- This is a subscriber');
                    // We wait for the plugin to send us an offer
                    // const listen = { 'request': 'join', 'room': Number(this.room), 'ptype': 'listener', 'feed': id };
                    const listen = {
                        'request': 'join', 'room': Number(this.room),
                        'ptype': 'subscriber', 'feed': id, 'private_id': this.mypvtid
                    };
                    remoteFeed.send({'message': listen});
                },
                error: (error) => {
                    Janus.error('  -- Error attaching plugin...', error);
                    // before bootbox alert
                    console.log('Error attaching plugin... ' + error);
                },
                onmessage: (msg, jsep) => {
                    Janus.debug(' ::: Got a message (listener) :::');
                    Janus.debug(msg);
                    const event = msg['videoroom'];
                    Janus.debug('Event: ' + event);
                    if (event !== undefined && event !== null) {
                        if (event === 'attached') {
                            for (let i = 1 ; i < 6 ; i++) {
                                if (this.feeds[i] === undefined || this.feeds[i] === null) {
                                    this.feeds[i] = remoteFeed;
                                    remoteFeed.rfindex = i;
                                    break;
                                }
                            }
                            remoteFeed.rfid = msg['id'];
                            remoteFeed.rfdisplay = msg['display'];
                            console.log(
                                'Successfully attached to feed ' + id +
                                ' (' + display + ') in room ' + msg['room']);
                            this.contentService.changeState('ScreenMenu', false);
                            this.contentService.changeState('Room', true);
                        }
                    }
                    if (jsep !== undefined && jsep !== null) {
                        Janus.debug('Handling SDP as well...');
                        Janus.debug(jsep);
                        // Answer and attach
                        remoteFeed.createAnswer(
                            {
                                jsep: jsep,
                                media: { audioSend: false, videoSend: false },
                                success: (_jsep) => {
                                    Janus.debug('Got SDP!');
                                    console.log(_jsep);
                                    const body = { 'request': 'start', 'room': Number(this.room) };
                                    remoteFeed.send({'message': body, 'jsep': _jsep});
                                },
                                error: (error) => {
                                    Janus.error('WebRTC error:', error);
                                    // before bootbox alert
                                    console.log('WebRTC error... ' + error);
                                }
                            }
                        );
                    }
                },
                onlocalstream: (stream) => {
                    // The subscriber stream is recvonly, we don't expect anything here
                },
                onremotestream: (stream) => {
                    console.log(stream);
                    console.log(remoteFeed);
                    const videoTrack = stream.getVideoTracks();
                    if (videoTrack === null || videoTrack === undefined || videoTrack.length === 0) {
                        console.log('Attach Remote Audio Stream');
                        Janus.attachMediaStream(
                            document.getElementById('audio' + remoteFeed.rfindex),
                            // document.getElementById('audio0'),
                            stream
                        );
                    } else {
                        console.log('Attach Remote Video Stream');
                        this.setCaptureTarget();
                        this.contentService.showRemoteStream();
                        if (this.contentService.checkShow('ScreenVideo') === false) {
                            this.contentService.changeState('Room', true);
                        }
                        Janus.attachMediaStream(
                            document.getElementById('screenvideo'),
                            stream
                        );
                        // スクリーンイベント登録
                        this.setMouseEvent();
                    }
                },
                oncleanup: () => {
                    Janus.log(' ::: Got a cleanup notification (remote feed ' + id + ') :::');
                    this.contentService.changeState('WaitingVideo', false);
                }
            });
    }
    private setup(): void {
        // Initialize the library (all console debuggers enabled)
        Janus.init({debug: 'all', callback: () => {
            this.janus = new Janus({
                server: this.server,
                success: () => {
                    this.janus.attach(
                        {
                            plugin: 'janus.plugin.videoroom',
                            opaqueId: this.opaqueId,
                            success: (pluginHandle) => {
                                this.screen = pluginHandle;
                                Janus.log('Plugin attached! (' +
                                    this.screen.getPlugin() + ', id=' + this.screen.getId() + ')');
                                this.contentService.showStartSequence();

                                // クライアントの場合ノード接続開始
                                if (this.mode === 'client') {
                                    console.log('Setup Websocket Client Mode');
                                    // websocket受信待受
                                    this.hub();
                                    // websocket 接続開始
                                    this.roomid = Number(this.roomname);
                                    this.setupSocket();
                                    this.joinScreen();
                                    this.getConnectionCode();
                                }
                            },
                            error: (error) => {
                                console.error('  -- Error attaching plugin...', error);
                                console.log('Error attaching plugin... ' + error);
                                // this.subjectService.publish('alert', 'Error attaching plugin... ' + error);
                            },
                            consentDialog: (on) => {
                                Janus.debug('Consent dialog should be ' + (on ? 'on' : 'off') + ' now');
                                if (on) {
                                } else {
                                }
                            },
                            webrtcState: (on) => {
                                Janus.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
                                if (on) {
                                    console.log(
                                        'Your screen sharing session just started: pass the ' +
                                        '<b>' + this.room + '</b> session identifier to those who want to attend.');
                                } else {
                                    console.log('Your screen sharing session just stopped.', () => {
                                        this.janus.destroy();
                                        window.location.reload();
                                    });
                                }
                            },
                            onmessage: (msg, jsep) => {
                                Janus.debug(' ::: Got a message :::');
                                Janus.debug(msg);
                                const event = msg['videoroom'];
                                Janus.debug('Event: ' + event);
                                if (event !== undefined && event !== null) {
                                    if (event === 'joined') {
                                        this.myid = msg['id'];
                                        this.mypvtid = msg['private_id'];
                                        this.title = msg['description'];
                                        console.log(
                                            'Successfully joined room ' + msg['room'] +
                                            ' with ID ' + this.myid);
                                        if (this.mode === 'master') {
                                            Janus.debug('Negotiating WebRTC stream for our screen (capture ' + this.capture + ')');
                                            this.publishOwnFeed(true);
                                        } else {
                                            // Publish our stream
                                            console.log('Send Audio OFFER');
                                            this.publishOwnFeed(false);

                                            // We're just watching a session, any feed to attach to?
                                            if (msg['publishers'] !== undefined && msg['publishers'] !== null) {
                                                const list = msg['publishers'];
                                                Janus.debug('Got a list of available publishers/feeds:');
                                                Janus.debug(list);
                                                for (const f in list) {
                                                    if (list.hasOwnProperty(f)) {
                                                        const id = list[f]['id'];
                                                        const display = list[f]['display'];
                                                        const audio = list[f]['audio_codec'];
                                                        const video = list[f]['video_codec'];
                                                        Janus.debug('  >> [' + id + '] ' + display);
                                                        this.newRemoteFeed(id, display, audio, video);
                                                    }
                                                }
                                            }
                                        }
                                    } else if (event === 'destroyed') {
                                        // befor bootbox
                                        console.log('The room has been destroyed', () => {
                                            window.location.reload();
                                        });
                                    } else if (event === 'event') {
                                        // Any feed to attach to?
                                        if (msg['publishers'] !== undefined
                                            && msg['publishers'] !== null) {
                                            const list = msg['publishers'];
                                            Janus.debug('Got a list of available publishers/feeds:');
                                            Janus.debug(list);
                                            for (const f in list) {
                                                if (list.hasOwnProperty(f)) {
                                                    const id = list[f]['id'];
                                                    const display = list[f]['display'];
                                                    const audio = list[f]['audio_codec'];
                                                    const video = list[f]['video_codec'];
                                                    Janus.debug('  >> [' + id + '] ' + display);
                                                    this.newRemoteFeed(id, display, audio, video);
                                                }
                                            }
                                        } else if (msg['leaving'] !== undefined && msg['leaving'] !== null) {
                                            // One of the publishers has gone away?
                                            const leaving = msg['leaving'];
                                            Janus.log('Publisher left: ' + leaving);
                                            let remoteFeed = null;
                                            for (let i = 0; i < 5; i++) {
                                                if (this.feeds[i] !== undefined
                                                    && this.feeds[i] !== undefined
                                                    && this.feeds[i].rfid === leaving) {
                                                    remoteFeed = this.feeds[i];
                                                    break;
                                                }
                                            }
                                            if (remoteFeed !== null) {
                                                this.feeds[remoteFeed.rfindex] = null;
                                                remoteFeed.detach();
                                            }
                                            if (this.mode === 'client' && msg['leaving'] === this.source) {
                                                // before bootbox alert
                                                console.log(
                                                    'The screen sharing session is over, the publisher left',
                                                    () => {
                                                    window.location.reload();
                                                });
                                            }
                                        } else if (msg['unpublished'] !== undefined && msg['unpublished'] !== null) {
                                            // One of the publishers has unpublished?
                                            const unpublished = msg['unpublished'];
                                            Janus.log('Publisher left: ' + unpublished);
                                            if (unpublished === 'ok') {
                                                // That's us
                                                this.screen.hangup();
                                                return;
                                            }
                                            let remoteFeed = null;
                                            for (let i = 1; i < 6; i++) {
                                                if (this.feeds[i] !== null
                                                    && this.feeds[i] !== undefined
                                                    && this.feeds[i].rfid === unpublished) {
                                                    remoteFeed = this.feeds[i];
                                                    break;
                                                }
                                            }
                                            if (remoteFeed != null) {
                                                this.feeds[remoteFeed.rfindex] = null;
                                                remoteFeed.detach();
                                            }
                                        } else if (msg['error'] !== undefined && msg['error'] !== null) {
                                            // before bootbox alert
                                            console.log(msg['error']);
                                        }
                                    }
                                }
                                if (jsep !== undefined && jsep !== null) {
                                    Janus.debug('Handling SDP as well...');
                                    Janus.debug(jsep);
                                    this.screen.handleRemoteJsep({jsep: jsep});
                                }
                            },

                            onlocalstream: (stream) => {
                                if (this.mode === 'master') {
                                    Janus.debug(' ::: Got a local stream :::');
                                    Janus.debug(stream);

                                    this.setCaptureTarget();
                                    this.contentService.showLocalStream();

                                    // websocket受信待受
                                    console.log('Setup Websocket Master Mode');
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
                                    video.muted = false;
                                    Janus.attachMediaStream(
                                        video,
                                        stream
                                    );
                                    if (this.screen.webrtcStuff.pc.iceConnectionState !== 'completed'
                                        && this.screen.webrtcStuff.pc.iceConnectionState !== 'connected') {

                                        this.contentService.changeState('ScreenBlock', true);
                                    }
                                }

                            },
                            onremotestream: (stream) => {
                                console.log(stream);

                            },
                            oncleanup: () => {
                                Janus.log(' ::: Got a cleanup notification :::');
                                console.log('load', 'hide');
                                this.AllReset();
                            }
                        });
                },
                error: (error) => {
                    Janus.error(error);
                    window.location.reload();
                },
                destroyed: () => {
                    window.location.reload();
                }
            });
    }});

    }

    private AllReset(): void {
        this.contentService.screenReset();

        this.onStart = false;

        this.capture = '';
        this.desc = '';
        this.myusername = '';
        this.myid = '';
        this.roomid = 0;
        this.room = 0;
        this.role = '';

        this.session = '';
        this.title = '';

        this.source = null;
    }
}


