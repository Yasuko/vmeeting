import { Component, OnInit } from '@angular/core';
declare var Janus: any;
import { SubjectsService } from '../service';

@Component({
  selector: 'app-videoroom',
  templateUrl: './videoroom.component.html',
  styleUrls: [
      '../app.component.css',
      './videoroom.component.scss'
    ]
})

export class VideoroomComponent implements OnInit {

    private server = null;
    private janus = null;
    private sfutest = null;
    private opaqueId = '';

    private bitrateTimer = null;
    private spinner = null;

    private doSimulcast = false;
    private simulcastStarted = false;

    public showDetails = true;
    public showVideoJoin = false;
    public showRegisternow = false;
    public showVideos = false;
    public showMyvideo = false;
    public showWaitingvideo = false;
    public showPeervideo = false;
    public showSimulcast = false;
    public showUsername = false;
    public showRegister = false;
    public showPublish = false;
    public showUnPublish = false;
    public showRemote = [false, false, false, false, false, false];
    public showWaitingRemote = [false, false, false, false, false, false];
    public showNovideoRemote = [false, false, false, false, false, false];
    public showBitrateRemote = [false, false, false, false, false, false];
    public showCurresRemote = [false, false, false, false, false, false];

    public showVideoLeft = false;

    public onToggleaudio = true;
    public onTogglevideo = true;
    public onBitrate = false;
    public onDatasend = false;

    public onStart = false;

    public myid = '';
    public mypvid = '';
    public myroom = 1234;
    public mystream: any = {};
    public username = '';
    public myusername = '';
    public mute = '';
    public mypvtid = null;

    public feeds = [];
    public remote = [false, false, false, false, false, false];
    public remoteCurres = ['', '', '', '', '', ''];
    public remoteBitrate = ['', '', '', '', '', ''];
    public remoteUser = ['', '', '', '', '', ''];

    public remoteBitrateTimer = [{}, {}, {}, {}, {}, {}];

    public videoWidth = 320;
    public videoHeight = 240;

    public myvideoState = {
        'width': 320,
        'height': 240,
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
    ) {
    }

    ngOnInit(): void {
        // this.initial();
        // this.setup();
    }

    private initial(): void {
        if (window.location.protocol === 'http:') {
            this.server = 'http://janus.uzaking.uza:8088/janus';
        } else {
            this.server = 'https://janus.uzaking.uza:8089/janus';
        }

        this.opaqueId = 'sfutest-' + Janus.randomString(12);
    }

    public start(): void {
        this.onStart = true;
        // Make sure the browser supports WebRTC
        if (!Janus.isWebrtcSupported()) {
            this.subjectService.publish('alert', 'No WebRTC support... ');
            return;
        }
        this.initial();
        this.setup();
    }

    public stop(): void {
        this.onStart = false;
        if (this.bitrateTimer) {
            clearInterval(this.bitrateTimer);
        }
        this.bitrateTimer = null;
        this.janus.destroy();
    }
    // Enable audio/video buttons and bitrate limiter
    public toggleAudio(): void {
        if (this.onToggleaudio) {
            this.onToggleaudio = false;
        } else {
            this.onToggleaudio = true;
        }
        this.sfutest.send({'message': { 'audio': this.onToggleaudio }});
    }

    public toggleVideo(): void {
        if (this.onTogglevideo) {
            this.onTogglevideo = false;
        } else {
            this.onTogglevideo = true;
        }
        this.sfutest.send({'message': { 'video': this.onTogglevideo }});
    }

    public toggleMute(): void {
        let muted = this.sfutest.isAudioMuted();
        Janus.log((muted ? 'Unmuting' : 'Muting') + ' local stream...');
        if (muted) {
            this.sfutest.unmuteAudio();
        } else {
            this.sfutest.muteAudio();
        }
        muted = this.sfutest.isAudioMuted();
        this.mute = (muted) ? 'Unmute' : 'Mute';
    }
    public setBitrate(rate): void {
        const bitrate = rate * 1000;
        if (bitrate === 0) {
            Janus.log('Not limiting bandwidth via REMB');
        } else {
            Janus.log('Capping bandwidth to ' + bitrate + ' via REMB');
        }
        this.sfutest.send({'message': { 'request': 'configure', 'bitrate': bitrate }});
    }

    public remotePlay(i): void {
        // スピナーがあった場所
        this.showWaitingRemote[i] = false;
        if (this.videoWidth) {
            this.showRemote[i] = true;
        }
        const width = this.videoWidth;
        const height = this.videoHeight;
        this.remoteCurres[i] = width + 'x' + height;
        if (Janus.webRTCAdapter.browserDetails.browser === 'firefox') {
            // Firefox Stable has a bug: width and height are not immediately available after a playing
            setTimeout(() => {
                const video: any = <HTMLMediaElement> document.getElementById('remotevideo' + i);
                this.remoteCurres[i] = video.videoWidth + 'x' + video.videoHeight;
            }, 2000);
        }
    }

    public checkEnter(event: any): boolean {
        const theCode = String.fromCharCode(event.charCode);
        if (theCode === '13') {
            console.log(theCode);
            this.registerUsername();
            return false;
        } else {
            return true;
        }
    }
    public registerUsername(): void {
        console.log('regist User');
        if (this.username.length === 0) {
            // Create fields to register
            // $('#username').focus();
            return;
        } else {
            // Try a registration
            this.showUsername = false;
            this.showRegister = false;
            if (this.username === '') {
                this.showUsername = true;
                this.showRegister = true;
                return;
            }
            if (/[^a-zA-Z0-9]/.test(this.username)) {
                this.showUsername = true;
                this.username = '';
                this.showRegister = true;
                return;
            }
            const register = { 'request': 'join', 'room': this.myroom, 'ptype': 'publisher', 'display': this.username };
            this.myusername = this.username;
            this.sfutest.send({'message': register});
        }
    }

    public publishOwnFeed(useAudio): void {
        // Publish our stream
        this.showPublish = false;
        this.sfutest.createOffer(
            {
                media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },
                simulcast: this.doSimulcast,
                success: (jsep) => {
                    Janus.debug('Got publisher SDP!');
                    Janus.debug(jsep);
                    const publish = { 'request': 'configure', 'audio': useAudio, 'video': true };
                    this.sfutest.send({'message': publish, 'jsep': jsep});
                },
                error: (error) => {
                    Janus.error('WebRTC error:', error);
                    if (useAudio) {
                        this.publishOwnFeed(false);
                    } else {
                        // before bootbox
                        console.log('WebRTC error... ' + JSON.stringify(error));
                        this.showPublish = true;
                    }
                }
            });
    }
    public unpublishOwnFeed(): void {
        // Unpublish our stream
        this.showUnPublish = false;
        const unpublish = { 'request': 'unpublish' };
        this.sfutest.send({'message': unpublish});
    }
    public playPeervideo(): void {
        this.showWaitingvideo = false;
        this.showPeervideo = true;
    }

    public newRemoteFeed(id, display, audio, video): any {
        // A new feed has been published, create a new plugin handle and attach to it as a subscriber
        let remoteFeed = null;
        this.janus.attach(
            {
                plugin: 'janus.plugin.videoroom',
                opaqueId: this.opaqueId,
                success: (pluginHandle) => {
                    remoteFeed = pluginHandle;
                    remoteFeed.simulcastStarted = false;
                    Janus.log('Plugin attached! (' + remoteFeed.getPlugin() + ', id=' + remoteFeed.getId() + ')');
                    Janus.log('  -- This is a subscriber');
                    const subscribe = {
                        'request': 'join', 'room': this.myroom, 'ptype': 'subscriber',
                        'feed': id, 'private_id': this.mypvtid
                    };
                    if (Janus.webRTCAdapter.browserDetails.browser === 'safari' &&
                            (video === 'vp9' || (video === 'vp8' && !Janus.safariVp8))) {
                        if (video) {
                            video = video.toUpperCase();
                        }
                        // before toastr
                        console.log('Publisher is using ' + video + ', but Safari doesn`t support it: disabling video');
                        subscribe['offer_video'] = false;
                    }
                    remoteFeed.videoCodec = video;
                    remoteFeed.send({'message': subscribe});
                },
                error: (error) => {
                    Janus.error('  -- Error attaching plugin...', error);
                    // before bootbox
                    console.log('Error attaching plugin... ' + error);
                },
                onmessage: (msg, jsep) => {
                    Janus.debug(' ::: Got a message (subscriber) :::');
                    Janus.debug(msg);
                    const event = msg['videoroom'];
                    Janus.debug('Event: ' + event);
                    if (msg['error'] !== undefined && msg['error'] !== null) {
                        // before boot box
                        console.log(msg['error']);
                    } else if (event !== undefined && event !== null) {
                        if (event === 'attached') {
                            // Subscriber created and attached
                            for (let i = 1 ; i < 6 ; i++) {
                                if (this.feeds[i] === undefined || this.feeds[i] === null) {
                                    this.feeds[i] = remoteFeed;
                                    remoteFeed.rfindex = i;
                                    break;
                                }
                            }
                            remoteFeed.rfid = msg['id'];
                            remoteFeed.rfdisplay = msg['display'];
                            // スピナーがあった場所
                            Janus.log(
                                'Successfully attached to feed ' +
                                remoteFeed.rfid + ' (' + remoteFeed.rfdisplay + ') in room ' + msg['room']);
                                this.remoteUser[remoteFeed.rfindex] = remoteFeed.rfdisplay;
                                this.showRemote[remoteFeed.rfindex] = true;
                                this.showNovideoRemote[remoteFeed.rfindex] = false;
                        } else if (event === 'event') {
                            // Check if we got an event on a simulcast-related event from this publisher
                            const substream = msg['substream'];
                            const temporal = msg['temporal'];
                            if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
                                if (!remoteFeed.simulcastStarted) {
                                    remoteFeed.simulcastStarted = true;
                                    // Add some new buttons
                                }
                                // We just received notice that there's been a switch, update the buttons
                            }
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
                                // Add data:true here if you want to subscribe to datachannels as well
                                // (obviously only works if the publisher offered them in the first place)
                                media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
                                success: (_jsep) => {
                                    Janus.debug('Got SDP!');
                                    Janus.debug(_jsep);
                                    const body = { 'request': 'start', 'room': this.myroom };
                                    remoteFeed.send({'message': body, 'jsep': _jsep});
                                },
                                error: (error) => {
                                    Janus.error('WebRTC error:', error);
                                    // before bootbox
                                    console.log('WebRTC error... ' + JSON.stringify(error));
                                }
                            });
                    }
                },
                webrtcState: (on) => {
                    Janus.log(
                        'Janus says this WebRTC PeerConnection (feed #' +
                        remoteFeed.rfindex + ') is ' + (on ? 'up' : 'down') + ' now');
                },
                onlocalstream: (stream) => {
                    // The subscriber stream is recvonly, we don't expect anything here
                },
                onremotestream: (stream) => {
                    Janus.debug('Remote feed #' + remoteFeed.rfindex);
                    // let addButtons = false;
                    let addButtons = true;
                    if (this.showRemote[remoteFeed.rfindex] === false) {
                        addButtons = true;
                        // this.showRemote[remoteFeed.rfindex] = true;
                        // remoteタグの　playイベントがあったところ
                    }

                    Janus.attachMediaStream(
                        document.getElementById('remotevideo' + remoteFeed.rfindex),
                        stream
                    );
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                        // No remote video
                        this.remote[remoteFeed.rfindex] = false;
                        if (this.showNovideoRemote[remoteFeed.rfindex] === false) {
                            this.showNovideoRemote[remoteFeed.rfindex] = true;
                        }
                    } else {
                        this.showNovideoRemote[remoteFeed.rfindex] = false;
                        this.remote[remoteFeed.rfindex] = true;
                    }

                    if (!addButtons) {
                        return;
                    }

                    if (Janus.webRTCAdapter.browserDetails.browser === 'chrome'
                        || Janus.webRTCAdapter.browserDetails.browser === 'firefox'
                        || Janus.webRTCAdapter.browserDetails.browser === 'safari') {

                        this.showBitrateRemote[remoteFeed.rfindex] = true;

                        this.remoteBitrateTimer[remoteFeed.rfindex] = setInterval(() => {
                            // Display updated bitrate, if supported
                            const bitrate = remoteFeed.getBitrate();
                            console.log(bitrate);
                            this.remoteBitrate[remoteFeed.rfindex] = bitrate;
                            // Check if the resolution changed too
                            const rvideo: any = <HTMLMediaElement> document.getElementById('remotevideo' + remoteFeed.rfindex);
                            if (rvideo.videoWidth > 0 && rvideo.videoHeight > 0) {
                                this.showCurresRemote[remoteFeed.rfindex] = true;
                                this.remoteCurres[remoteFeed.rfindex] = rvideo.videoWidth + 'x' + rvideo.videoHeight;
                            }
                        }, 1000);
                    }
                },
                oncleanup: () => {
                    Janus.log(' ::: Got a cleanup notification (remote feed ' + id + ') :::');
                    // スピナーがあった場所
                    this.showRemote[remoteFeed.rfindex] = false;
                    this.showWaitingRemote[remoteFeed.rfindex] = false;
                    this.showNovideoRemote[remoteFeed.rfindex] = false;
                    this.showBitrateRemote[remoteFeed.rfindex] = false;
                    this.showCurresRemote[remoteFeed.rfindex] = false;
                    if (this.bitrateTimer[remoteFeed.rfindex] !== null
                        && this.bitrateTimer[remoteFeed.rfindex] !== null) {
                        clearInterval(this.bitrateTimer[remoteFeed.rfindex]);
                    }
                    this.bitrateTimer[remoteFeed.rfindex] = {};
                    remoteFeed.simulcastStarted = false;
                }
            });
    }

    private attachMethod(): void {

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
                                this.sfutest = pluginHandle;
                                Janus.log('Plugin attached! (' +
                                    this.sfutest.getPlugin() + ', id=' + this.sfutest.getId() + ')');
                                Janus.log('  -- This is a publisher/manager');
                                this.showVideoJoin = true;
                                this.showRegisternow = true;
                                // $('#username').focus();
                            },
                            error: (error) => {
                                console.error('  -- Error attaching plugin...', error);
                                this.subjectService.publish('alert', 'Error attaching plugin... ' + error);
                            },
                            consentDialog: (on) => {
                                Janus.debug('Consent dialog should be ' + (on ? 'on' : 'off') + ' now');
                                if (on) {
                                } else {
                                }
                            },
                            iceState: (state) => {
                                Janus.log('ICE state changed to ' + state);
                            },
                            mediaState: (medium, on) => {
                                Janus.log('Janus ' + (on ? 'started' : 'stopped') + ' receiving our ' + medium);
                            },
                            webrtcState: (on) => {
                                Janus.log('Janus says our WebRTC PeerConnection is ' + (on ? 'up' : 'down') + ' now');
                            },
                            slowLink: (uplink, nacks) => {
                                Janus.warn('Janus reports problems ' + (uplink ? 'sending' : 'receiving') +
                                ' packets on this PeerConnection (' + nacks + ' NACKs/s ' + (uplink ? 'received' : 'sent') + ')');
                            },
                            onmessage: (msg, jsep) => {
                                Janus.debug(' ::: Got a message :::');
                                Janus.debug(msg);
                                const event = msg['videoroom'];
                                Janus.debug('Event: ' + event);
                                if (event !== undefined && event != null) {
                                    if (event === 'joined') {
                                        this.myid = msg['id'];
                                        this.mypvtid = msg['private_id'];
                                        Janus.log(
                                            'Successfully joined room ' +
                                            msg['room'] + ' with ID ' + this.myid);
                                        this.publishOwnFeed(true);
                                        // Any new feed to attach to?
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
                                                    Janus.debug(
                                                        '  >> [' + id + '] ' + display +
                                                        ' (audio: ' + audio + ', video: ' + video + ')');
                                                    this.newRemoteFeed(id, display, audio, video);
                                                }
                                            }
                                        }
                                    } else if (event === 'destroyed') {
                                        // The room has been destroyed
                                        Janus.warn('The room has been destroyed!');
                                        // befor bootbox
                                        console.log('The room has been destroyed', () => {
                                            window.location.reload();
                                        });
                                    } else if (event === 'event') {
                                        // Any new feed to attach to?
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
                                                    Janus.debug(
                                                        '  >> [' + id + '] ' + display +
                                                        ' (audio: ' + audio + ', video: ' + video + ')');
                                                    this.newRemoteFeed(id, display, audio, video);
                                                }
                                            }
                                        } else if (msg['leaving'] !== undefined && msg['leaving'] !== null) {
                                            // One of the publishers has gone away?
                                            const leaving = msg['leaving'];
                                            Janus.log('Publisher left: ' + leaving);
                                            let remoteFeed = null;
                                            for (let i = 1; i < 6; i++) {
                                                if (this.feeds[i] != null
                                                    && this.feeds[i] !== undefined
                                                    && this.feeds[i].rfid === leaving) {
                                                    remoteFeed = this.feeds[i];
                                                    break;
                                                }
                                            }
                                            if (remoteFeed != null) {
                                                Janus.debug(
                                                    'Feed ' + remoteFeed.rfid +
                                                    ' (' + remoteFeed.rfdisplay + ') has left the room, detaching');
                                                this.showRemote[remoteFeed.rfindex] = false;
                                                this.resetRemoteVideo(remoteFeed.rfindex);
                                                this.feeds[remoteFeed.rfindex] = null;
                                                remoteFeed.detach();
                                            }
                                        } else if (msg['unpublished'] !== undefined && msg['unpublished'] !== null) {
                                            // One of the publishers has unpublished?
                                            const unpublished = msg['unpublished'];
                                            Janus.log('Publisher left: ' + unpublished);
                                            if (unpublished === 'ok') {
                                                // That's us
                                                this.sfutest.hangup();
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
                                                Janus.debug(
                                                    'Feed ' + remoteFeed.rfid +
                                                    ' (' + remoteFeed.rfdisplay + ') has left the room, detaching');
                                                this.showRemote[remoteFeed.rfindex] = false;
                                                this.resetRemoteVideo(remoteFeed.rfindex);
                                                this.feeds[remoteFeed.rfindex] = null;
                                                remoteFeed.detach();
                                            }
                                        } else if (msg['error'] !== undefined && msg['error'] !== null) {
                                            if (msg['error_code'] === 426) {
                                                // This is a "no such room" error: give a more meaningful description
                                                // before bootbox
                                                console.log(
                                '<p>Apparently room <code>' + this.myroom + '</code> (the one this demo uses as a test room) ' +
                                'does not exist...</p><p>Do you have an updated <code>janus.plugin.videoroom.cfg</code> ' +
                                'configuration file? If not, make sure you copy the details of room <code>' + this.myroom + '</code> ' +
                                'from that sample in your current configuration file, then restart Janus and try again.'
                                                );
                                            } else {
                                                // before bootbox
                                                console.log(msg['error']);
                                            }
                                        }
                                    }
                                }
                                if (jsep !== undefined && jsep !== null) {
                                    Janus.debug('Handling SDP as well...');
                                    Janus.debug(jsep);
                                    this.sfutest.handleRemoteJsep({jsep: jsep});
                                    // Check if any of the media we wanted to publish has
                                    // been rejected (e.g., wrong or unsupported codec)
                                    const audio = msg['audio_codec'];
                                    if (this.mystream
                                        && this.mystream.getAudioTracks()
                                        && this.mystream.getAudioTracks().length > 0 && !audio) {
                                        // Audio has been rejected

                                        // before toastr
                                        console.log(
                                            'Our audio stream has been rejected, viewers won`t hear us');
                                    }
                                    const video = msg['video_codec'];
                                    if (this.mystream
                                        && this.mystream.getVideoTracks()
                                        && this.mystream.getVideoTracks().length > 0 && !video) {
                                        // Video has been rejected

                                        // before toastr
                                        console.log('Our video stream has been rejected, viewers won`t see us');
                                        // Hide the webcam video
                                        this.showMyvideo = false;

                                        // before 自分のストリームがない場合の画面表示
                                    }
                                }
                            },
                            onlocalstream: (stream) => {
                                Janus.debug(' ::: Got a local stream :::');
                                Janus.debug(stream);
                                if (this.showMyvideo === false) {
                                    this.showVideos = true;
                                    this.showVideoJoin = false;
                                }
                                Janus.attachMediaStream(
                                    document.getElementById('myvideo'),
                                    stream
                                );
                                this.myvideoState.muted = 'muted';
                                if (this.sfutest.webrtcStuff.pc.iceConnectionState !== 'completed' &&
                                        this.sfutest.webrtcStuff.pc.iceConnectionState !== 'connected') {
                                    // No remote video yet
                                    this.showMyvideo = true;

                                }
                                const videoTracks = stream.getVideoTracks();
                                if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                                    // No webcam
                                    this.showMyvideo = false;
                                } else {
                                    this.showMyvideo = true;
                                }
                            },
                            onremotestream: (stream) => {

                            },
                            oncleanup: () => {
                                Janus.log(' ::: Got a cleanup notification :::');
                                console.log('load', 'hide');

                                if (this.bitrateTimer) {
                                    clearInterval(this.bitrateTimer);
                                }
                                this.AllResetRemoteVideo();
                                this.bitrateTimer = null;
                                this.showMyvideo = false;
                                this.showWaitingvideo = false;
                                this.showPeervideo = false;
                                this.simulcastStarted = false;
                            }
                        });
                },
                error: (error) => {
                    Janus.error(error);
                    window.location.reload();
                },
                destroyed: function() {
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


    private resetRemoteVideo(i): void {
        this.showNovideoRemote[i] = false;
        this.showWaitingRemote[i] = false;
        this.showCurresRemote[i] = false;
        this.showBitrateRemote[i] = false;
    }

    private AllResetRemoteVideo(): void {
        this.showRemote = [false, false, false, false, false];
        this.showWaitingRemote = [false, false, false, false, false];
        this.showNovideoRemote = [false, false, false, false, false];
        this.showBitrateRemote = [false, false, false, false, false];
        this.showCurresRemote = [false, false, false, false, false];
        this.remote = [false, false, false, false, false];
        this.remoteCurres = ['', '', '', '', ''];
        this.remoteBitrate = ['', '', '', '', ''];
        this.remoteBitrateTimer = [{}, {}, {}, {}, {}];
    }
}


