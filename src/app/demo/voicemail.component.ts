import { Component, OnInit } from '@angular/core';
// import { JanusService } from '../service';
// import * as Janus from 'janus-ts';
declare var adapter: any;
declare var Janus: any;
import { SubjectsService } from '../service';

@Component({
  selector: 'app-echotest',
  templateUrl: './echotest.component.html',
  styleUrls: [
      '../app.component.css',
      './echotest.component.scss'
    ]
})

export class EchoTestComponent implements OnInit {

    private server = null;
    private janus = null;
    private echotest = null;
    private opaqueId = '';

    private bitrateTimer = null;
    private spinner = null;

    private doSimulcast = false;
    private simulcastStarted = false;

    public showVideos = false;
    public showMyvideo = false;
    public showWaitingvideo = false;
    public showPeervideo = false;
    public showSimulcast = false;

    public showVideoLeft = false;

    public onToggleaudio = true;
    public onTogglevideo = true;
    public onBitrate = false;
    public onDatasend = false;

    public onStart = false;

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

        this.opaqueId = 'echotest-' + Janus.randomString(12);
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
        this.echotest.send({'message': { 'audio': this.onToggleaudio }});
    }

    public toggleVideo(): void {
        if (this.onTogglevideo) {
            this.onTogglevideo = false;
        } else {
            this.onTogglevideo = true;
        }
        this.echotest.send({'message': { 'video': this.onTogglevideo }});
    }
    public setBitrate(rate): void {
        const bitrate = rate * 1000;
        if (bitrate === 0) {
            Janus.log('Not limiting bandwidth via REMB');
        } else {
            Janus.log('Capping bandwidth to ' + bitrate + ' via REMB');
        }
        this.echotest.send({'message': { 'bitrate': bitrate }});
    }

    public playPeervideo(): void {
        this.showWaitingvideo = false;
        this.showPeervideo = true;
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
                            plugin: 'janus.plugin.echotest',
                            opaqueId: this.opaqueId,
                            success: (pluginHandle) => {
                                this.echotest = pluginHandle;
                                Janus.log('Plugin attached! (' +
                                    this.echotest.getPlugin() + ', id=' + this.echotest.getId() + ')');
                                // Negotiate WebRTC
                                const body = { 'audio': true, 'video': true };
                                Janus.debug('Sending message (' + JSON.stringify(body) + ')');
                                this.echotest.send({'message': body});
                                Janus.debug('Trying a createOffer too (audio/video sendrecv)');
                                this.echotest.createOffer(
                                    {
                                        media: { data: true },
                                        simulcast: this.doSimulcast,
                                        success: (jsep) => {
                                            Janus.debug('Got SDP!');
                                            Janus.debug(jsep);
                                            this.echotest.send({'message': body, 'jsep': jsep});
                                        },
                                        error: (error) => {
                                            Janus.error('WebRTC error:', error);
                                            console.log('WebRTC error... ' + JSON.stringify(error));
                                        }
                                    });
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
                                if (jsep !== undefined && jsep !== null) {
                                    Janus.debug('Handling SDP as well...');
                                    Janus.debug(jsep);
                                    this.echotest.handleRemoteJsep({jsep: jsep});
                                }
                                const result = msg['result'];
                                if (result !== null && result !== undefined) {
                                    if (result === 'done') {
                                        // The plugin closed the echo test
                                        console.log('The Echo Test is over');
                                        if (this.spinner !== null && this.spinner !== undefined) {
                                            this.spinner.stop();
                                        }
                                        this.spinner = null;
                                        this.showMyvideo = false;
                                        this.showWaitingvideo = false;
                                        this.showPeervideo = false;
                                        this.onToggleaudio = false;
                                        this.onTogglevideo = false;
                                        this.onBitrate = false;

                                        return;
                                    }
                                    // Any loss?
                                    const status = result['status'];
                                    if (status === 'slow_link') {
                                        this.subjectService.publish(
                                            'alert',
                                            'Janus apparently missed many packets we sent, maybe we should reduce the bitrate' +
                                            'Packet loss?'
                                        );
                                    }
                                }
                            },
                            onlocalstream: (stream) => {
                                Janus.debug(' ::: Got a local stream :::');
                                Janus.debug(stream);
                                if (this.showMyvideo === false) {
                                    this.showVideos = true;
                                    this.showVideoLeft = true;
                                }
                                Janus.attachMediaStream(
                                    document.getElementById('myvideo'),
                                    stream
                                );
                                this.myvideoState.muted = 'muted';
                                if (this.echotest.webrtcStuff.pc.iceConnectionState !== 'completed' &&
                                        this.echotest.webrtcStuff.pc.iceConnectionState !== 'connected') {
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
                                Janus.debug(' ::: Got a remote stream :::');
                                Janus.debug(stream);
                                let addButtons = false;
                                if (this.showPeervideo === false) {
                                    addButtons = true;
                                    this.showVideos = true;
                                    this.showPeervideo = true;
                                }
                                Janus.attachMediaStream(
                                    document.getElementById('peervideo'),
                                    stream
                                );
                                const videoTracks = stream.getVideoTracks();
                                if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                                    // No remote video
                                    this.showPeervideo = false;
                                } else {
                                    this.showPeervideo = true;
                                }
                                if (!addButtons) {
                                    return;
                                }

                                if (Janus.webRTCAdapter.browserDetails.browser === 'chrome'
                                    || Janus.webRTCAdapter.browserDetails.browser === 'firefox'
                                    || Janus.webRTCAdapter.browserDetails.browser === 'safari') {
                                    this.bitrateTimer = setInterval(() => {
                                        // Display updated bitrate, if supported
                                        const bitrate = this.echotest.getBitrate();
                                        // ~ Janus.debug("Current bitrate is " + echotest.getBitrate());
                                        this.showBitrate = bitrate;
                                        // Check if the resolution changed too
                                    }, 1000);
                                }
                            },
                            ondataopen: (data) => {
                                Janus.log('The DataChannel is available!');
                                this.showVideos = true;
                            },
                            ondata: (data) => {
                                Janus.debug('We got data from the DataChannel! ' + data);
                            },
                            oncleanup: () => {
                                Janus.log(' ::: Got a cleanup notification :::');
                                console.log('load', 'hide');

                                if (this.bitrateTimer) {
                                    clearInterval(this.bitrateTimer);
                                }
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
}


