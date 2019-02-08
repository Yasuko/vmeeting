import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
declare var adapter: any;
declare var Janus: any;
import { SubjectsService, ImageService } from '../service';
import { WebSocketService } from '../service';
import { UserService, ContentService, TextService } from '../service';
import { DrawService, StoryService } from '../service';

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

    public capture = '';
    public desc = '';
    public myusername = '';
    public myid = '';
    public roomid: Number = 0;
    public room: Number = 0;
    public role = '';

    public name = 'Guest';

    // テキストチャット
    public chatMess = '';

    // キャプチャ編集
    private canvasID = 'artbox';
    private canvasBase: HTMLCanvasElement;
    private ctx;

    canvasWidth = 700;
    canvasHeight = 400;
    canvasColorList = [
      '#E60012', '#F39800', '#FFF100', '#8FC31F', '#009944', '#009E96',
      '#00A0E9', '#0068B7', '#1D2088', '#920783', '#E4007F', '#E5004F',
      '#808080', '#000000', '#FFFFFF'
    ];

    canvasLineColor = '#555555';
    canvasLineCap = 'round';
    canvasLineWidth = 7;
    canvasAlpha = 1;

    public session = '';
    public title = '';

    public source = null;

    public editCaptureTarget = 0;

    public myvideoState = {
        'width': 1024,
        'height': 720,
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
        private userService: UserService,
        private contentService: ContentService,
        private textService: TextService,
        private storyService: StoryService
    ) {
    }

    ngOnInit(): void {
        this.initial();
        // this.setup();
        this.setRoomName();
    }

    private hub(): void {
        this.subjectService.on('sys')
        .subscribe((msg: any) => {
          console.log(msg);
        });
        this.subjectService.on('on_allusers')
        .subscribe((msg: any) => {
            console.log(msg);
            this.userService.addMultiUser(msg);
        });
        this.subjectService.on('on_' + this.roomname)
        .subscribe((msg: any) => {
            console.log(msg);
            console.log(this.mode);
            if (this.mode === 'master' && msg['msg'] === 'new_client') {
                console.log(msg);
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
            console.log(msg);
            this.roomid = msg['data'];
        } else if (msg['msg'] === 'text') {
            console.log(msg);
            this.textService.addChat(msg['data']);
        } else if (msg['msg'] === 'draw') {
            console.log(msg);
        } else if (msg['msg'] === 'image') {
            console.log(msg);
        }
    }

    private setRoomName(): void {
        const room = this.router.snapshot.queryParams;
        if (room.hasOwnProperty('room')) {
            console.log(room);
            this.roomname = room['room'];
        }
    }

    private setupSocket(): void {
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
            userid: ''
        });
        this.websocketService.send(
            this.roomname,
            {
                msg: 'text',
                data: {
                    text: this.chatMess,
                    tstamp: this.textService.getTimeStamp()
                }
            }
        );
        this.chatMess = '';
    }


    /**
     *
     * お絵かき
     *
     */
    private setMouseEvent(): void {
    this.canvasBase = <HTMLCanvasElement> document.getElementById(this.canvasID);
    this.ctx = this.canvasBase.getContext('2d');
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    const rect = this.canvasBase.getBoundingClientRect();
    this.mouseService.setCorrection(rect);

    this.canvasBase.addEventListener('mousedown', (e: MouseEvent) => {
        this.mouseService.setStartPosition(e);
    });
    this.canvasBase.addEventListener('mouseup', (e) => {
        this.mouseService.end();
    });
    this.canvasBase.addEventListener('mousemove', (e: MouseEvent) => {
        this.mouseMoveJob(e);
    });
    this.canvasBase.addEventListener('touchstart', (e) => {
        this.mouseService.setStartPosition(e);
    });
    this.canvasBase.addEventListener('touchend', (e) => {
        this.mouseService.end();
    });
    this.canvasBase.addEventListener('touchmove', (e) => {
        this.mouseMoveJob(e);
    });
    }
    private mouseMoveJob(e): void {
    if (this.mouseService.getMoveFlag()) {
        this.mouseService.mouseMove(e);
        const position = this.buildDrawStatus(this.mouseService.getMousePosition());
        this.draw(position);
        this.sendDraw(position);
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
    * キャンバスに描く内容と描画オプションを結合
    * @param position object
    */
    private buildDrawStatus(position: object): object {
    const options = {
        linecap: this.canvasLineCap,
        linewidth: this.canvasLineWidth,
        linealpha: this.canvasAlpha,
        linecolor: this.canvasLineColor
    };
    return Object.assign(position, options);
    }

    /**
    * ペイント色の変更
    * @param color string
    */
    public setPaintColor(color: string): void {
    this.canvasLineColor = color;
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
        this.setup();
        // ゲスト接続の場合にroomname要求
        if (this.roomname !== '') {
            this.mode = 'client';
        }
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
        const create = { 'request': 'create', 'description': desc, 'bitrate': 500000, 'publishers': 1 };
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

    public setCaptureTarget(): void {
        this.imageService.setTarget(
            document.getElementById('screenvideo'),
            ''
        );
    }

    public captureScreen(): void {
        this.imageService.addCapture();
    }

    public getAllCapture(): object {
        return this.imageService.getCapture();
    }
    public getCapture(): string {
        return this.imageService.getCaptureToIndex(
                    this.editCaptureTarget
                );
    }

    public startCaptureEdit(target): void {
        this.editCaptureTarget = target;
        this.contentService.changeState('CaptureEditer', true);
    }

    public closeCaputureEdit(): void {
        this.editCaptureTarget = null;
        this.contentService.changeState('CaptureEditer', false);
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
        this.role = 'listener';
        this.myusername = this.randomString(12);

        const register = {
            request: 'join',
            room: Number(this.room),
            ptype: 'publisher',
            display: this.myusername
        };


        console.log(register);
        this.screen.send({'message': register});
    }

    public videoPlaying(): void {
        this.contentService.showVideoPlay();
    }

    public newRemoteFeed(id, display): void {
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
                    const listen = { 'request': 'join', 'room': Number(this.room), 'ptype': 'listener', 'feed': id };
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
                            Janus.log(
                                'Successfully attached to feed ' + id +
                                ' (' + display + ') in room ' + msg['room']);
                            this.contentService.changeState('ScreenMenu', false);
                            this.contentService.changeState('Room', true);
                        } else {
                            // What has just happened?
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
                                    Janus.debug(_jsep);
                                    const body = { 'request': 'start', 'room': Number(this.room) };
                                    remoteFeed.send({'message': body, 'jsep': _jsep});
                                },
                                error: (error) => {
                                    Janus.error('WebRTC error:', error);
                                    // before bootbox alert
                                    console.log('WebRTC error... ' + error);
                                }
                            });
                    }
                },
                onlocalstream: (stream) => {
                    // The subscriber stream is recvonly, we don't expect anything here
                },
                onremotestream: (stream) => {
                    this.setCaptureTarget();
                    this.contentService.showRemoteStream();
                    if (this.contentService.checkShow('ScreenVideo') === false) {
                        // No remote video yet
                        this.contentService.changeState('Room', true);
                        // Show the video, hide the spinner and show the resolution when we get a playing event
                    }
                    Janus.attachMediaStream(
                        document.getElementById('screenvideo'),
                        stream
                    );
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
                                        this.title = msg['description'];
                                        Janus.log(
                                            'Successfully joined room ' + msg['room'] +
                                            ' with ID ' + this.myid);
                                        if (this.role === 'publisher') {

                                            Janus.debug('Negotiating WebRTC stream for our screen (capture ' + this.capture + ')');
                                            this.screen.createOffer(
                                                {
                                                    media: { 'video': this.capture, 'audioSend': true, 'videoRecv': false},
                                                    success: (_jsep) => {
                                                        Janus.debug('Got publisher SDP!');
                                                        Janus.debug(_jsep);
                                                        const publish = { 'request': 'configure', 'audio': true, 'video': true };
                                                        this.screen.send({'message': publish, 'jsep': _jsep});
                                                    },
                                                    error: (error) => {
                                                        Janus.error('WebRTC error:', error);
                                                        // before bootbox alert
                                                        console.log('WebRTC error... ' + JSON.stringify(error));
                                                    }
                                                });
                                        } else {
                                            // We're just watching a session, any feed to attach to?
                                            if (msg['publishers'] !== undefined && msg['publishers'] !== null) {
                                                const list = msg['publishers'];
                                                Janus.debug('Got a list of available publishers/feeds:');
                                                Janus.debug(list);
                                                for (const f in list) {
                                                    if (list.hasOwnProperty(f)) {
                                                        const id = list[f]['id'];
                                                        const display = list[f]['display'];
                                                        Janus.debug('  >> [' + id + '] ' + display);
                                                        this.newRemoteFeed(id, display);
                                                    }
                                                }
                                            }
                                        }
                                    } else if (event === 'event') {
                                        // Any feed to attach to?
                                        if (this. role === 'listener'
                                            && msg['publishers'] !== undefined
                                            && msg['publishers'] !== null) {
                                            const list = msg['publishers'];
                                            Janus.debug('Got a list of available publishers/feeds:');
                                            Janus.debug(list);
                                            for (const f in list) {
                                                if (list.hasOwnProperty(f)) {
                                                    const id = list[f]['id'];
                                                    const display = list[f]['display'];
                                                    Janus.debug('  >> [' + id + '] ' + display);
                                                    this.newRemoteFeed(id, display);
                                                }
                                            }
                                        } else if (msg['leaving'] !== undefined && msg['leaving'] !== null) {
                                            // One of the publishers has gone away?
                                            const leaving = msg['leaving'];
                                            Janus.log('Publisher left: ' + leaving);
                                            if (this.role === 'listener' && msg['leaving'] === this.source) {
                                                // before bootbox alert
                                                console.log(
                                                    'The screen sharing session is over, the publisher left',
                                                    () => {
                                                    window.location.reload();
                                                });
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
                                Janus.debug(' ::: Got a local stream :::');
                                Janus.debug(stream);

                                this.setCaptureTarget();
                                this.contentService.showLocalStream();

                                // websocket受信待受
                                this.hub();
                                // websocket接続開始
                                this.setupSocket();

                                if (this.contentService.checkShow('ScreenVideo') === false) {
                                    this.myvideoState.muted = 'muted';
                                    this.contentService.changeState('ScreenVideo', true);
                                }
                                Janus.attachMediaStream(
                                    document.getElementById('screenvideo'),
                                    stream
                                );
                                if (this.screen.webrtcStuff.pc.iceConnectionState !== 'completed'
                                    && this.screen.webrtcStuff.pc.iceConnectionState !== 'connected') {

                                    this.contentService.changeState('ScreenBlock', true);

                                }
                            },
                            onremotestream: (stream) => {

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


