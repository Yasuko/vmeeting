import { Component, OnInit } from '@angular/core';
// import { JanusService } from '../service';
// import * as Janus from 'janus-ts';
declare var adapter: any;
declare var Janus: any;
import { SubjectsService, ImageService } from '../service';
import { WebSocketService } from '../service';

@Component({
  selector: 'app-screen',
  templateUrl: './screen.component.html',
  styleUrls: [
      '../app.component.css',
      './screen.component.scss'
    ]
})

export class ScreenComponent implements OnInit {

    private server = null;
    private janus = null;
    private screen = null;
    private opaqueId = '';


    public showWaitingVideo = false;

    public showHeaderScreen = false;
    public showCenterScreen = true;

    public showScreenVideo = false;
    public showScreenStart = true;
    public showScreenMenu = false;
    public showScreenSelect = false;

    public showCreateNow = false;
    public showJoinNow = false;
    public showRoom = false;

    public showScreenCapture = false;
    public showCaptureEditer = false;

    public showScreenBlock = false;

    public onStart = false;

    public capture = '';
    public desc = '';
    public myusername = '';
    public myid = '';
    public roomid: Number = 0;
    public room: Number = 0;
    public role = '';

    public session = '';
    public title = '';

    public source = null;

    public editCaptureTarget = 0;

    public myvideoState = {
        'width': 1280,
        'height': 720,
        'muted': 'muted',
    };
    public peervideoState = {
        'width': 320,
        'height': 240,
    };

    public showBitrate = 0;
    constructor(
        // private janusService: Janus,
        private subjectService: SubjectsService,
        private imageService: ImageService,
        private websocketService: WebSocketService
    ) {
    }

    ngOnInit(): void {
        this.initial();
        // this.setup();
    }

    private initial(): void {
        console.log(window.location.protocol);
        if (window.location.protocol === 'http:') {
            this.server = 'http://happypazdra.dip.jp:8088/janus';
        } else if (window.location.protocol === 'https:') {
            this.server = 'https://happypazdra.dip.jp:8089/janus';
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
        this.showScreenMenu = false;
        if (this.desc === '') {
            // before bootbox alert
            console.log('Please insert a description for the room');
            this.showScreenStart = false;
            this.showScreenMenu = true;
            return;
        }
        this.capture = 'screen';
        if (typeof(navigator['mozGetUserMedia']) === 'function') {
            this.showScreenMenu = false;
            this.showScreenSelect = true;
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
        this.showCaptureEditer = true;
    }

    public closeCaputureEdit(): void {
        this.editCaptureTarget = null;
        this.showCaptureEditer = false;
    }

    public joinScreen(): void {
        // Join an existing screen sharing session
        this.showScreenMenu = false;
        const roomid = this.roomid;
        if (isNaN(Number(roomid))) {
            // before bootbox alert
            console.log('Session identifiers are numeric only');
            this.showScreenStart = false;
            this.showScreenMenu = true;
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
        this.showWaitingVideo = false;
        this.showScreenVideo = false;
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
                            this.showScreenMenu = false;
                            this.showRoom = true;
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
                    this.showCenterScreen = false;
                    this.showScreenCapture = true;
                    this.showHeaderScreen = true;
                    this.showRoom = true;
                    if (this.showScreenVideo === false) {
                        // No remote video yet
                        this.showScreenCapture = true;
                        // Show the video, hide the spinner and show the resolution when we get a playing event
                    }
                    Janus.attachMediaStream(
                        document.getElementById('screenvideo'),
                        stream
                    );
                },
                oncleanup: () => {
                    Janus.log(' ::: Got a cleanup notification (remote feed ' + id + ') :::');
                    this.showWaitingVideo = false;

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
                                this.showScreenStart = false;
                                this.showScreenMenu = true;
                                this.showCreateNow = true;
                                this.showJoinNow = true;
                                this.showRoom = true;
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
                                this.showCenterScreen = false;
                                this.showHeaderScreen = true;
                                this.showScreenCapture = true;
                                this.showRoom = true;
                                if (this.showScreenVideo === false) {
                                    this.myvideoState.muted = 'muted';
                                    this.showScreenVideo = true;
                                }
                                Janus.attachMediaStream(
                                    document.getElementById('screenvideo'),
                                    stream
                                );
                                if (this.screen.webrtcStuff.pc.iceConnectionState !== 'completed'
                                    && this.screen.webrtcStuff.pc.iceConnectionState !== 'connected') {
                                     this.showScreenBlock = true;
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

    private getQueryStringValue(name): string {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    private AllReset(): void {
        this.showWaitingVideo = false;
        this.showScreenVideo = false;
        this.showScreenStart = true;
        this.showScreenMenu = false;
        this.showScreenSelect = false;
        this.showCreateNow = false;
        this.showJoinNow = false;
        this.showRoom = false;
        this.showScreenCapture = false;

        this.showScreenBlock = false;

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


