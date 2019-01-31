import { Injectable } from '@angular/core';
import webrtcadapter from 'webrtc-adapter';

@Injectable()
export class JanusService {

    // 初期化完了フラグ
    private initDone: boolean|undefined;

    // セッション変数
    private session: any = {};
    // log 変数
    public trace    = this.noop;
    public debug    = this.noop;
    public vdebug   = this.noop;
    public log      = this.noop;
    public warn     = this.noop;
    public error    = this.noop;

    // janus メソッド
    private isArray: any = {};
    public webRTCAdapter: any = {};
    private httpAPICall: any = {};
    private newWebSocket: any = {};
    private extension: any = {};
    private listDevices: any = {};
    public attachMediaStream: any = {};
    private reattachMediaStream: any = {};

    // If this is a Safari Technology Preview, check if VP8 is supported
    private safariVp8 = true;

    // Public methods
    public getServer: any = {};
    public isConnected: any = {};
    public reconnect: any = {};
    public getSessionId: any = {};
    public destroy: any = {};
    public attach: any = {};

    // websocket
    private websockets = false;
    private ws = null;
    private wsHandlers = {};
    private wsKeepaliveTimeoutId = null;

    // signaling server
    private servers = null;
    private serversIndex = 0;
    private server;

    // ice server
    private iceServers;
    private iceTransportPolicy;
    private bundlePolicy;
    // ipv6
    private ipv6Support;
    // 暗号化？
    private withCredentials = false;
    // Optional max events
    private maxev = null;
    // Token to use (only if the token based authentication mechanism is enabled)
    private token = null;
    // API secret to use (only if the shared API secret is enabled)
    private apisecret = null;

    private destroyOnUnload = false;
    // Some timeout-related values
    private keepAlivePeriod = 25000;

    private longPollTimeout = 60000;

    // session and connection
    private connected = false;
    private sessionId = null;
    private pluginHandles = {};
    private that = this;
    private retries = 0;
    private transactions = {};


    private gC: any;

    private sessions = {};
    private cache = {};

    private defaultExtension: any = {
        // Screensharing Chrome Extension ID
        extensionId: 'hapfgfdkleiggjjpfpenajgdnfckjpaj',
        isInstalled: () => document.querySelector('#janus-extension-installed') !== null,
        getScreen: (callback) => {
            const pending = window.setTimeout(() => {
                const error = new Error('NavigatorUserMediaError');
                error.name = 'The required Chrome extension is not installed:' +
                ' click <a href="#">here</a> to install it. (NOTE: this will need you to refresh the page)';
                return callback(error);
            }, 1000);
            this.cache[pending] = callback;
            window.postMessage({ type: 'janusGetScreen', id: pending }, '*');
        },
        init: () => {
            const cache = {};
            this.cache = cache;
            // Wait for events from the Chrome Extension
            window.addEventListener('message', (event) => {
                if (event.origin !== window.location.origin) {
                    return;
                }
                if (event.data.type === 'janusGotScreen' && cache[event.data.id]) {
                    const callback = cache[event.data.id];
                    delete cache[event.data.id];

                    if (event.data.sourceId === '') {
                        // user canceled
                        const error = new Error('NavigatorUserMediaError');
                        error.name = 'You cancelled the request for permission, giving up...';
                        callback(error);
                    } else {
                        callback(null, event.data.sourceId);
                    }
                } else if (event.data.type === 'janusGetScreenPending') {
                    console.log('clearing ', event.data.id);
                    window.clearTimeout(event.data.id);
                }
            });
        }
    };


    constructor(
        private adapter: webrtcadapter
    ) {}


    public isExtensionEnabled(): any {
        if (typeof(navigator['getDisplayMedia']) === 'function') {
            // No need for the extension, getDisplayMedia is supported
            return true;
        }
        if (window.navigator.userAgent.match('Chrome')) {
            const chromever = parseInt(window.navigator.userAgent.match(/Chrome\/(.*) /)[1], 10);
            let maxver = 33;
            if ( window.navigator.userAgent.match('Linux')) {
                maxver = 35;    // 'known' crash in chrome 34 and 35 on linux
            }
            if (chromever >= 26 && chromever <= maxver) {
                // Older versions of Chrome don't support this extension-based approach, so lie
                return true;
            }
            return this.extension.isInstalled();
        } else {
            // Firefox of others, no need for the extension (but this doesn't mean it will work)
            return true;
        }
    }

    public useDefaultDependencies(deps: any = {}): any {
        const f = (deps && deps.fetch) || fetch;
        const p = (deps && deps.Promise) || Promise;
        const socketCls = (deps && deps.WebSocket) || WebSocket;

        return {
            newWebSocket: (server, proto) => new socketCls(server, proto),
            extension: (deps && deps.extension) || this.defaultExtension,
            isArray: (arr) => Array.isArray(arr),
            webRTCAdapter: (deps && deps.adapter) || this.adapter,
            httpAPICall: (url, options) => {
                const fetchOptions = {
                    method: options.verb,
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    },
                    cache: 'no-cache',
                    credentials: '',
                    body: ''
                };
                if (options.verb === 'POST') {
                    fetchOptions.headers['Content-Type'] = 'application/json';
                }
                if (options.withCredentials !== undefined) {
                    if (options.withCredentials === true) {
                        fetchOptions.credentials = 'include';
                    } else {
                        fetchOptions.credentials = (options.withCredentials ? options.withCredentials : 'omit');
                    }
                }
                if (options.body !== undefined) {
                    fetchOptions.body = JSON.stringify(options.body);
                }

                let fetching = f(url, fetchOptions).catch((error) => {
                    return p.reject({message: 'Probably a network error, is the server down?', error: error});
                });

                /*
                 * fetch() does not natively support timeouts.
                 * Work around this by starting a timeout manually, and racing it agains the fetch() to see which thing resolves first.
                 */

                if (options.timeout !== undefined) {
                    const timeout = new p((resolve, reject) => {
                        const timerId = setTimeout(() => {
                            clearTimeout(timerId);
                            return reject({message: 'Request timed out', timeout: options.timeout});
                        }, options.timeout);
                    });
                    fetching = p.race([fetching, timeout]);
                }

                fetching.then((response) => {
                    if (response.ok) {
                        if (typeof(options.success) === typeof(this.noop)) {
                            return response.json().then((parsed) => {
                                options.success(parsed);
                            }).catch((error) => {
                                return p.reject({message: 'Failed to parse response body', error: error, response: response});
                            });
                        }
                    } else {
                        return p.reject({message: 'API call failed', response: response});
                    }
                }).catch((error) => {
                    if (typeof(options.error) === typeof(this.noop)) {
                        options.error(error.message || '<< internal error >>', error);
                    }
                });

                return fetching;
            }
        };
    }

    public init(options): any {
        options = options || {};
        options.callback = (typeof options.callback === 'function') ? options.callback : this.noop;
        if (this.initDone === true) {
            // Already initialized
            options.callback();
        } else {
            if (typeof console === 'undefined' || typeof console.log === 'undefined') {
                const console = { log: () => {} };
            }
            // Console logging (all debugging disabled by default)
            if (options.debug === true || options.debug === 'all') {
                // Enable all debugging levels
                this.trace = console.trace.bind(console);
                this.debug = console.debug.bind(console);
                this.vdebug = console.debug.bind(console);
                this.log = console.log.bind(console);
                this.warn = console.warn.bind(console);
                this.error = console.error.bind(console);
            } else if (Array.isArray(options.debug)) {
                for (const i in options.debug) {
                    if (options.debug.hasOwnProperty(i)) {
                        const d = options.debug[i];
                        switch (d) {
                            case 'trace':
                                this.trace = console.trace.bind(console);
                                break;
                            case 'debug':
                                this.debug = console.debug.bind(console);
                                break;
                            case 'vdebug':
                                this.vdebug = console.debug.bind(console);
                                break;
                            case 'log':
                                this.log = console.log.bind(console);
                                break;
                            case 'warn':
                                this.warn = console.warn.bind(console);
                                break;
                            case 'error':
                                this.error = console.error.bind(console);
                                break;
                            default:
                                console.error('Unknown debugging option "' + d +
                                '" (supported: "trace", "debug", "vdebug", "log", "warn", "error")');
                                break;
                        }
                    }
                }
            }
            this.log('Initializing library');

            const usedDependencies = options.dependencies || this.useDefaultDependencies();
            this.isArray = usedDependencies.isArray;
            this.webRTCAdapter = usedDependencies.webRTCAdapter;
            this.httpAPICall = usedDependencies.httpAPICall;
            this.newWebSocket = usedDependencies.newWebSocket;
            this.extension = usedDependencies.extension;
            this.extension.init();

            // Helper method to enumerate devices
            this.listDevices = (callback, config) => {
                callback = (typeof callback === 'function') ? callback : this.noop;
                if (config == null) {
                    config = { audio: true, video: true };
                }
                if (navigator.mediaDevices) {
                    navigator.mediaDevices.getUserMedia(config)
                    .then((stream) => {
                        navigator.mediaDevices.enumerateDevices().then((devices) => {
                            this.debug(devices);
                            callback(devices);
                            // Get rid of the now useless stream
                            try {
                                const tracks = stream.getTracks();
                                for (const i in tracks) {
                                    if (tracks.hasOwnProperty(i)) {
                                        const mst = tracks[i];
                                        if (mst !== null && mst !== undefined) {
                                            mst.stop();
                                        }
                                    }
                                }
                            } catch (e) {}
                        });
                    })
                    .catch((err) => {
                        this.error(err);
                        callback([]);
                    });
                } else {
                    this.warn('navigator.mediaDevices unavailable');
                    callback([]);
                }
            };
            // Helper methods to attach/reattach a stream to a video element (previously part of adapter.js)
            this.attachMediaStream = (element, stream) => {
                if (this.webRTCAdapter.browserDetails.browser === 'chrome') {
                    const chromever = this.webRTCAdapter.browserDetails.version;
                    if (chromever >= 52) {
                        element.srcObject = stream;
                    } else if (typeof element.src !== 'undefined') {
                        element.src = URL.createObjectURL(stream);
                    } else {
                        this.error('Error attaching stream to element');
                    }
                } else {
                    element.srcObject = stream;
                }
            };
            this.reattachMediaStream = (to, from) => {
                if (this.webRTCAdapter.browserDetails.browser === 'chrome') {
                    const chromever = this.webRTCAdapter.browserDetails.version;
                    if (chromever >= 52) {
                        to.srcObject = from.srcObject;
                    } else if (typeof to.src !== 'undefined') {
                        to.src = from.src;
                    } else {
                        this.error('Error reattaching stream to element');
                    }
                } else {
                    to.srcObject = from.srcObject;
                }
            };
            // Detect tab close: make sure we don't loose existing onbeforeunload handlers
            // (note: for iOS we need to subscribe to a different event, 'pagehide', see
            // https://gist.github.com/thehunmonkgroup/6bee8941a49b86be31a787fe8f4b8cfe)
            const iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
            const eventName = iOS ? 'pagehide' : 'beforeunload';
            const oldOBF = window['on' + eventName];
            window.addEventListener(eventName, (event) => {
                this.log('Closing window');
                for (const s in this.sessions) {
                    if (this.sessions[s] !== null && this.sessions[s] !== undefined &&
                            this.sessions[s].destroyOnUnload) {
                        this.log('Destroying session ' + s);
                        this.sessions[s].destroy({asyncRequest: false, notifyDestroyed: false});
                    }
                }
                if (oldOBF && typeof oldOBF === 'function') {
                    oldOBF();
                }
            });
            // If this is a Safari Technology Preview, check if VP8 is supported
            this.safariVp8 = false;
            if (this.webRTCAdapter.browserDetails.browser === 'safari' &&
                    this.webRTCAdapter.browserDetails.version >= 605) {
                // We do it in a very ugly way, as there's no alternative...
                // We create a PeerConnection to see if VP8 is in an offer
                options = {
                    'mandatory': {
                      'OfferToReceiveVideo': true
                    }
                  };
                let testpc = new RTCPeerConnection({});
                testpc.createOffer((offer) => {
                    this.safariVp8 = offer.sdp.indexOf('VP8') !== -1;
                    if (this.safariVp8) {
                        this.log('This version of Safari supports VP8');
                    } else {
                        this.warn('This version of Safari does NOT support VP8: if you`re using a Technology Preview, ' +
                        'try enabling the "WebRTC VP8 codec" setting in the "Experimental Features" Develop menu');
                    }
                    testpc.close();
                    testpc = null;
                }, (error) => {

                }, options);
            }
            this.initDone = true;
            options.callback();
        }
    }

    // Helper method to check whether WebRTC is supported by this browser
    public isWebrtcSupported(): boolean {
        if (navigator.getUserMedia !== undefined
            && navigator.getUserMedia !== null) {
            return true;
        }
        return false;

    }

    // Helper method to create random identifiers (e.g., transaction)
    public randomString(len): string {
        const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        for (let i = 0; i < len; i++) {
            const randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return randomString;
    }

    private noop(d: any): void {}

    public setGatewayCallbacks(gatewayCallbacks: object): void {
        this.gC = gatewayCallbacks || {};
    }

    private initial(): object {
        if (this.initDone === undefined) {
            this.gC.error('Library not initialized');
            return {};
        }
        if (!this.isWebrtcSupported()) {
            this.gC.error('WebRTC not supported by this browser');
            return {};
        }
        this.log('Library initialized: ' + this.initDone);
        this.gC.success = (typeof this.gC.success === 'function') ? this.gC.success : this.noop;
        this.gC.error = (typeof this.gC.error === 'function') ? this.gC.error : this.noop;
        this.gC.destroyed = (typeof this.gC.destroyed === 'function') ? this.gC.destroyed : this.noop;
        if (this.gC.server === null || this.gC.server === undefined) {
            this.gC.error('Invalid server url');
            return {};
        }
        this.websockets = false;
        this.ws = null;
        this.wsHandlers = {};
        this.wsKeepaliveTimeoutId = null;

        this.servers = null;
        this.serversIndex = 0;
        this.server = this.gC.server;
        if (this.isArray(this.server)) {
            this.log('Multiple servers provided (' + this.server.length + '), will use the first that works');
            this.server = null;
            this.servers = this.gC.server;
            this.debug(this.servers);
        } else {
            if (this.server.indexOf('ws') === 0) {
                this.websockets = true;
                this.log('Using WebSockets to contact Janus: ' + this.server);
            } else {
                this.websockets = false;
                this.log('Using REST API to contact Janus: ' + this.server);
            }
        }
        this.iceServers = this.gC.iceServers;
        if (this.iceServers === undefined || this.iceServers === null) {
            this.iceServers = [{urls: 'stun:stun.l.google.com:19302'}];
        }

        this.iceTransportPolicy = this.gC.iceTransportPolicy;
        this.bundlePolicy = this.gC.bundlePolicy;
        // Whether IPv6 candidates should be gathered
        this.ipv6Support = this.gC.ipv6;
        if (this.ipv6Support === undefined || this.ipv6Support === null) {
            this.ipv6Support = false;
        }
        // Whether we should enable the withCredentials flag for XHR requests
        this.withCredentials = false;
        if (this.gC.withCredentials !== undefined && this.gC.withCredentials !== null) {
            this.withCredentials = this.gC.withCredentials === true;
        }
        // Optional max events
        this.maxev = null;
        if (this.gC.max_poll_events !== undefined && this.gC.max_poll_events !== null) {
            this.maxev = this.gC.max_poll_events;
        }
        if (this.maxev < 1) {
            this.maxev = 1;
        }
        // Token to use (only if the token based authentication mechanism is enabled)
        this.token = null;
        if (this.gC.token !== undefined && this.gC.token !== null) {
            this.token = this.gC.token;
        }
        // API secret to use (only if the shared API secret is enabled)
        this.apisecret = null;
        if (this.gC.apisecret !== undefined && this.gC.apisecret !== null) {
            this.apisecret = this.gC.apisecret;
        }
        // Whether we should destroy this session when onbeforeunload is called
        this.destroyOnUnload = true;
        if (this.gC.destroyOnUnload !== undefined && this.gC.destroyOnUnload !== null) {
            this.destroyOnUnload = (this.gC.destroyOnUnload === true);
        }
        // Some timeout-related values
        if (this.gC.keepAlivePeriod !== undefined && this.gC.keepAlivePeriod !== null) {
            this.keepAlivePeriod = this.gC.keepAlivePeriod;
        }
        if (isNaN(this.keepAlivePeriod)) {
            this.keepAlivePeriod = 25000;
        }
        if (this.gC.longPollTimeout !== undefined && this.gC.longPollTimeout !== null) {
            this.longPollTimeout = this.gC.longPollTimeout;
        }
        if (isNaN(this.longPollTimeout)) {
            this.longPollTimeout = 60000;
        }

        this.connected = false;
        this.sessionId = null;
        this.pluginHandles = {};
        this.that = this;
        this.retries = 0;
        this.transactions = {};
        this.createSession(this.gC);

        // Public methods
        // const getServer = () => this.server;
        this.isConnected = () => this.connected;
        this.reconnect = (callbacks) => {
            callbacks = callbacks || {};
            callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
            callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
            callbacks['reconnect'] = true;
            this.createSession(callbacks);
        };
        this.getSessionId = () => this.sessionId;
        this.destroy = (callbacks) => { this.destroySession(callbacks); };
        this.attach = (callbacks) => { this.createHandle(callbacks); };
    }


    private eventHandler(): void {
        if (this.sessionId == null) {
            return;
        }
        this.debug('Long poll...');
        if (!this.connected) {
            this.warn('Is the server down? (connected=false)');
            return;
        }
        let longpoll = this.server + '/' + this.sessionId + '?rid=' + new Date().getTime();
        if (this.maxev !== undefined && this.maxev !== null) {
            longpoll = longpoll + '&maxev=' + this.maxev;
        }
        if (this.token !== null && this.token !== undefined) {
            longpoll = longpoll + '&token=' + encodeURIComponent(this.token);
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            longpoll = longpoll + '&apisecret=' + encodeURIComponent(this.apisecret);
        }
        this.httpAPICall(longpoll, {
            verb: 'GET',
            withCredentials: this.withCredentials,
            success: this.handleEvent,
            timeout: this.longPollTimeout,
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);
                this.retries++;
                if (this.retries > 3) {
                    // Did we just lose the server? :-(
                    this.connected = false;
                    this.gC.error('Lost connection to the server (is it down?)');
                    return;
                }
                this.eventHandler();
            }
        });
    }

    // Private event handler: this will trigger plugin callbacks, if set
    private handleEvent(json, skipTimeout = true) {
        this.retries = 0;
        if (!this.websockets && this.sessionId !== undefined && this.sessionId !== null && skipTimeout !== true) {
            setTimeout(this.eventHandler, 200);
        }
        if (!this.websockets && this.isArray(json)) {
            // We got an array: it means we passed a maxev > 1, iterate on all objects
            for (let i = 0; i < json.length; i++) {
                this.handleEvent(json[i], true);
            }
            return;
        }
        if (json['janus'] === 'keepalive') {
            // Nothing happened
            this.vdebug('Got a keepalive on session ' + this.sessionId);
            return;
        } else if (json['janus'] === 'ack') {
            // Just an ack, we can probably ignore
            this.debug('Got an ack on session ' + this.sessionId);
            this.debug(json);
            const transaction = json['transaction'];
            if (transaction !== null && transaction !== undefined) {
                const reportSuccess = this.transactions[transaction];
                if (reportSuccess !== null && reportSuccess !== undefined) {
                    reportSuccess(json);
                }
                delete this.transactions[transaction];
            }
            return;
        } else if (json['janus'] === 'success') {
            // Success!
            this.debug('Got a success on session ' + this.sessionId);
            this.debug(json);
            const transaction = json['transaction'];
            if (transaction !== null && transaction !== undefined) {
                const reportSuccess = this.transactions[transaction];
                if (reportSuccess !== null && reportSuccess !== undefined) {
                    reportSuccess(json);
                }
                delete this.transactions[transaction];
            }
            return;
        } else if (json['janus'] === 'trickle') {
            // We got a trickle candidate from Janus
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                this.debug('This handle is not attached to this session');
                return;
            }
            const candidate = json['candidate'];
            this.debug('Got a trickled candidate on session ' + this.sessionId);
            this.debug(candidate);
            const config = pluginHandle.webrtcStuff;
            if (config.pc && config.remoteSdp) {
                // Add candidate right now
                this.debug('Adding remote candidate:' + candidate);
                if (!candidate || candidate.completed === true) {
                    // end-of-candidates
                    config.pc.addIceCandidate();
                } else {
                    // New candidate
                    config.pc.addIceCandidate(candidate);
                }
            } else {
                // We didn't do setRemoteDescription (trickle got here before the offer?)
                this.debug('We didn`t do setRemoteDescription (trickle got here before the offer?), caching candidate');
                if (!config.candidates) {
                    config.candidates = [];
                }
                config.candidates.push(candidate);
                this.debug(config.candidates);
            }
        } else if (json['janus'] === 'webrtcup') {
            // The PeerConnection with the server is up! Notify this
            this.debug('Got a webrtcup event on session ' + this.sessionId);
            this.debug(json);
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                this.debug('This handle is not attached to this session');
                return;
            }
            pluginHandle.webrtcState(true);
            return;
        } else if (json['janus'] === 'hangup') {
            // A plugin asked the core to hangup a PeerConnection on one of our handles
            this.debug('Got a hangup event on session ' + this.sessionId);
            this.debug(json);
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                this.debug('This handle is not attached to this session');
                return;
            }
            pluginHandle.webrtcState(false, json['reason']);
            pluginHandle.hangup();
        } else if (json['janus'] === 'detached') {
            // A plugin asked the core to detach one of our handles
            this.debug('Got a detached event on session ' + this.sessionId);
            this.debug(json);
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                // Don't warn here because destroyHandle causes this situation.
                return;
            }
            pluginHandle.detached = true;
            pluginHandle.ondetached();
            pluginHandle.detach();
        } else if (json['janus'] === 'media') {
            // Media started/stopped flowing
            this.debug('Got a media event on session ' + this.sessionId);
            this.debug(json);
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                this.debug('This handle is not attached to this session');
                return;
            }
            pluginHandle.mediaState(json['type'], json['receiving']);
        } else if (json['janus'] === 'slowlink') {
            this.debug('Got a slowlink event on session ' + this.sessionId);
            this.debug(json);
            // Trouble uplink or downlink
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                this.debug('This handle is not attached to this session');
                return;
            }
            pluginHandle.slowLink(json['uplink'], json['nacks']);
        } else if (json['janus'] === 'error') {
            // Oops, something wrong happened
            this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
            this.debug(json);
            const transaction = json['transaction'];
            if (transaction !== null && transaction !== undefined) {
                const reportSuccess = this.transactions[transaction];
                if (reportSuccess !== null && reportSuccess !== undefined) {
                    reportSuccess(json);
                }
                delete this.transactions[transaction];
            }
            return;
        } else if (json['janus'] === 'event') {
            this.debug('Got a plugin event on session ' + this.sessionId);
            this.debug(json);
            const sender = json['sender'];
            if (sender === undefined || sender === null) {
                this.warn('Missing sender...');
                return;
            }
            const plugindata = json['plugindata'];
            if (plugindata === undefined || plugindata === null) {
                this.warn('Missing plugindata...');
                return;
            }
            this.debug('  -- Event is coming from ' + sender + ' (' + plugindata['plugin'] + ')');
            const data = plugindata['data'];
            this.debug(data);
            const pluginHandle = this.pluginHandles[sender];
            if (pluginHandle === undefined || pluginHandle === null) {
                this.warn('This handle is not attached to this session');
                return;
            }
            const jsep = json['jsep'];
            if (jsep !== undefined && jsep !== null) {
                this.debug('Handling SDP as well...');
                this.debug(jsep);
            }
            const callback = pluginHandle.onmessage;
            if (callback !== null && callback !== undefined) {
                this.debug('Notifying application...');
                // Send to callback specified when attaching plugin handle
                callback(data, jsep);
            } else {
                // Send to generic callback (?)
                this.debug('No provided notification callback');
            }
        } else if (json['janus'] === 'timeout') {
            this.error('Timeout on session ' + this.sessionId);
            this.debug(json);
            if (this.websockets) {
                this.ws.close(3504, 'Gateway timeout');
            }
            return;
        } else {
            this.warn('Unknown message/event  "' + json['janus'] + '" on session ' + this.sessionId);
            this.debug(json);
        }
    }

    // Private helper to send keep-alive messages on WebSockets
    private keepAlive(): void {
        if (this.server === null || !this.websockets || !this.connected) {
            return;
        }
        this.wsKeepaliveTimeoutId = setTimeout(this.keepAlive, this.keepAlivePeriod);
        const request = { 'janus': 'keepalive', 'session_id': this.sessionId, 'transaction': this.randomString(12) };
        if (this.token !== null && this.token !== undefined) {
            request['token'] = this.token;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        this.ws.send(JSON.stringify(request));
    }

    // Private method to create a session
    private createSession(callbacks): void {
        const transaction = this.randomString(12);
        const request = { 'janus': 'create', 'transaction': transaction };
        if (callbacks['reconnect']) {
            // We're reconnecting, claim the session
            this.connected = false;
            request['janus'] = 'claim';
            request['session_id'] = this.sessionId;
            // If we were using websockets, ignore the old connection
            if (this.ws) {
                this.ws.onopen = null;
                this.ws.onerror = null;
                this.ws.onclose = null;
                if (this.wsKeepaliveTimeoutId) {
                    clearTimeout(this.wsKeepaliveTimeoutId);
                    this.wsKeepaliveTimeoutId = null;
                }
            }
        }
        if (this.token !== null && this.token !== undefined) {
            request['token'] = this.token;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        if (this.server === null && this.isArray(this.servers)) {
            // We still need to find a working server from the list we were given
            this.server = this.servers[this.serversIndex];
            if (this.server.indexOf('ws') === 0) {
                this.websockets = true;
                this.log('Server #' + (this.serversIndex + 1) + ': trying WebSockets to contact Janus (' + this.server + ')');
            } else {
                this.websockets = false;
                this.log('Server #' + (this.serversIndex + 1) + ': trying REST API to contact Janus (' + this.server + ')');
            }
        }
        if (this.websockets) {
            this.ws = this.newWebSocket(this.server, 'janus-protocol');
            this.wsHandlers = {
                'error': () => {
                    this.error('Error connecting to the Janus WebSockets server... ' + this.server);
                    if (this.isArray(this.servers) && !callbacks['reconnect']) {
                        this.serversIndex++;
                        if (this.serversIndex === this.servers.length) {
                            // We tried all the servers the user gave us and they all failed
                            callbacks.error('Error connecting to any of the provided Janus servers: Is the server down?');
                            return;
                        }
                        // Let's try the next server
                        this.server = null;
                        setTimeout(() => {
                            this.createSession(callbacks);
                        }, 200);
                        return;
                    }
                    callbacks.error('Error connecting to the Janus WebSockets server: Is the server down?');
                },

                'open': () => {
                    // We need to be notified about the success
                    this.transactions[transaction] = (json) => {
                        this.debug(json);
                        if (json['janus'] !== 'success') {
                            this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                            callbacks.error(json['error'].reason);
                            return;
                        }
                        this.wsKeepaliveTimeoutId = setTimeout(this.keepAlive, this.keepAlivePeriod);
                        this.connected = true;
                        this.sessionId = json['session_id'] ? json['session_id'] : json.data['id'];
                        if (callbacks['reconnect']) {
                            this.log('Claimed session: ' + this.sessionId);
                        } else {
                            this.log('Created session: ' + this.sessionId);
                        }
                        this.sessions[this.sessionId] = this.that;
                        callbacks.success();
                    };
                    this.ws.send(JSON.stringify(request));
                },

                'message': (event) => {
                    this.handleEvent(JSON.parse(event.data));
                },

                'close': () => {
                    if (this.server === null || !this.connected) {
                        return;
                    }
                    this.connected = false;
                    // FIXME What if this is called when the page is closed?
                    this.gC.error('Lost connection to the server (is it down?)');
                }
            };
            for (const eventName in this.wsHandlers) {
                if (this.wsHandlers.hasOwnProperty(eventName)) {
                    this.ws.addEventListener(eventName, this.wsHandlers[eventName]);
                }
            }

            return;
        }
        this.httpAPICall(this.server, {
            verb: 'POST',
            withCredentials: this.withCredentials,
            body: request,
            success: (json) => {
                this.debug(json);
                if (json['janus'] !== 'success') {
                    this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                    callbacks.error(json['error'].reason);
                    return;
                }
                this.connected = true;
                this.sessionId = json['session_id'] ? json['session_id'] : json.data['id'];
                if (callbacks['reconnect']) {
                    this.log('Claimed session: ' + this.sessionId);
                } else {
                    this.log('Created session: ' + this.sessionId);
                }
                this.sessions[this.sessionId] = this.that;
                this.eventHandler();
                callbacks.success();
            },
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);    // FIXME
                if (this.isArray(this.servers) && !callbacks['reconnect']) {
                    this.serversIndex++;
                    if (this.serversIndex === this.servers.length) {
                        // We tried all the servers the user gave us and they all failed
                        callbacks.error('Error connecting to any of the provided Janus servers: Is the server down?');
                        return;
                    }
                    // Let's try the next server
                    this.server = null;
                    setTimeout(() => { this.createSession(callbacks); }, 200);
                    return;
                }
                if (errorThrown === '') {
                    callbacks.error(textStatus + ': Is the server down?');
                } else {
                    callbacks.error(textStatus + ': ' + errorThrown);
                }
            }
        });
    }


    // Private method to destroy a session
    private destroySession(callbacks): void {
        callbacks = callbacks || {};
        // FIXME This method triggers a success even when we fail
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        let asyncRequest = true;
        if (callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null) {
            asyncRequest = (callbacks.asyncRequest === true);
        }
        let notifyDestroyed = true;
        if (callbacks.notifyDestroyed !== undefined && callbacks.notifyDestroyed !== null) {
            notifyDestroyed = (callbacks.notifyDestroyed === true);
        }
        this.log('Destroying session ' + this.sessionId + ' (async=' + asyncRequest + ')');
        if (!this.connected) {
            this.warn('Is the server down? (connected=false)');
            callbacks.success();
            return;
        }
        if (this.sessionId === undefined || this.sessionId === null) {
            this.warn('No session to destroy');
            callbacks.success();
            if (notifyDestroyed) {
                this.gC.destroyed();
            }
            return;
        }
        delete this.sessions[this.sessionId];
        // No need to destroy all handles first, Janus will do that itself
        const request = { 'janus': 'destroy', 'transaction': this.randomString(12) };
        if (this.token !== null && this.token !== undefined) {
            request['token'] = this.token;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        if (this.websockets) {
            request['session_id'] = this.sessionId;

            const unbindWebSocket = () => {
                for (const eventName in this.wsHandlers) {
                    if (this.wsHandlers.hasOwnProperty(eventName)) {
                        this.ws.removeEventListener(eventName, this.wsHandlers[eventName]);
                    }
                }
                this.ws.removeEventListener('message', onUnbindMessage);
                this.ws.removeEventListener('error', onUnbindError);
                if (this.wsKeepaliveTimeoutId) {
                    clearTimeout(this.wsKeepaliveTimeoutId);
                }
                this.ws.close();
            };

            const onUnbindMessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.session_id === request['session_id'] && data.transaction === request.transaction) {
                    unbindWebSocket();
                    callbacks.success();
                    if (notifyDestroyed) {
                        this.gC.destroyed();
                    }
                }
            };
            const onUnbindError = (event) => {
                unbindWebSocket();
                callbacks.error('Failed to destroy the server: Is the server down?');
                if (notifyDestroyed) {
                    this.gC.destroyed();
                }
            };

            this.ws.addEventListener('message', onUnbindMessage);
            this.ws.addEventListener('error', onUnbindError);

            this.ws.send(JSON.stringify(request));
            return;
        }
        this.httpAPICall(this.server + '/' + this.sessionId, {
            verb: 'POST',
            async: asyncRequest,    // Sometimes we need false here, or destroying in onbeforeunload won't work
            withCredentials: this.withCredentials,
            body: request,
            success: (json) => {
                this.log('Destroyed session:');
                this.debug(json);
                this.sessionId = null;
                this.connected = false;
                if (json['janus'] !== 'success') {
                    this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                }
                callbacks.success();
                if (notifyDestroyed) {
                    this.gC.destroyed();
                }
            },
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);    // FIXME
                // Reset everything anyway
                this.sessionId = null;
                this.connected = false;
                callbacks.success();
                if (notifyDestroyed) {
                    this.gC.destroyed();
                }
            }
        });
    }


    // Private method to create a plugin handle
    private createHandle(callbacks): void {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        callbacks.consentDialog = (typeof callbacks.consentDialog === 'function') ? callbacks.consentDialog : this.noop;
        callbacks.iceState = (typeof callbacks.iceState === 'function') ? callbacks.iceState : this.noop;
        callbacks.mediaState = (typeof callbacks.mediaState === 'function') ? callbacks.mediaState : this.noop;
        callbacks.webrtcState = (typeof callbacks.webrtcState === 'function') ? callbacks.webrtcState : this.noop;
        callbacks.slowLink = (typeof callbacks.slowLink === 'function') ? callbacks.slowLink : this.noop;
        callbacks.onmessage = (typeof callbacks.onmessage === 'function') ? callbacks.onmessage : this.noop;
        callbacks.onlocalstream = (typeof callbacks.onlocalstream === 'function') ? callbacks.onlocalstream : this.noop;
        callbacks.onremotestream = (typeof callbacks.onremotestream === 'function') ? callbacks.onremotestream : this.noop;
        callbacks.ondata = (typeof callbacks.ondata === 'function') ? callbacks.ondata : this.noop;
        callbacks.ondataopen = (typeof callbacks.ondataopen === 'function') ? callbacks.ondataopen : this.noop;
        callbacks.oncleanup = (typeof callbacks.oncleanup === 'function') ? callbacks.oncleanup : this.noop;
        callbacks.ondetached = (typeof callbacks.ondetached === 'function') ? callbacks.ondetached : this.noop;
        if (!this.connected) {
            this.warn('Is the server down? (connected=false)');
            callbacks.error('Is the server down? (connected=false)');
            return;
        }
        const plugin = callbacks.plugin;
        if (plugin === undefined || plugin === null) {
            this.error('Invalid plugin');
            callbacks.error('Invalid plugin');
            return;
        }
        const opaqueId = callbacks.opaqueId;
        const handleToken = callbacks.token ? callbacks.token : this.token;
        const transaction = this.randomString(12);
        const request = { 'janus': 'attach', 'plugin': plugin, 'opaque_id': opaqueId, 'transaction': transaction };
        if (handleToken !== null && handleToken !== undefined) {
            request['token'] = handleToken;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        if (this.websockets) {
            this.transactions[transaction] = (json) => {
                this.debug(json);
                if (json['janus'] !== 'success') {
                    this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                    callbacks.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);
                    return;
                }
                const handleId = json.data['id'];
                this.log('Created handle: ' + handleId);
                const pluginHandle = {
                        session : this.that,
                        plugin : plugin,
                        id : handleId,
                        token : handleToken,
                        detached : false,
                        webrtcStuff : {
                            started : false,
                            myStream : null,
                            streamExternal : false,
                            remoteStream : null,
                            mySdp : null,
                            mediaConstraints : null,
                            pc : null,
                            dataChannel : null,
                            dtmfSender : null,
                            trickle : true,
                            iceDone : false,
                            volume : {
                                value : null,
                                timer : null
                            },
                            bitrate : {
                                value : null,
                                bsnow : null,
                                bsbefore : null,
                                tsnow : null,
                                tsbefore : null,
                                timer : null
                            }
                        },
                        getId            : () => handleId,
                        getPlugin        : () => plugin,
                        getVolume        : () => this.getVolume(handleId, true),
                        getRemoteVolume  : () => this.getVolume(handleId, true),
                        getLocalVolume   : () => this.getVolume(handleId, false),
                        isAudioMuted     : () => this.isMuted(handleId, false),
                        muteAudio        : () => this.mute(handleId, false, true),
                        unmuteAudio      : () => this.mute(handleId, false, false),
                        isVideoMuted     : () => this.isMuted(handleId, true),
                        muteVideo        : () => this.mute(handleId, true, true),
                        unmuteVideo      : () => this.mute(handleId, true, false),
                        getBitrate       : () => this.getBitrate(handleId),
                        send             : (_callbacks) => { this.sendMessage(handleId, _callbacks); },
                        data             : (_callbacks) => { this.sendData(handleId, _callbacks); },
                        dtmf             : (_callbacks) => { this.sendDtmf(handleId, _callbacks); },
                        consentDialog    : callbacks.consentDialog,
                        iceState         : callbacks.iceState,
                        mediaState       : callbacks.mediaState,
                        webrtcState      : callbacks.webrtcState,
                        slowLink         : callbacks.slowLink,
                        onmessage        : callbacks.onmessage,
                        createOffer      : (_callbacks) => { this.prepareWebrtc(handleId, _callbacks); },
                        createAnswer     : (_callbacks) => { this.prepareWebrtc(handleId, _callbacks); },
                        handleRemoteJsep : (_callbacks) => { this.prepareWebrtcPeer(handleId, _callbacks); },
                        onlocalstream : callbacks.onlocalstream,
                        onremotestream : callbacks.onremotestream,
                        ondata : callbacks.ondata,
                        ondataopen : callbacks.ondataopen,
                        oncleanup : callbacks.oncleanup,
                        ondetached : callbacks.ondetached,
                        hangup : (sendRequest) => { this.cleanupWebrtc(handleId, sendRequest === true); },
                        detach : (_callbacks) => { this.destroyHandle(handleId, _callbacks); }
                    };
                this.pluginHandles[handleId] = pluginHandle;
                callbacks.success(pluginHandle);
            };
            request['session_id'] = this.sessionId;
            this.ws.send(JSON.stringify(request));
            return;
        }
        this.httpAPICall(this.server + '/' + this.sessionId, {
            verb: 'POST',
            withCredentials: this.withCredentials,
            body: request,
            success: (json) => {
                this.debug(json);
                if (json['janus'] !== 'success') {
                    this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                    callbacks.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);
                    return;
                }
                const handleId = json.data['id'];
                this.log('Created handle: ' + handleId);
                const pluginHandle = {
                        session : this.that,
                        plugin : plugin,
                        id : handleId,
                        token : handleToken,
                        detached : false,
                        webrtcStuff : {
                            started : false,
                            myStream : null,
                            streamExternal : false,
                            remoteStream : null,
                            mySdp : null,
                            mediaConstraints : null,
                            pc : null,
                            dataChannel : null,
                            dtmfSender : null,
                            trickle : true,
                            iceDone : false,
                            volume : {
                                value : null,
                                timer : null
                            },
                            bitrate : {
                                value : null,
                                bsnow : null,
                                bsbefore : null,
                                tsnow : null,
                                tsbefore : null,
                                timer : null
                            }
                        },
                        getId : () => handleId,
                        getPlugin : () => plugin,
                        getVolume : () => this.getVolume(handleId, true),
                        getRemoteVolume : () => this.getVolume(handleId, true),
                        getLocalVolume : () => this.getVolume(handleId, false),
                        isAudioMuted : () => this.isMuted(handleId, false),
                        muteAudio : () => this.mute(handleId, false, true),
                        unmuteAudio : () => this.mute(handleId, false, false),
                        isVideoMuted : () => this.isMuted(handleId, true),
                        muteVideo : () => this.mute(handleId, true, true),
                        unmuteVideo : () => this.mute(handleId, true, false),
                        getBitrate : () => this.getBitrate(handleId),
                        send : (_callbacks) => { this.sendMessage(handleId, _callbacks); },
                        data : (_callbacks) => { this.sendData(handleId, _callbacks); },
                        dtmf : (_callbacks) => { this.sendDtmf(handleId, _callbacks); },
                        consentDialog : callbacks.consentDialog,
                        iceState : callbacks.iceState,
                        mediaState : callbacks.mediaState,
                        webrtcState : callbacks.webrtcState,
                        slowLink : callbacks.slowLink,
                        onmessage : callbacks.onmessage,
                        createOffer : (_callbacks) => { this.prepareWebrtc(handleId, _callbacks); },
                        createAnswer : (_callbacks) => { this.prepareWebrtc(handleId, _callbacks); },
                        handleRemoteJsep : (_callbacks) => { this.prepareWebrtcPeer(handleId, _callbacks); },
                        onlocalstream : callbacks.onlocalstream,
                        onremotestream : callbacks.onremotestream,
                        ondata : callbacks.ondata,
                        ondataopen : callbacks.ondataopen,
                        oncleanup : callbacks.oncleanup,
                        ondetached : callbacks.ondetached,
                        hangup : (sendRequest) => { this.cleanupWebrtc(handleId, sendRequest === true); },
                        detach : (_callbacks) => { this.destroyHandle(handleId, _callbacks); }
                    };
                this.pluginHandles[handleId] = pluginHandle;
                callbacks.success(pluginHandle);
            },
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);    // FIXME
            }
        });
    }
    // Private method to send a message
    private sendMessage(handleId, callbacks) {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        if (!this.connected) {
            this.warn('Is the server down? (connected=false)');
            callbacks.error('Is the server down? (connected=false)');
            return;
        }
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const message = callbacks.message;
        const jsep = callbacks.jsep;
        const transaction = this.randomString(12);
        const request = { 'janus': 'message', 'body': message, 'transaction': transaction };
        if (pluginHandle.token !== null && pluginHandle.token !== undefined) {
            request['token'] = pluginHandle.token;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        if (jsep !== null && jsep !== undefined) {
            request['jsep'] = jsep;
        }
        this.debug('Sending message to plugin (handle=' + handleId + '):');
        this.debug(request);
        if (this.websockets) {
            request['session_id'] = this.sessionId;
            request['handle_id'] = handleId;
            this.transactions[transaction] = (json) => {
                this.debug('Message sent!');
                this.debug(json);
                if (json['janus'] === 'success') {
                    // We got a success, must have been a synchronous transaction
                    const plugindata = json['plugindata'];
                    if (plugindata === undefined || plugindata === null) {
                        this.warn('Request succeeded, but missing plugindata...');
                        callbacks.success();
                        return;
                    }
                    this.log('Synchronous transaction successful (' + plugindata['plugin'] + ')');
                    const data = plugindata['data'];
                    this.debug(data);
                    callbacks.success(data);
                    return;
                } else if (json['janus'] !== 'ack') {
                    // Not a success and not an ack, must be an error
                    if (json['error'] !== undefined && json['error'] !== null) {
                        this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                        callbacks.error(json['error'].code + ' ' + json['error'].reason);
                    } else {
                        this.error('Unknown error');    // FIXME
                        callbacks.error('Unknown error');
                    }
                    return;
                }
                // If we got here, the plugin decided to handle the request asynchronously
                callbacks.success();
            };
            this.ws.send(JSON.stringify(request));
            return;
        }
        this.httpAPICall(this.server + '/' + this.sessionId + '/' + handleId, {
            verb: 'POST',
            withCredentials: this.withCredentials,
            body: request,
            success: (json) => {
                this.debug('Message sent!');
                this.debug(json);
                if (json['janus'] === 'success') {
                    // We got a success, must have been a synchronous transaction
                    const plugindata = json['plugindata'];
                    if (plugindata === undefined || plugindata === null) {
                        this.warn('Request succeeded, but missing plugindata...');
                        callbacks.success();
                        return;
                    }
                    this.log('Synchronous transaction successful (' + plugindata['plugin'] + ')');
                    const data = plugindata['data'];
                    this.debug(data);
                    callbacks.success(data);
                    return;
                } else if (json['janus'] !== 'ack') {
                    // Not a success and not an ack, must be an error
                    if (json['error'] !== undefined && json['error'] !== null) {
                        this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                        callbacks.error(json['error'].code + ' ' + json['error'].reason);
                    } else {
                        this.error('Unknown error');    // FIXME
                        callbacks.error('Unknown error');
                    }
                    return;
                }
                // If we got here, the plugin decided to handle the request asynchronously
                callbacks.success();
            },
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);    // FIXME
                callbacks.error(textStatus + ': ' + errorThrown);
            }
        });
    }

    // Private method to send a trickle candidate
    private sendTrickleCandidate(handleId, candidate): void {
        if (!this.connected) {
            this.warn('Is the server down? (connected=false)');
            return;
        }
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            return;
        }
        const request = { 'janus': 'trickle', 'candidate': candidate, 'transaction': this.randomString(12) };
        if (pluginHandle.token !== null && pluginHandle.token !== undefined) {
            request['token'] = pluginHandle.token;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        this.vdebug('Sending trickle candidate (handle=' + handleId + '):');
        this.vdebug(request);
        if (this.websockets) {
            request['session_id'] = this.sessionId;
            request['handle_id'] = handleId;
            this.ws.send(JSON.stringify(request));
            return;
        }
        this.httpAPICall(this.server + '/' + this.sessionId + '/' + handleId, {
            verb: 'POST',
            withCredentials: this.withCredentials,
            body: request,
            success: (json) => {
                this.vdebug('Candidate sent!');
                this.vdebug(json);
                if (json['janus'] !== 'ack') {
                    this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                    return;
                }
            },
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);    // FIXME
            }
        });
    }

    // Private method to send a data channel message
    private sendData(handleId, callbacks): void {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        const text = callbacks.text;
        if (text === null || text === undefined) {
            this.warn('Invalid text');
            callbacks.error('Invalid text');
            return;
        }
        this.log('Sending string on data channel: ' + text);
        config.dataChannel.send(text);
        callbacks.success();
    }

    // Private method to send a DTMF tone
    private sendDtmf(handleId, callbacks) {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        if (config.dtmfSender === null || config.dtmfSender === undefined) {
            // Create the DTMF sender the proper way, if possible
            if (config.pc !== undefined && config.pc !== null) {
                const senders = config.pc.getSenders();
                const audioSender = senders.find((sender) => {
                    return sender.track && sender.track.kind === 'audio';
                });
                if (!audioSender) {
                    this.warn('Invalid DTMF configuration (no audio track)');
                    callbacks.error('Invalid DTMF configuration (no audio track)');
                    return;
                }
                config.dtmfSender = audioSender.dtmf;
                if (config.dtmfSender) {
                    this.log('Created DTMF Sender');
                    config.dtmfSender.ontonechange = (tone) => { this.debug('Sent DTMF tone: ' + tone.tone); };
                }
            }
            if (config.dtmfSender === null || config.dtmfSender === undefined) {
                this.warn('Invalid DTMF configuration');
                callbacks.error('Invalid DTMF configuration');
                return;
            }
        }
        const dtmf = callbacks.dtmf;
        if (dtmf === null || dtmf === undefined) {
            this.warn('Invalid DTMF parameters');
            callbacks.error('Invalid DTMF parameters');
            return;
        }
        const tones = dtmf.tones;
        if (tones === null || tones === undefined) {
            this.warn('Invalid DTMF string');
            callbacks.error('Invalid DTMF string');
            return;
        }
        let duration = dtmf.duration;
        if (duration === null || duration === undefined) {
            duration = 500;    // We choose 500ms as the default duration for a tone
        }
        let gap = dtmf.gap;
        if (gap === null || gap === undefined) {
            gap = 50;    // We choose 50ms as the default gap between tones
        }
        this.debug('Sending DTMF string ' + tones + ' (duration ' + duration + 'ms, gap ' + gap + 'ms)');
        config.dtmfSender.insertDTMF(tones, duration, gap);
        callbacks.success();
    }

    // Private method to destroy a plugin handle
    private destroyHandle(handleId, callbacks) {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        let asyncRequest = true;
        if (callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null) {
            asyncRequest = (callbacks.asyncRequest === true);
        }
        this.log('Destroying handle ' + handleId + ' (async=' + asyncRequest + ')');
        this.cleanupWebrtc(handleId);
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined || pluginHandle.detached) {
            // Plugin was already detached by Janus, calling detach again will return a handle not found error, so just exit here
            delete this.pluginHandles[handleId];
            callbacks.success();
            return;
        }
        if (!this.connected) {
            this.warn('Is the server down? (connected=false)');
            callbacks.error('Is the server down? (connected=false)');
            return;
        }
        const request = { 'janus': 'detach', 'transaction': this.randomString(12) };
        if (pluginHandle.token !== null && pluginHandle.token !== undefined) {
            request['token'] = pluginHandle.token;
        }
        if (this.apisecret !== null && this.apisecret !== undefined) {
            request['apisecret'] = this.apisecret;
        }
        if (this.websockets) {
            request['session_id'] = this.sessionId;
            request['handle_id'] = handleId;
            this.ws.send(JSON.stringify(request));
            delete this.pluginHandles[handleId];
            callbacks.success();
            return;
        }
        this.httpAPICall(this.server + '/' + this.sessionId + '/' + handleId, {
            verb: 'POST',
            async: asyncRequest,    // Sometimes we need false here, or destroying in onbeforeunload won't work
            withCredentials: this.withCredentials,
            body: request,
            success: (json) => {
                this.log('Destroyed handle:');
                this.debug(json);
                if (json['janus'] !== 'success') {
                    this.error('Ooops: ' + json['error'].code + ' ' + json['error'].reason);    // FIXME
                }
                delete this.pluginHandles[handleId];
                callbacks.success();
            },
            error: (textStatus, errorThrown) => {
                this.error(textStatus + ':' + errorThrown);    // FIXME
                // We cleanup anyway
                delete this.pluginHandles[handleId];
                callbacks.success();
            }
        });
    }

    // WebRTC stuff
    private streamsDone(handleId, jsep, media, callbacks, stream: any = null): void {
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
                    this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        this.debug('streamsDone:' + stream);
        if (stream) {
            this.debug('  -- Audio tracks:' + stream.getAudioTracks());
            this.debug('  -- Video tracks:' + stream.getVideoTracks());
        }
        // We're now capturing the new stream: check if we're updating or if it's a new thing
        let addTracks = false;
        if (!config.myStream || !media.update || config.streamExternal) {
            config.myStream = stream;
            addTracks = true;
        } else {
            // We only need to update the existing stream
            if (((!media.update && this.isAudioSendEnabled(media)) || (media.update && (media.addAudio || media.replaceAudio))) &&
                    stream.getAudioTracks() && stream.getAudioTracks().length) {
                config.myStream.addTrack(stream.getAudioTracks()[0]);
                if (media.replaceAudio && this.webRTCAdapter.browserDetails.browser === 'firefox') {
                    this.log('Replacing audio track:' + stream.getAudioTracks()[0]);
                    for (const index in config.pc.getSenders()) {
                        if (config.pc.getSenders.hasOwnProperty(index)) {
                            const s = config.pc.getSenders()[index];
                            if (s && s.track && s.track.kind === 'audio') {
                                s.replaceTrack(stream.getAudioTracks()[0]);
                            }
                        }
                    }
                } else {
                    if (this.webRTCAdapter.browserDetails.browser === 'firefox' && this.webRTCAdapter.browserDetails.version >= 59) {
                        // Firefox >= 59 uses Transceivers
                        this.log((media.replaceVideo ? 'Replacing' : 'Adding') + ' video track:' + stream.getVideoTracks()[0]);
                        let audioTransceiver = null;
                        const transceivers = config.pc.getTransceivers();
                        if (transceivers && transceivers.length > 0) {
                            for (const i in transceivers) {
                                if (transceivers.hasOwnProperty(i)) {
                                    const t = transceivers[i];
                                    if ((t.sender && t.sender.track && t.sender.track.kind === 'audio') ||
                                            (t.receiver && t.receiver.track && t.receiver.track.kind === 'audio')) {
                                        audioTransceiver = t;
                                        break;
                                    }
                                }
                            }
                        }
                        if (audioTransceiver && audioTransceiver.sender) {
                            audioTransceiver.sender.replaceTrack(stream.getVideoTracks()[0]);
                        } else {
                            config.pc.addTrack(stream.getVideoTracks()[0], stream);
                        }
                    } else {
                        this.log((media.replaceAudio ? 'Replacing' : 'Adding') + ' audio track:' + stream.getAudioTracks()[0]);
                        config.pc.addTrack(stream.getAudioTracks()[0], stream);
                    }
                }
            }
            if (((!media.update && this.isVideoSendEnabled(media)) || (media.update && (media.addVideo || media.replaceVideo))) &&
                    stream.getVideoTracks() && stream.getVideoTracks().length) {
                config.myStream.addTrack(stream.getVideoTracks()[0]);
                if (media.replaceVideo && this.webRTCAdapter.browserDetails.browser === 'firefox') {
                    this.log('Replacing video track:' + stream.getVideoTracks()[0]);
                    for (const index in config.pc.getSenders()) {
                        if (config.pc.getSenders().hasOwnProperty(index)) {
                            const s = config.pc.getSenders()[index];
                            if (s && s.track && s.track.kind === 'video') {
                                s.replaceTrack(stream.getVideoTracks()[0]);
                            }
                        }
                    }
                } else {
                    if (this.webRTCAdapter.browserDetails.browser === 'firefox' && this.webRTCAdapter.browserDetails.version >= 59) {
                        // Firefox >= 59 uses Transceivers
                        this.log((media.replaceVideo ? 'Replacing' : 'Adding') + ' video track:' + stream.getVideoTracks()[0]);
                        let videoTransceiver = null;
                        const transceivers = config.pc.getTransceivers();
                        if (transceivers && transceivers.length > 0) {
                            for (const i in transceivers) {
                                if (transceivers.hasOwnProperty(i)) {
                                    const t = transceivers[i];
                                    if ((t.sender && t.sender.track && t.sender.track.kind === 'video') ||
                                            (t.receiver && t.receiver.track && t.receiver.track.kind === 'video')) {
                                        videoTransceiver = t;
                                        break;
                                    }
                                }
                            }
                        }
                        if (videoTransceiver && videoTransceiver.sender) {
                            videoTransceiver.sender.replaceTrack(stream.getVideoTracks()[0]);
                        } else {
                            config.pc.addTrack(stream.getVideoTracks()[0], stream);
                        }
                    } else {
                        this.log((media.replaceVideo ? 'Replacing' : 'Adding') + ' video track:' + stream.getVideoTracks()[0]);
                        config.pc.addTrack(stream.getVideoTracks()[0], stream);
                    }
                }
            }
        }
        // If we still need to create a PeerConnection, let's do that
        if (!config.pc) {
            const pc_config = {
                'iceServers': this.iceServers, 'iceTransportPolicy': this.iceTransportPolicy, 'bundlePolicy': this.bundlePolicy
            };
            // ~ var pc_constraints = {'mandatory': {'MozDontOfferDataChannel':true}};
            const pc_constraints = {
                'optional': [{
                    'DtlsSrtpKeyAgreement': true, 'googIPv6': false
                }]
            };
            if (this.ipv6Support === true) {
                pc_constraints.optional['googIPv6'] = true;
            }
            // Any custom constraint to add?
            if (callbacks.rtcConstraints && typeof callbacks.rtcConstraints === 'object') {
                this.debug('Adding custom PeerConnection constraints:' + callbacks.rtcConstraints);
                for (const i in callbacks.rtcConstraints) {
                    if (callbacks.rtcConstraints.hasOwnProperty(i)) {
                        pc_constraints.optional.push(callbacks.rtcConstraints[i]);
                    }
                }
            }
            if (this.webRTCAdapter.browserDetails.browser === 'edge') {
                // This is Edge, enable BUNDLE explicitly
                pc_config.bundlePolicy = 'max-bundle';
            }
            this.log('Creating PeerConnection');
            this.debug(pc_constraints);
            // config.pc = new RTCPeerConnection(pc_config, pc_constraints);
            pc_config['optional'] = pc_constraints['optional'];
            config.pc = new RTCPeerConnection(pc_config);
            this.debug(config.pc);
            if (config.pc.getStats) {    // FIXME
                config.volume = {};
                config.bitrate.value = '0 kbits/sec';
            }
            this.log('Preparing local SDP and gathering candidates (trickle=' + config.trickle + ')');
            config.pc.oniceconnectionstatechange = (e) => {
                if (config.pc) {
                    pluginHandle.iceState(config.pc.iceConnectionState);
                }
            };
            config.pc.onicecandidate = (event) => {
                if (event.candidate === null
                    || (
                        this.webRTCAdapter.browserDetails.browser === 'edge'
                        && event.candidate.candidate.indexOf('endOfCandidates') > 0)
                        ) {
                    this.log('End of candidates.');
                    config.iceDone = true;
                    if (config.trickle === true) {
                        // Notify end of candidates
                        this.sendTrickleCandidate(handleId, {'completed': true});
                    } else {
                        // No trickle, time to send the complete SDP (including all candidates)
                        this.sendSDP(handleId, callbacks);
                    }
                } else {
                    // JSON.stringify doesn't work on some WebRTC objects anymore
                    // See https://code.google.com/p/chromium/issues/detail?id=467366
                    const candidate = {
                        'candidate': event.candidate.candidate,
                        'sdpMid': event.candidate.sdpMid,
                        'sdpMLineIndex': event.candidate.sdpMLineIndex
                    };
                    if (config.trickle === true) {
                        // Send candidate
                        this.sendTrickleCandidate(handleId, candidate);
                    }
                }
            };
            config.pc.ontrack = (event) => {
                this.log('Handling Remote Track');
                this.debug(event);
                if (!event.streams) {
                    return;
                }
                config.remoteStream = event.streams[0];
                pluginHandle.onremotestream(config.remoteStream);
                if (event.track && !event.track.onended) {
                    this.log('Adding onended callback to track:' + event.track);
                    event.track.onended = (ev) => {
                        this.log('Remote track removed:' + ev);
                        if (config.remoteStream) {
                            config.remoteStream.removeTrack(ev.target);
                            pluginHandle.onremotestream(config.remoteStream);
                        }
                    };
                }
            };
        }
        if (addTracks && stream !== null && stream !== undefined) {
            this.log('Adding local stream');
            stream.getTracks().forEach((track) => {
                this.log('Adding local track:' + track);
                config.pc.addTrack(track, stream);
            });
        }
        // Any data channel to create?
        if (this.isDataEnabled(media) && !config.dataChannel) {
            this.log('Creating data channel');
            const onDataChannelMessage = (event) => {
                this.log('Received message on data channel: ' + event.data);
                pluginHandle.ondata(event.data);    // FIXME
            };
            const onDataChannelStateChange = () => {
                const dcState = config.dataChannel !== null ? config.dataChannel.readyState : 'null';
                this.log('State change on data channel: ' + dcState);
                if (dcState === 'open') {
                    pluginHandle.ondataopen();    // FIXME
                }
            };
            const onDataChannelError = (error) => {
                this.error('Got error on data channel:' + error);
                // TODO
            };
            // Until we implement the proxying of open requests within the Janus core, we open a channel ourselves whatever the case
            config.dataChannel = config.pc.createDataChannel('JanusDataChannel', {ordered: false});
            config.dataChannel.onmessage = onDataChannelMessage;
            config.dataChannel.onopen = onDataChannelStateChange;
            config.dataChannel.onclose = onDataChannelStateChange;
            config.dataChannel.onerror = onDataChannelError;
        }
        // If there's a new local stream, let's notify the application
        if (config.myStream) {
            pluginHandle.onlocalstream(config.myStream);
        }
        // Create offer/answer now
        if (jsep === null || jsep === undefined) {
            this.createOffer(handleId, media, callbacks);
        } else {
            config.pc.setRemoteDescription(jsep)
                .then(() => {
                    this.log('Remote description accepted!');
                    config.remoteSdp = jsep.sdp;
                    // Any trickle candidate we cached?
                    if (config.candidates && config.candidates.length > 0) {
                        for (const i in config.candidates) {
                            if (config.candidates.hasOwnProperty(i)) {
                                const candidate = config.candidates[i];
                                this.debug('Adding remote candidate:' + candidate);
                                if (!candidate || candidate.completed === true) {
                                    // end-of-candidates
                                    config.pc.addIceCandidate();
                                } else {
                                    // New candidate
                                    config.pc.addIceCandidate(candidate);
                                }
                            }
                        }
                        config.candidates = [];
                    }
                    // Create the answer now
                    this.createAnswer(handleId, media, callbacks);
                }, callbacks.error);
        }
    }

    private prepareWebrtc(handleId, callbacks) {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.webrtcError;
        const jsep = callbacks.jsep;
        callbacks.media = callbacks.media || { audio: true, video: true };
        const media = callbacks.media;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        config.trickle = this.isTrickleEnabled(callbacks.trickle);
        // Are we updating a session?
        if (config.pc === undefined || config.pc === null) {
            // Nope, new PeerConnection
            media.update = false;
            media.keepAudio = false;
            media.keepVideo = false;
        } else if (config.pc !== undefined && config.pc !== null) {
            this.log('Updating existing media session');
            media.update = true;
            // Check if there's anything to add/remove/replace, or if we
            // can go directly to preparing the new SDP offer or answer
            if (callbacks.stream !== null && callbacks.stream !== undefined) {
                // External stream: is this the same as the one we were using before?
                if (callbacks.stream !== config.myStream) {
                    this.log('Renegotiation involves a new external stream');
                }
            } else {
                // Check if there are changes on audio
                if (media.addAudio) {
                    media.keepAudio = false;
                    media.replaceAudio = false;
                    media.removeAudio = false;
                    media.audioSend = true;
                    if (config.myStream && config.myStream.getAudioTracks() && config.myStream.getAudioTracks().length) {
                        this.error('Can`t add audio stream, there already is one');
                        callbacks.error('Can`t add audio stream, there already is one');
                        return;
                    }
                } else if (media.removeAudio) {
                    media.keepAudio = false;
                    media.replaceAudio = false;
                    media.addAudio = false;
                    media.audioSend = false;
                } else if (media.replaceAudio) {
                    media.keepAudio = false;
                    media.addAudio = false;
                    media.removeAudio = false;
                    media.audioSend = true;
                }
                if (config.myStream === null || config.myStream === undefined) {
                    // No media stream: if we were asked to replace, it's actually an 'add'
                    if (media.replaceAudio) {
                        media.keepAudio = false;
                        media.replaceAudio = false;
                        media.addAudio = true;
                        media.audioSend = true;
                    }
                    if (this.isAudioSendEnabled(media)) {
                        media.keepAudio = false;
                        media.addAudio = true;
                    }
                } else {
                    if (config.myStream.getAudioTracks() === null
                            || config.myStream.getAudioTracks() === undefined
                            || config.myStream.getAudioTracks().length === 0) {
                        // No audio track: if we were asked to replace, it's actually an 'add'
                        if (media.replaceAudio) {
                            media.keepAudio = false;
                            media.replaceAudio = false;
                            media.addAudio = true;
                            media.audioSend = true;
                        }
                        if (this.isAudioSendEnabled(media)) {
                            media.keepVideo = false;
                            media.addAudio = true;
                        }
                    } else {
                        // We have an audio track: should we keep it as it is?
                        if (this.isAudioSendEnabled(media) &&
                                !media.removeAudio && !media.replaceAudio) {
                            media.keepAudio = true;
                        }
                    }
                }
                // Check if there are changes on video
                if (media.addVideo) {
                    media.keepVideo = false;
                    media.replaceVideo = false;
                    media.removeVideo = false;
                    media.videoSend = true;
                    if (config.myStream && config.myStream.getVideoTracks() && config.myStream.getVideoTracks().length) {
                        this.error('Can`t add video stream, there already is one');
                        callbacks.error('Can`t add video stream, there already is one');
                        return;
                    }
                } else if (media.removeVideo) {
                    media.keepVideo = false;
                    media.replaceVideo = false;
                    media.addVideo = false;
                    media.videoSend = false;
                } else if (media.replaceVideo) {
                    media.keepVideo = false;
                    media.addVideo = false;
                    media.removeVideo = false;
                    media.videoSend = true;
                }
                if (config.myStream === null || config.myStream === undefined) {
                    // No media stream: if we were asked to replace, it's actually an 'add'
                    if (media.replaceVideo) {
                        media.keepVideo = false;
                        media.replaceVideo = false;
                        media.addVideo = true;
                        media.videoSend = true;
                    }
                    if (this.isVideoSendEnabled(media)) {
                        media.keepVideo = false;
                        media.addVideo = true;
                    }
                } else {
                    if (config.myStream.getVideoTracks() === null
                            || config.myStream.getVideoTracks() === undefined
                            || config.myStream.getVideoTracks().length === 0) {
                        // No video track: if we were asked to replace, it's actually an 'add'
                        if (media.replaceVideo) {
                            media.keepVideo = false;
                            media.replaceVideo = false;
                            media.addVideo = true;
                            media.videoSend = true;
                        }
                        if (this.isVideoSendEnabled(media)) {
                            media.keepVideo = false;
                            media.addVideo = true;
                        }
                    } else {
                        // We have a video track: should we keep it as it is?
                        if (this.isVideoSendEnabled(media) &&
                                !media.removeVideo && !media.replaceVideo) {
                            media.keepVideo = true;
                        }
                    }
                }
                // Data channels can only be added
                if (media.addData) {
                    media.data = true;
                }
            }
            // If we're updating and keeping all tracks, let's skip the getUserMedia part
            if ((this.isAudioSendEnabled(media) && media.keepAudio) &&
                    (this.isVideoSendEnabled(media) && media.keepVideo)) {
                this.streamsDone(handleId, jsep, media, callbacks, config.myStream);
                return;
            }
        }
        // If we're updating, check if we need to remove/replace one of the tracks
        if (media.update && !config.streamExternal) {
            if (media.removeAudio || media.replaceAudio) {
                if (config.myStream && config.myStream.getAudioTracks() && config.myStream.getAudioTracks().length) {
                    const s = config.myStream.getAudioTracks()[0];
                    this.log('Removing audio track:' + s);
                    config.myStream.removeTrack(s);
                    try {
                        s.stop();
                    } catch (e) {}
                }
                if (config.pc.getSenders() && config.pc.getSenders().length) {
                    let ra = true;
                    if (media.replaceAudio && this.webRTCAdapter.browserDetails.browser === 'firefox') {
                        // On Firefox we can use replaceTrack
                        ra = false;
                    }
                    if (ra) {
                        for (const index in config.pc.getSenders()) {
                            if (config.pc.getSenders().hasOwnProperty(index)) {
                                const s = config.pc.getSenders()[index];
                                if (s && s.track && s.track.kind === 'audio') {
                                    this.log('Removing audio sender:' + s);
                                    config.pc.removeTrack(s);
                                }
                            }
                        }
                    }
                }
            }
            if (media.removeVideo || media.replaceVideo) {
                if (config.myStream && config.myStream.getVideoTracks() && config.myStream.getVideoTracks().length) {
                    const s = config.myStream.getVideoTracks()[0];
                    this.log('Removing video track:' + s);
                    config.myStream.removeTrack(s);
                    try {
                        s.stop();
                    } catch (e) {}
                }
                if (config.pc.getSenders() && config.pc.getSenders().length) {
                    let rv = true;
                    if (media.replaceVideo && this.webRTCAdapter.browserDetails.browser === 'firefox') {
                        // On Firefox we can use replaceTrack
                        rv = false;
                    }
                    if (rv) {
                        for (const index in config.pc.getSenders()) {
                            if (config.pc.getSenders().hasOwnProperty(index)) {
                                const s = config.pc.getSenders()[index];
                                if (s && s.track && s.track.kind === 'video') {
                                    this.log('Removing video sender:' + s);
                                    config.pc.removeTrack(s);
                                }
                            }
                        }
                    }
                }
            }
        }
        // Was a MediaStream object passed, or do we need to take care of that?
        if (callbacks.stream !== null && callbacks.stream !== undefined) {
            const stream = callbacks.stream;
            this.log('MediaStream provided by the application');
            this.debug(stream);
            // If this is an update, let's check if we need to release the previous stream
            if (media.update) {
                if (config.myStream && config.myStream !== callbacks.stream && !config.streamExternal) {
                    // We're replacing a stream we captured ourselves with an external one
                    try {
                        // Try a MediaStreamTrack.stop() for each track
                        const tracks = config.myStream.getTracks();
                        for (const i in tracks) {
                            if (tracks.hasOwnProperty(i)) {
                                const mst = tracks[i];
                                this.log(mst);
                                if (mst !== null && mst !== undefined) {
                                    mst.stop();
                                }
                            }
                        }
                    } catch (e) {
                        // Do nothing if this fails
                    }
                    config.myStream = null;
                }
            }
            // Skip the getUserMedia part
            config.streamExternal = true;
            this.streamsDone(handleId, jsep, media, callbacks, stream);
            return;
        }
        if (this.isAudioSendEnabled(media) || this.isVideoSendEnabled(media)) {
            let constraints: any = { mandatory: {}, optional: [], video: {}, audio: {}};
            pluginHandle.consentDialog(true);
            let audioSupport = this.isAudioSendEnabled(media);
            if (audioSupport === true && media !== undefined && media != null) {
                if (typeof media.audio === 'object') {
                    audioSupport = media.audio;
                }
            }
            let videoSupport: any = this.isVideoSendEnabled(media);
            if (videoSupport === true && media !== undefined && media != null) {
                const simulcast = callbacks.simulcast === true ? true : false;
                if (simulcast && !jsep && (media.video === undefined || media.video === false)) {
                    media.video = 'hires';
                }
                if (media.video && media.video !== 'screen' && media.video !== 'window') {
                    if (typeof media.video === 'object') {
                        videoSupport = media.video;
                    } else {
                        let width = 0;
                        let height = 0;
                        let maxHeight = 0;
                        if (media.video === 'lowres') {
                            // Small resolution, 4:3
                            height = 240;
                            maxHeight = 240;
                            width = 320;
                        } else if (media.video === 'lowres-16:9') {
                            // Small resolution, 16:9
                            height = 180;
                            maxHeight = 180;
                            width = 320;
                        } else if (media.video === 'hires' || media.video === 'hires-16:9' || media.video === 'hdres') {
                            // High(HD) resolution is only 16:9
                            height = 720;
                            maxHeight = 720;
                            width = 1280;
                        } else if (media.video === 'fhdres') {
                            // Full HD resolution is only 16:9
                            height = 1080;
                            maxHeight = 1080;
                            width = 1920;
                        } else if (media.video === '4kres') {
                            // 4K resolution is only 16:9
                            height = 2160;
                            maxHeight = 2160;
                            width = 3840;
                        } else if (media.video === 'stdres') {
                            // Normal resolution, 4:3
                            height = 480;
                            maxHeight = 480;
                            width  = 640;
                        } else if (media.video === 'stdres-16:9') {
                            // Normal resolution, 16:9
                            height = 360;
                            maxHeight = 360;
                            width = 640;
                        } else {
                            this.log('Default video setting is stdres 4:3');
                            height = 480;
                            maxHeight = 480;
                            width = 640;
                        }
                        this.log('Adding media constraint:' + media.video);
                        videoSupport = {
                            'height': {'ideal': height},
                            'width':  {'ideal': width}
                        };
                        this.log('Adding video constraint:' + videoSupport);
                    }
                } else if (media.video === 'screen' || media.video === 'window') {
                    if (!media.screenshareFrameRate) {
                        media.screenshareFrameRate = 3;
                    }
                    if (typeof(navigator['getDisplayMedia']) === 'function') {
                        // The new experimental getDisplayMedia API is available, let's use that
                        // https://groups.google.com/forum/#!topic/discuss-webrtc/Uf0SrR4uxzk
                        // https://webrtchacks.com/chrome-screensharing-getdisplaymedia/
                        navigator['getDisplayMedia']({ video: true })
                            .then((stream) => {
                                pluginHandle.consentDialog(false);
                                if (this.isAudioSendEnabled(media) && !media.keepAudio) {
                                    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                                    .then((audioStream) => {
                                        stream.addTrack(audioStream.getAudioTracks()[0]);
                                        this.streamsDone(handleId, jsep, media, callbacks, stream);
                                    });
                                } else {
                                    this.streamsDone(handleId, jsep, media, callbacks, stream);
                                }
                            }, (error) => {
                                pluginHandle.consentDialog(false);
                                callbacks.error(error);
                            });
                        return;
                    }
                    // We're going to try and use the extension for Chrome 34+, the old approach
                    // for older versions of Chrome, or the experimental support in Firefox 33+
                    const callbackUserMedia = (error, stream) => {
                        pluginHandle.consentDialog(false);
                        if (error) {
                            callbacks.error(error);
                        } else {
                            this.streamsDone(handleId, jsep, media, callbacks, stream);
                        }
                    };
                    const getScreenMedia = (_constraints, gsmCallback, useAudio = false) => {
                        this.log('Adding media constraint (screen capture)');
                        this.debug(_constraints);
                        navigator.mediaDevices.getUserMedia(_constraints)
                            .then((stream) => {
                                if (useAudio) {
                                    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                                    .then((audioStream) => {
                                        stream.addTrack(audioStream.getAudioTracks()[0]);
                                        gsmCallback(null, stream);
                                    });
                                } else {
                                    gsmCallback(null, stream);
                                }
                            })
                            .catch((error) => { pluginHandle.consentDialog(false); gsmCallback(error); });
                    };
                    if (this.webRTCAdapter.browserDetails.browser === 'chrome') {
                        const chromever = this.webRTCAdapter.browserDetails.version;
                        let maxver = 33;
                        if (window.navigator.userAgent.match('Linux')) {
                            maxver = 35;    // 'known' crash in chrome 34 and 35 on linux
                        }
                        if (chromever >= 26 && chromever <= maxver) {
                            // Chrome 26->33 requires some awkward chrome://flags manipulation
                            constraints = {
                                video: {
                                    mandatory: {
                                        googLeakyBucket: true,
                                        maxWidth: window.screen.width,
                                        maxHeight: window.screen.height,
                                        minFrameRate: media.screenshareFrameRate,
                                        maxFrameRate: media.screenshareFrameRate,
                                        chromeMediaSource: 'screen'
                                    }
                                },
                                audio: this.isAudioSendEnabled(media) && !media.keepAudio
                            };
                            getScreenMedia(constraints, callbackUserMedia);
                        } else {
                            // Chrome 34+ requires an extension
                            this.extension.getScreen((error, sourceId) => {
                                if (error) {
                                    pluginHandle.consentDialog(false);
                                    return callbacks.error(error);
                                }
                                constraints = {
                                    audio: false,
                                    video: {
                                        mandatory: {
                                            chromeMediaSource: 'desktop',
                                            maxWidth: window.screen.width,
                                            maxHeight: window.screen.height,
                                            minFrameRate: media.screenshareFrameRate,
                                            maxFrameRate: media.screenshareFrameRate,
                                        },
                                        optional: [
                                            {googLeakyBucket: true},
                                            {googTemporalLayeredScreencast: true}
                                        ]
                                    }
                                };
                                constraints.video.mandatory.chromeMediaSourceId = sourceId;
                                getScreenMedia(constraints, callbackUserMedia,
                                    this.isAudioSendEnabled(media) && !media.keepAudio);
                            });
                        }
                    } else if (window.navigator.userAgent.match('Firefox')) {
                        const ffver = parseInt(window.navigator.userAgent.match(/Firefox\/(.*)/)[1], 10);
                        if (ffver >= 33) {
                            // Firefox 33+ has experimental support for screen sharing
                            constraints = {
                                video: {
                                    mozMediaSource: media.video,
                                    mediaSource: media.video
                                },
                                audio: this.isAudioSendEnabled(media) && !media.keepAudio
                            };
                            getScreenMedia(constraints, (err, stream) => {
                                callbackUserMedia(err, stream);
                                // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1045810
                                if (!err) {
                                    let lastTime = stream.currentTime;
                                    const polly = window.setInterval(() => {
                                        if (!stream) {
                                            window.clearInterval(polly);
                                        }
                                        if (stream.currentTime === lastTime) {
                                            window.clearInterval(polly);
                                            if (stream.onended) {
                                                stream.onended();
                                            }
                                        }
                                        lastTime = stream.currentTime;
                                    }, 500);
                                }
                            });
                        } else {
                            const error = new Error('NavigatorUserMediaError');
                            error.name = 'Your version of Firefox does not support screen sharing,' +
                                    'please install Firefox 33 (or more recent versions)';
                            pluginHandle.consentDialog(false);
                            callbacks.error(error);
                            return;
                        }
                    }
                    return;
                }
            }
            // If we got here, we're not screensharing
            if (media === null || media === undefined || media.video !== 'screen') {
                // Check whether all media sources are actually available or not
                navigator.mediaDevices.enumerateDevices().then((devices) => {
                    const audioExist = devices.some((device) => {
                        return device.kind === 'audioinput';
                    }),
                    videoExist = this.isScreenSendEnabled(media) || devices.some((device) => {
                        return device.kind === 'videoinput';
                    });

                    // Check whether a missing device is really a problem
                    const audioSend = this.isAudioSendEnabled(media);
                    const videoSend = this.isVideoSendEnabled(media);
                    const needAudioDevice = this.isAudioSendRequired(media);
                    const needVideoDevice = this.isVideoSendRequired(media);
                    if (audioSend || videoSend || needAudioDevice || needVideoDevice) {
                        // We need to send either audio or video
                        const haveAudioDevice = audioSend ? audioExist : false;
                        const haveVideoDevice = videoSend ? videoExist : false;
                        if (!haveAudioDevice && !haveVideoDevice) {
                            // FIXME Should we really give up, or just assume recvonly for both?
                            pluginHandle.consentDialog(false);
                            callbacks.error('No capture device found');
                            return false;
                        } else if (!haveAudioDevice && needAudioDevice) {
                            pluginHandle.consentDialog(false);
                            callbacks.error('Audio capture is required, but no capture device found');
                            return false;
                        } else if (!haveVideoDevice && needVideoDevice) {
                            pluginHandle.consentDialog(false);
                            callbacks.error('Video capture is required, but no capture device found');
                            return false;
                        }
                    }

                    const gumConstraints = {
                        audio: (audioExist && !media.keepAudio) ? audioSupport : false,
                        video: (videoExist && !media.keepVideo) ? videoSupport : false
                    };
                    this.debug('getUserMedia constraints' + gumConstraints);
                    navigator.mediaDevices.getUserMedia(gumConstraints)
                        .then((stream) => {
                            pluginHandle.consentDialog(false);
                            this.streamsDone(handleId, jsep, media, callbacks, stream);
                        }).catch((error) => {
                            pluginHandle.consentDialog(false);
                            callbacks.error({code: error.code, name: error.name, message: error.message});
                        });
                })
                .catch((error) => {
                    pluginHandle.consentDialog(false);
                    callbacks.error('enumerateDevices error', error);
                });
            }
        } else {
            // No need to do a getUserMedia, create offer/answer right away
            this.streamsDone(handleId, jsep, media, callbacks);
        }
    }

    private prepareWebrtcPeer(handleId, callbacks): void {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.webrtcError;
        const jsep = callbacks.jsep;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        if (jsep !== undefined && jsep !== null) {
            if (config.pc === null) {
                this.warn('Wait, no PeerConnection?? if this is an answer, use createAnswer and not handleRemoteJsep');
                callbacks.error('No PeerConnection: if this is an answer, use createAnswer and not handleRemoteJsep');
                return;
            }
            config.pc.setRemoteDescription(jsep)
                .then(() => {
                    this.log('Remote description accepted!');
                    config.remoteSdp = jsep.sdp;
                    // Any trickle candidate we cached?
                    if (config.candidates && config.candidates.length > 0) {
                        for (const i in config.candidates) {
                            if (config.candidates.hasOwnProperty(i)) {
                                const candidate = config.candidates[i];
                                this.debug('Adding remote candidate:' + candidate);
                                if (!candidate || candidate.completed === true) {
                                    // end-of-candidates
                                    config.pc.addIceCandidate();
                                } else {
                                    // New candidate
                                    config.pc.addIceCandidate(candidate);
                                }
                            }
                        }
                        config.candidates = [];
                    }
                    // Done
                    callbacks.success();
                }, callbacks.error);
        } else {
            callbacks.error('Invalid JSEP');
        }
    }

    private createOffer(handleId, media, callbacks) {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        const simulcast = callbacks.simulcast === true ? true : false;
        if (!simulcast) {
            this.log('Creating offer (iceDone=' + config.iceDone + ')');
        } else {
            this.log('Creating offer (iceDone=' + config.iceDone + ', simulcast=' + simulcast + ')');
        }
        // https://code.google.com/p/webrtc/issues/detail?id=3508
        const mediaConstraints = {};
        if (this.webRTCAdapter.browserDetails.browser === 'firefox' && this.webRTCAdapter.browserDetails.version >= 59) {
            // Firefox >= 59 uses Transceivers
            let audioTransceiver = null;
            let videoTransceiver = null;
            const transceivers = config.pc.getTransceivers();
            if (transceivers && transceivers.length > 0) {
                for (const i in transceivers) {
                    if (transceivers.hasOwnProperty(i)) {
                        const t = transceivers[i];
                        if ((t.sender && t.sender.track && t.sender.track.kind === 'audio') ||
                                (t.receiver && t.receiver.track && t.receiver.track.kind === 'audio')) {
                            if (!audioTransceiver) {
                                audioTransceiver = t;
                            }
                            continue;
                        }
                        if ((t.sender && t.sender.track && t.sender.track.kind === 'video') ||
                                (t.receiver && t.receiver.track && t.receiver.track.kind === 'video')) {
                            if (!videoTransceiver) {
                                videoTransceiver = t;
                            }
                            continue;
                        }
                    }
                }
            }
            // Handle audio (and related changes, if any)
            const audioSend = this.isAudioSendEnabled(media);
            const audioRecv = this.isAudioRecvEnabled(media);
            if (!audioSend && !audioRecv) {
                // Audio disabled: have we removed it?
                if (media.removeAudio && audioTransceiver) {
                    audioTransceiver.direction = 'inactive';
                    this.log('Setting audio transceiver to inactive:' + audioTransceiver);
                }
            } else {
                // Take care of audio m-line
                if (audioSend && audioRecv) {
                    if (audioTransceiver) {
                        audioTransceiver.direction = 'sendrecv';
                        this.log('Setting audio transceiver to sendrecv:' + audioTransceiver);
                    }
                } else if (audioSend && !audioRecv) {
                    if (audioTransceiver) {
                        audioTransceiver.direction = 'sendonly';
                        this.log('Setting audio transceiver to sendonly:' + audioTransceiver);
                    }
                } else if (!audioSend && audioRecv) {
                    if (audioTransceiver) {
                        audioTransceiver.direction = 'recvonly';
                        this.log('Setting audio transceiver to recvonly:' + audioTransceiver);
                    } else {
                        // In theory, this is the only case where we might not have a transceiver yet
                        audioTransceiver = config.pc.addTransceiver('audio', { direction: 'recvonly' });
                        this.log('Adding recvonly audio transceiver:' + audioTransceiver);
                    }
                }
            }
            // Handle video (and related changes, if any)
            const videoSend = this.isVideoSendEnabled(media);
            const videoRecv = this.isVideoRecvEnabled(media);
            if (!videoSend && !videoRecv) {
                // Video disabled: have we removed it?
                if (media.removeVideo && videoTransceiver) {
                    videoTransceiver.direction = 'inactive';
                    this.log('Setting video transceiver to inactive:' + videoTransceiver);
                }
            } else {
                // Take care of video m-line
                if (videoSend && videoRecv) {
                    if (videoTransceiver) {
                        videoTransceiver.direction = 'sendrecv';
                        this.log('Setting video transceiver to sendrecv:' + videoTransceiver);
                    }
                } else if (videoSend && !videoRecv) {
                    if (videoTransceiver) {
                        videoTransceiver.direction = 'sendonly';
                        this.log('Setting video transceiver to sendonly:' + videoTransceiver);
                    }
                } else if (!videoSend && videoRecv) {
                    if (videoTransceiver) {
                        videoTransceiver.direction = 'recvonly';
                        this.log('Setting video transceiver to recvonly:' + videoTransceiver);
                    } else {
                        // In theory, this is the only case where we might not have a transceiver yet
                        videoTransceiver = config.pc.addTransceiver('video', { direction: 'recvonly' });
                        this.log('Adding recvonly video transceiver:' + videoTransceiver);
                    }
                }
            }
        } else {
            mediaConstraints['offerToReceiveAudio'] = this.isAudioRecvEnabled(media);
            mediaConstraints['offerToReceiveVideo'] = this.isVideoRecvEnabled(media);
        }
        const iceRestart = callbacks.iceRestart === true ? true : false;
        if (iceRestart) {
            mediaConstraints['iceRestart'] = true;
        }
        this.debug(mediaConstraints);
        // Check if this is Firefox and we've been asked to do simulcasting
        const sendVideo = this.isVideoSendEnabled(media);
        if (sendVideo && simulcast && this.webRTCAdapter.browserDetails.browser === 'firefox') {
            // FIXME Based on https://gist.github.com/voluntas/088bc3cc62094730647b
            this.log('Enabling Simulcasting for Firefox (RID)');
            const sender = config.pc.getSenders()[1];
            this.log(sender);
            const parameters = sender.getParameters();
            this.log(parameters);
            sender.setParameters({encodings: [
                { rid: 'high', active: true, priority: 'high', maxBitrate: 1000000 },
                { rid: 'medium', active: true, priority: 'medium', maxBitrate: 300000 },
                { rid: 'low', active: true, priority: 'low', maxBitrate: 100000 }
            ]});
        }
        config.pc.createOffer(mediaConstraints)
            .then((offer) => {
                this.debug(offer);
                this.log('Setting local description');
                if (sendVideo && simulcast) {
                    // This SDP munging only works with Chrome (Safari STP may support it too)
                    if (this.webRTCAdapter.browserDetails.browser === 'chrome' ||
                            this.webRTCAdapter.browserDetails.browser === 'safari') {
                        this.log('Enabling Simulcasting for Chrome (SDP munging)');
                        offer.sdp = this.mungeSdpForSimulcasting(offer.sdp);
                    } else if (this.webRTCAdapter.browserDetails.browser !== 'firefox') {
                        this.warn('simulcast=true, but this is not Chrome nor Firefox, ignoring');
                    }
                }
                config.mySdp = offer.sdp;
                config.pc.setLocalDescription(offer)
                    .catch(callbacks.error);
                config.mediaConstraints = mediaConstraints;
                if (!config.iceDone && !config.trickle) {
                    // Don't do anything until we have all candidates
                    this.log('Waiting for all candidates...');
                    return;
                }
                this.log('Offer ready');
                this.debug(callbacks);
                // JSON.stringify doesn't work on some WebRTC objects anymore
                // See https://code.google.com/p/chromium/issues/detail?id=467366
                const jsep = {
                    'type': offer.type,
                    'sdp': offer.sdp
                };
                callbacks.success(jsep);
            }, callbacks.error);
    }

    private createAnswer(handleId, media, callbacks): void {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            callbacks.error('Invalid handle');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        const simulcast = callbacks.simulcast === true ? true : false;
        if (!simulcast) {
            this.log('Creating answer (iceDone=' + config.iceDone + ')');
        } else {
            this.log('Creating answer (iceDone=' + config.iceDone + ', simulcast=' + simulcast + ')');
        }
        let mediaConstraints = null;
        if (this.webRTCAdapter.browserDetails.browser === 'firefox' && this.webRTCAdapter.browserDetails.version >= 59) {
            // Firefox >= 59 uses Transceivers
            mediaConstraints = {};
            let audioTransceiver = null;
            let videoTransceiver = null;
            const transceivers = config.pc.getTransceivers();
            if (transceivers && transceivers.length > 0) {
                for (const i in transceivers) {
                    if (transceivers.hasOwnProperty(i)) {
                        const t = transceivers[i];
                        if ((t.sender && t.sender.track && t.sender.track.kind === 'audio') ||
                                (t.receiver && t.receiver.track && t.receiver.track.kind === 'audio')) {
                            if (!audioTransceiver) {
                                audioTransceiver = t;
                            }
                            continue;
                        }
                        if ((t.sender && t.sender.track && t.sender.track.kind === 'video') ||
                                (t.receiver && t.receiver.track && t.receiver.track.kind === 'video')) {
                            if (!videoTransceiver) {
                                videoTransceiver = t;
                            }
                            continue;
                        }
                    }
                }
            }
            // Handle audio (and related changes, if any)
            const audioSend = this.isAudioSendEnabled(media);
            const audioRecv = this.isAudioRecvEnabled(media);
            if (!audioSend && !audioRecv) {
                // Audio disabled: have we removed it?
                if (media.removeAudio && audioTransceiver) {
                    audioTransceiver.direction = 'inactive';
                    this.log('Setting audio transceiver to inactive:' + audioTransceiver);
                }
            } else {
                // Take care of audio m-line
                if (audioSend && audioRecv) {
                    if (audioTransceiver) {
                        audioTransceiver.direction = 'sendrecv';
                        this.log('Setting audio transceiver to sendrecv:' + audioTransceiver);
                    }
                } else if (audioSend && !audioRecv) {
                    if (audioTransceiver) {
                        audioTransceiver.direction = 'sendonly';
                        this.log('Setting audio transceiver to sendonly:' + audioTransceiver);
                    }
                } else if (!audioSend && audioRecv) {
                    if (audioTransceiver) {
                        audioTransceiver.direction = 'recvonly';
                        this.log('Setting audio transceiver to recvonly:' + audioTransceiver);
                    } else {
                        // In theory, this is the only case where we might not have a transceiver yet
                        audioTransceiver = config.pc.addTransceiver('audio', { direction: 'recvonly' });
                        this.log('Adding recvonly audio transceiver:' + audioTransceiver);
                    }
                }
            }
            // Handle video (and related changes, if any)
            const videoSend = this.isVideoSendEnabled(media);
            const videoRecv = this.isVideoRecvEnabled(media);
            if (!videoSend && !videoRecv) {
                // Video disabled: have we removed it?
                if (media.removeVideo && videoTransceiver) {
                    videoTransceiver.direction = 'inactive';
                    this.log('Setting video transceiver to inactive:' + videoTransceiver);
                }
            } else {
                // Take care of video m-line
                if (videoSend && videoRecv) {
                    if (videoTransceiver) {
                        videoTransceiver.direction = 'sendrecv';
                        this.log('Setting video transceiver to sendrecv:' + videoTransceiver);
                    }
                } else if (videoSend && !videoRecv) {
                    if (videoTransceiver) {
                        videoTransceiver.direction = 'sendonly';
                        this.log('Setting video transceiver to sendonly:' + videoTransceiver);
                    }
                } else if (!videoSend && videoRecv) {
                    if (videoTransceiver) {
                        videoTransceiver.direction = 'recvonly';
                        this.log('Setting video transceiver to recvonly:' + videoTransceiver);
                    } else {
                        // In theory, this is the only case where we might not have a transceiver yet
                        videoTransceiver = config.pc.addTransceiver('video', { direction: 'recvonly' });
                        this.log('Adding recvonly video transceiver:' + videoTransceiver);
                    }
                }
            }
        } else {
            if (this.webRTCAdapter.browserDetails.browser === 'firefox' || this.webRTCAdapter.browserDetails.browser === 'edge') {
                mediaConstraints = {
                    offerToReceiveAudio: this.isAudioRecvEnabled(media),
                    offerToReceiveVideo: this.isVideoRecvEnabled(media)
                };
            } else {
                mediaConstraints = {
                    mandatory: {
                        OfferToReceiveAudio: this.isAudioRecvEnabled(media),
                        OfferToReceiveVideo: this.isVideoRecvEnabled(media)
                    }
                };
            }
        }
        this.debug(mediaConstraints);
        // Check if this is Firefox and we've been asked to do simulcasting
        const sendVideo = this.isVideoSendEnabled(media);
        if (sendVideo && simulcast && this.webRTCAdapter.browserDetails.browser === 'firefox') {
            // FIXME Based on https://gist.github.com/voluntas/088bc3cc62094730647b
            this.log('Enabling Simulcasting for Firefox (RID)');
            const sender = config.pc.getSenders()[1];
            this.log(sender);
            const parameters = sender.getParameters();
            this.log(parameters);
            sender.setParameters({encodings: [
                { rid: 'high', active: true, priority: 'high', maxBitrate: 1000000 },
                { rid: 'medium', active: true, priority: 'medium', maxBitrate: 300000 },
                { rid: 'low', active: true, priority: 'low', maxBitrate: 100000 }
            ]});
        }
        config.pc.createAnswer(mediaConstraints)
            .then((answer) => {
                this.debug(answer);
                this.log('Setting local description');
                if (sendVideo && simulcast) {
                    // This SDP munging only works with Chrome
                    if (this.webRTCAdapter.browserDetails.browser === 'chrome') {
                        // FIXME Apparently trying to simulcast when answering breaks video in Chrome...
                        // ~ this.log('Enabling Simulcasting for Chrome (SDP munging)');
                        // ~ answer.sdp = mungeSdpForSimulcasting(answer.sdp);
                        this.warn('simulcast=true, but this is an answer, and video breaks in Chrome if we enable it');
                    } else if (this.webRTCAdapter.browserDetails.browser !== 'firefox') {
                        this.warn('simulcast=true, but this is not Chrome nor Firefox, ignoring');
                    }
                }
                config.mySdp = answer.sdp;
                config.pc.setLocalDescription(answer)
                    .catch(callbacks.error);
                config.mediaConstraints = mediaConstraints;
                if (!config.iceDone && !config.trickle) {
                    // Don't do anything until we have all candidates
                    this.log('Waiting for all candidates...');
                    return;
                }
                // JSON.stringify doesn't work on some WebRTC objects anymore
                // See https://code.google.com/p/chromium/issues/detail?id=467366
                const jsep = {
                    'type': answer.type,
                    'sdp': answer.sdp
                };
                callbacks.success(jsep);
            }, callbacks.error);
    }

    private sendSDP(handleId, callbacks): void {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success === 'function') ? callbacks.success : this.noop;
        callbacks.error = (typeof callbacks.error === 'function') ? callbacks.error : this.noop;
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle, not sending anything');
            return;
        }
        const config = pluginHandle.webrtcStuff;
        this.log('Sending offer/answer SDP...');
        if (config.mySdp === null || config.mySdp === undefined) {
            this.warn('Local SDP instance is invalid, not sending anything...');
            return;
        }
        config.mySdp = {
            'type': config.pc.localDescription.type,
            'sdp': config.pc.localDescription.sdp
        };
        if (config.trickle === false) {
            config.mySdp['trickle'] = false;
        }
        this.debug(callbacks);
        config.sdpSent = true;
        callbacks.success(config.mySdp);
    }

    private getVolume(handleId, remote) {
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            return 0;
        }
        const stream = remote ? 'remote' : 'local';
        const config = pluginHandle.webrtcStuff;
        if (!config.volume[stream]) {
            config.volume[stream] = { value: 0 };
        }
        // Start getting the volume, if getStats is supported
        if (config.pc.getStats && this.webRTCAdapter.browserDetails.browser === 'chrome') {
            if (remote && (config.remoteStream === null || config.remoteStream === undefined)) {
                this.warn('Remote stream unavailable');
                return 0;
            } else if (!remote && (config.myStream === null || config.myStream === undefined)) {
                this.warn('Local stream unavailable');
                return 0;
            }
            if (config.volume[stream].timer === null || config.volume[stream].timer === undefined) {
                this.log('Starting ' + stream + ' volume monitor');
                config.volume[stream].timer = setInterval(() => {
                    config.pc.getStats((stats) => {
                        const results = stats.result();
                        for (let i = 0; i < results.length; i++) {
                            const res = results[i];
                            if (res.type === 'ssrc') {
                                if (remote && res.stat('audioOutputLevel')) {
                                    config.volume[stream].value = parseInt(res.stat('audioOutputLevel'), 10);
                                } else if (!remote && res.stat('audioInputLevel')) {
                                    config.volume[stream].value = parseInt(res.stat('audioInputLevel'), 10);
                                }
                            }
                        }
                    });
                }, 200);
                return 0;    // We don't have a volume to return yet
            }
            return config.volume[stream].value;
        } else {
            // audioInputLevel and audioOutputLevel seem only available in Chrome? audioLevel
            // seems to be available on Chrome and Firefox, but they don't seem to work
            this.warn('Getting the ' + stream + ' volume unsupported by browser');
            return 0;
        }
    }

    private isMuted(handleId, video) {
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            return true;
        }
        const config = pluginHandle.webrtcStuff;
        if (config.pc === null || config.pc === undefined) {
            this.warn('Invalid PeerConnection');
            return true;
        }
        if (config.myStream === undefined || config.myStream === null) {
            this.warn('Invalid local MediaStream');
            return true;
        }
        if (video) {
            // Check video track
            if (config.myStream.getVideoTracks() === null
                    || config.myStream.getVideoTracks() === undefined
                    || config.myStream.getVideoTracks().length === 0) {
                this.warn('No video track');
                return true;
            }
            return !config.myStream.getVideoTracks()[0].enabled;
        } else {
            // Check audio track
            if (config.myStream.getAudioTracks() === null
                    || config.myStream.getAudioTracks() === undefined
                    || config.myStream.getAudioTracks().length === 0) {
                this.warn('No audio track');
                return true;
            }
            return !config.myStream.getAudioTracks()[0].enabled;
        }
    }

    private mute(handleId, video, mute) {
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            return false;
        }
        const config = pluginHandle.webrtcStuff;
        if (config.pc === null || config.pc === undefined) {
            this.warn('Invalid PeerConnection');
            return false;
        }
        if (config.myStream === undefined || config.myStream === null) {
            this.warn('Invalid local MediaStream');
            return false;
        }
        if (video) {
            // Mute/unmute video track
            if (config.myStream.getVideoTracks() === null
                    || config.myStream.getVideoTracks() === undefined
                    || config.myStream.getVideoTracks().length === 0) {
                this.warn('No video track');
                return false;
            }
            config.myStream.getVideoTracks()[0].enabled = mute ? false : true;
            return true;
        } else {
            // Mute/unmute audio track
            if (config.myStream.getAudioTracks() === null
                    || config.myStream.getAudioTracks() === undefined
                    || config.myStream.getAudioTracks().length === 0) {
                this.warn('No audio track');
                return false;
            }
            config.myStream.getAudioTracks()[0].enabled = mute ? false : true;
            return true;
        }
    }

    private getBitrate(handleId): any {
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined ||
                pluginHandle.webrtcStuff === null || pluginHandle.webrtcStuff === undefined) {
            this.warn('Invalid handle');
            return 'Invalid handle';
        }
        const config = pluginHandle.webrtcStuff;
        if (config.pc === null || config.pc === undefined) {
            return 'Invalid PeerConnection';
        }
        // Start getting the bitrate, if getStats is supported
        if (config.pc.getStats) {
            if (config.bitrate.timer === null || config.bitrate.timer === undefined) {
                this.log('Starting bitrate timer (via getStats)');
                config.bitrate.timer = setInterval(() => {
                    config.pc.getStats()
                        .then((stats) => {
                            stats.forEach((res) => {
                                if (!res) {
                                    return;
                                }
                                let inStats = false;
                                // Check if these are statistics on incoming media
                                if ((res.mediaType === 'video' || res.id.toLowerCase().indexOf('video') > -1) &&
                                        res.type === 'inbound-rtp' && res.id.indexOf('rtcp') < 0) {
                                    // New stats
                                    inStats = true;
                                } else if (res.type === 'ssrc' && res.bytesReceived &&
                                        (res.googCodecName === 'VP8' || res.googCodecName === '')) {
                                    // Older Chromer versions
                                    inStats = true;
                                }
                                // Parse stats now
                                if (inStats) {
                                    config.bitrate.bsnow = res.bytesReceived;
                                    config.bitrate.tsnow = res.timestamp;
                                    if (config.bitrate.bsbefore === null || config.bitrate.tsbefore === null) {
                                        // Skip this round
                                        config.bitrate.bsbefore = config.bitrate.bsnow;
                                        config.bitrate.tsbefore = config.bitrate.tsnow;
                                    } else {
                                        // Calculate bitrate
                                        let timePassed = config.bitrate.tsnow - config.bitrate.tsbefore;
                                        if (this.webRTCAdapter.browserDetails.browser === 'safari') {
                                            timePassed = timePassed / 1000;    // Apparently the timestamp is in microseconds, in Safari
                                        }
                                        let bitRate = Math.round((config.bitrate.bsnow - config.bitrate.bsbefore) * 8 / timePassed);
                                        if (this.webRTCAdapter.browserDetails.browser === 'safari') {
                                            bitRate = bitRate / 1000;
                                        }
                                        config.bitrate.value = bitRate + ' kbits/sec';
                                        // ~ this.log('Estimated bitrate is ' + config.bitrate.value);
                                        config.bitrate.bsbefore = config.bitrate.bsnow;
                                        config.bitrate.tsbefore = config.bitrate.tsnow;
                                    }
                                }
                            });
                        });
                }, 1000);
                return '0 kbits/sec';    // We don't have a bitrate value yet
            }
            return config.bitrate.value;
        } else {
            this.warn('Getting the video bitrate unsupported by browser');
            return 'Feature unsupported by browser';
        }
    }

    private webrtcError(error) {
        this.error('WebRTC error:' + error);
    }

    private cleanupWebrtc(handleId, hangupRequest: boolean = false) {
        this.log('Cleaning WebRTC stuff');
        const pluginHandle = this.pluginHandles[handleId];
        if (pluginHandle === null || pluginHandle === undefined) {
            // Nothing to clean
            return;
        }
        const config = pluginHandle.webrtcStuff;
        if (config !== null && config !== undefined) {
            if (hangupRequest === true) {
                // Send a hangup request (we don't really care about the response)
                const request = { 'janus': 'hangup', 'transaction': this.randomString(12) };
                if (pluginHandle.token !== null && pluginHandle.token !== undefined) {
                    request['token'] = pluginHandle.token;
                }
                if (this.apisecret !== null && this.apisecret !== undefined) {
                    request['apisecret'] = this.apisecret;
                }
                this.debug('Sending hangup request (handle=' + handleId + '):');
                this.debug(request);
                if (this.websockets) {
                    request['session_id'] = this.sessionId;
                    request['handle_id'] = handleId;
                    this.ws.send(JSON.stringify(request));
                } else {
                    this.httpAPICall(this.server + '/' + this.sessionId + '/' + handleId, {
                        verb: 'POST',
                        withCredentials: this.withCredentials,
                        body: request
                    });
                }
            }
            // Cleanup stack
            config.remoteStream = null;
            if (config.volume) {
                if (config.volume['local'] && config.volume['local'].timer) {
                    clearInterval(config.volume['local'].timer);
                }
                if (config.volume['remote'] && config.volume['remote'].timer) {
                    clearInterval(config.volume['remote'].timer);
                }
            }
            config.volume = {};
            if (config.bitrate.timer) {
                clearInterval(config.bitrate.timer);
            }
            config.bitrate.timer = null;
            config.bitrate.bsnow = null;
            config.bitrate.bsbefore = null;
            config.bitrate.tsnow = null;
            config.bitrate.tsbefore = null;
            config.bitrate.value = null;
            try {
                // Try a MediaStreamTrack.stop() for each track
                if (!config.streamExternal && config.myStream !== null && config.myStream !== undefined) {
                    this.log('Stopping local stream tracks');
                    const tracks = config.myStream.getTracks();
                    for (const i in tracks) {
                        if (tracks.hasOwnProperty(i)) {
                            const mst = tracks[i];
                            this.log(mst);
                            if (mst !== null && mst !== undefined) {
                                mst.stop();
                            }
                        }
                    }
                }
            } catch (e) {
                // Do nothing if this fails
            }
            config.streamExternal = false;
            config.myStream = null;
            // Close PeerConnection
            try {
                config.pc.close();
            } catch (e) {
                // Do nothing
            }
            config.pc = null;
            config.candidates = null;
            config.mySdp = null;
            config.remoteSdp = null;
            config.iceDone = false;
            config.dataChannel = null;
            config.dtmfSender = null;
        }
        pluginHandle.oncleanup();
    }

    // Helper method to munge an SDP to enable simulcasting (Chrome only)
    private mungeSdpForSimulcasting(sdp): void {
        // Let's munge the SDP to add the attributes for enabling simulcasting
        // (based on https://gist.github.com/ggarber/a19b4c33510028b9c657)
        const lines = sdp.split('\r\n');
        let video = false;
        const ssrc = [ -1 ];
        const ssrc_fid = [ -1 ];
        let cname = null, msid = null, mslabel = null, label = null;
        let insertAt = -1;
        for (let i = 0; i < lines.length; i++) {
            const mline = lines[i].match(/m=(\w+) */);
            if (mline) {
                const medium = mline[1];
                if (medium === 'video') {
                    // New video m-line: make sure it's the first one
                    if (ssrc[0] < 0) {
                        video = true;
                    } else {
                        // We're done, let's add the new attributes here
                        insertAt = i;
                        break;
                    }
                } else {
                    // New non-video m-line: do we have what we were looking for?
                    if (ssrc[0] > -1) {
                        // We're done, let's add the new attributes here
                        insertAt = i;
                        break;
                    }
                }
                continue;
            }
            if (!video) {
                continue;
            }
            const fid = lines[i].match(/a=ssrc-group:FID (\d+) (\d+)/);
            if (fid) {
                ssrc[0] = fid[1];
                ssrc_fid[0] = fid[2];
                lines.splice(i, 1); i--;
                continue;
            }
            if (ssrc[0]) {
                let match = lines[i].match('a=ssrc:' + ssrc[0] + ' cname:(.+)');
                if (match) {
                    cname = match[1];
                }
                match = lines[i].match('a=ssrc:' + ssrc[0] + ' msid:(.+)');
                if (match) {
                    msid = match[1];
                }
                match = lines[i].match('a=ssrc:' + ssrc[0] + ' mslabel:(.+)');
                if (match) {
                    mslabel = match[1];
                }
                match = lines[i].match('a=ssrc:' + ssrc[0] + ' label:(.+)');
                if (match) {
                    label = match[1];
                }
                if (lines[i].indexOf('a=ssrc:' + ssrc_fid[0]) === 0) {
                    lines.splice(i, 1); i--;
                    continue;
                }
                if (lines[i].indexOf('a=ssrc:' + ssrc[0]) === 0) {
                    lines.splice(i, 1); i--;
                    continue;
                }
            }
            if (lines[i].length === 0) {
                lines.splice(i, 1); i--;
                continue;
            }
        }
        if (ssrc[0] < 0) {
            // Couldn't find a FID attribute, let's just take the first video SSRC we find
            insertAt = -1;
            video = false;
            for (let i = 0; i < lines.length; i++) {
                const mline = lines[i].match(/m=(\w+) */);
                if (mline) {
                    const medium = mline[1];
                    if (medium === 'video') {
                        // New video m-line: make sure it's the first one
                        if (ssrc[0] < 0) {
                            video = true;
                        } else {
                            // We're done, let's add the new attributes here
                            insertAt = i;
                            break;
                        }
                    } else {
                        // New non-video m-line: do we have what we were looking for?
                        if (ssrc[0] > -1) {
                            // We're done, let's add the new attributes here
                            insertAt = i;
                            break;
                        }
                    }
                    continue;
                }
                if (!video) {
                    continue;
                }
                if (ssrc[0] < 0) {
                    const value = lines[i].match(/a=ssrc:(\d+)/);
                    if (value) {
                        ssrc[0] = value[1];
                        lines.splice(i, 1); i--;
                        continue;
                    }
                } else {
                    let match = lines[i].match('a=ssrc:' + ssrc[0] + ' cname:(.+)');
                    if (match) {
                        cname = match[1];
                    }
                    match = lines[i].match('a=ssrc:' + ssrc[0] + ' msid:(.+)');
                    if (match) {
                        msid = match[1];
                    }
                    match = lines[i].match('a=ssrc:' + ssrc[0] + ' mslabel:(.+)');
                    if (match) {
                        mslabel = match[1];
                    }
                    match = lines[i].match('a=ssrc:' + ssrc[0] + ' label:(.+)');
                    if (match) {
                        label = match[1];
                    }
                    if (lines[i].indexOf('a=ssrc:' + ssrc_fid[0]) === 0) {
                        lines.splice(i, 1); i--;
                        continue;
                    }
                    if (lines[i].indexOf('a=ssrc:' + ssrc[0]) === 0) {
                        lines.splice(i, 1); i--;
                        continue;
                    }
                }
                if (lines[i].length === 0) {
                    lines.splice(i, 1); i--;
                    continue;
                }
            }
        }
        if (ssrc[0] < 0) {
            // Still nothing, let's just return the SDP we were asked to munge
            this.warn('Couldn`t find the video SSRC, simulcasting NOT enabled');
            return sdp;
        }
        if (insertAt < 0) {
            // Append at the end
            insertAt = lines.length;
        }
        // Generate a couple of SSRCs (for retransmissions too)
        // Note: should we check if there are conflicts, here?
        ssrc[1] = Math.floor(Math.random() * 0xFFFFFFFF);
        ssrc[2] = Math.floor(Math.random() * 0xFFFFFFFF);
        ssrc_fid[1] = Math.floor(Math.random() * 0xFFFFFFFF);
        ssrc_fid[2] = Math.floor(Math.random() * 0xFFFFFFFF);
        // Add attributes to the SDP
        for (let i = 0; i < ssrc.length; i++) {
            if (cname) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc[i] + ' cname:' + cname);
                insertAt++;
            }
            if (msid) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc[i] + ' msid:' + msid);
                insertAt++;
            }
            if (mslabel) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc[i] + ' mslabel:' + mslabel);
                insertAt++;
            }
            if (label) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc[i] + ' label:' + label);
                insertAt++;
            }
            // Add the same info for the retransmission SSRC
            if (cname) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc_fid[i] + ' cname:' + cname);
                insertAt++;
            }
            if (msid) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc_fid[i] + ' msid:' + msid);
                insertAt++;
            }
            if (mslabel) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc_fid[i] + ' mslabel:' + mslabel);
                insertAt++;
            }
            if (label) {
                lines.splice(insertAt, 0, 'a=ssrc:' + ssrc_fid[i] + ' label:' + label);
                insertAt++;
            }
        }
        lines.splice(insertAt, 0, 'a=ssrc-group:FID ' + ssrc[2] + ' ' + ssrc_fid[2]);
        lines.splice(insertAt, 0, 'a=ssrc-group:FID ' + ssrc[1] + ' ' + ssrc_fid[1]);
        lines.splice(insertAt, 0, 'a=ssrc-group:FID ' + ssrc[0] + ' ' + ssrc_fid[0]);
        lines.splice(insertAt, 0, 'a=ssrc-group:SIM ' + ssrc[0] + ' ' + ssrc[1] + ' ' + ssrc[2]);
        sdp = lines.join('\r\n');
        if (!sdp.endsWith('\r\n')) {
            sdp += '\r\n';
        }
        return sdp;
    }

    // Helper methods to parse a media object
    private isAudioSendEnabled(media) {
        this.debug('isAudioSendEnabled:' + media);
        if (media === undefined || media === null) {
            return true;    // Default
        }
        if (media.audio === false) {
            return false;    // Generic audio has precedence
        }
        if (media.audioSend === undefined || media.audioSend === null) {
            return true;    // Default
        }
        return (media.audioSend === true);
    }

    private isAudioSendRequired(media) {
        this.debug('isAudioSendRequired:' + media);
        if (media === undefined || media === null) {
            return false;    // Default
        }
        if (media.audio === false || media.audioSend === false) {
            return false;    // If we're not asking to capture audio, it's not required
        }
        if (media.failIfNoAudio === undefined || media.failIfNoAudio === null) {
            return false;    // Default
        }
        return (media.failIfNoAudio === true);
    }

    private isAudioRecvEnabled(media) {
        this.debug('isAudioRecvEnabled:' + media);
        if (media === undefined || media === null) {
            return true;    // Default
        }
        if (media.audio === false) {
            return false;    // Generic audio has precedence
        }
        if (media.audioRecv === undefined || media.audioRecv === null) {
            return true;    // Default
        }
        return (media.audioRecv === true);
    }

    private isVideoSendEnabled(media): boolean {
        this.debug('isVideoSendEnabled:' + media);
        if (media === undefined || media === null) {
            return true;    // Default
        }
        if (media.video === false) {
            return false;    // Generic video has precedence
        }
        if (media.videoSend === undefined || media.videoSend === null) {
            return true;    // Default
        }
        return (media.videoSend === true);
    }

    private isVideoSendRequired(media): boolean {
        this.debug('isVideoSendRequired:' + media);
        if (media === undefined || media === null) {
            return false;    // Default
        }
        if (media.video === false || media.videoSend === false) {
            return false;    // If we're not asking to capture video, it's not required
        }
        if (media.failIfNoVideo === undefined || media.failIfNoVideo === null) {
            return false;    // Default
        }
        return (media.failIfNoVideo === true);
    }

    private isVideoRecvEnabled(media): boolean {
        this.debug('isVideoRecvEnabled:' + media);
        if (media === undefined || media === null) {
            return true;    // Default
        }
        if (media.video === false) {
            return false;    // Generic video has precedence
        }
        if (media.videoRecv === undefined || media.videoRecv === null) {
            return true;    // Default
        }
        return (media.videoRecv === true);
    }

    private isScreenSendEnabled(media): boolean {
        this.debug('isScreenSendEnabled:' + media);
        if (media === undefined || media === null) {
            return false;
        }
        if (typeof media.video !== 'object' || typeof media.video.mandatory !== 'object') {
            return false;
        }
        const constraints = media.video.mandatory;
        if (constraints.chromeMediaSource) {
            return constraints.chromeMediaSource === 'desktop' || constraints.chromeMediaSource === 'screen';
        } else if (constraints.mozMediaSource) {
            return constraints.mozMediaSource === 'window' || constraints.mozMediaSource === 'screen';
        } else if (constraints.mediaSource) {
            return constraints.mediaSource === 'window' || constraints.mediaSource === 'screen';
        }
        return false;
    }

    private isDataEnabled(media): boolean {
        this.debug('isDataEnabled:' + media);
        if (this.webRTCAdapter.browserDetails.browser === 'edge') {
            this.warn('Edge doesn`t support data channels yet');
            return false;
        }
        if (media === undefined || media === null) {
            return false;    // Default
        }
        return (media.data === true);
    }

    private isTrickleEnabled(trickle): boolean {
        this.debug('isTrickleEnabled:' + trickle);
        if (trickle === undefined || trickle === null) {
            return true;    // Default is true
        }
        return (trickle === true);
    }
}
