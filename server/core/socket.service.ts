import { createServer, Server } from 'https';
import * as fs from 'fs';
import * as express from 'express';
import * as socketIo from 'socket.io';
import * as corsLib from 'cors';

export class SocketService {
    private PORT: number = 3000;
    protected app: express.Application;
    // protected cors = corsLib();
    protected server: Server;
    protected io: socketIo.Server;
    // Namespace毎のwebsocketを保持
    protected NameSpace: object[] = new Array();
    // Namespaceに繋ぎに来たクライアント情報を保持
    protected Sockets: object[] = new Array();

    // private ssl_key = '../mean/server/asset/key/server_key.pem';
    // private ssl_crt = '../mean/server/asset/key/server_crt.pem';
    private ssl_key = '../mean/server/asset/key/privkey.pem';
    private ssl_crt = '../mean/server/asset/key/fullchain.pem';
    private ssl_ca = '../mean/server/asset/key/chain.pem';
    private port: number;

    constructor() {
        this.createApp();
        this.config();
        this.createServer();
        this.sockets();
    }

    /**
     * express初期化
     */
    private createApp(): void {
        const whiteList = [
            'https://yasukosan.dip.jp:4200',
            'https://yasukosan.dip.jp:3000',
            'https://yasukosan.dip.jp/mean/dist'
        ];
        const options: corsLib.CorsOptions = {
            // allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token'],
            credentials: true,
            // methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
            origin: (origin, callback) => {
                const isWhiteListed = whiteList.indexOf(origin) !== -1;
                callback(null, isWhiteListed);
            },
            // preflightContinue: false
        };
        this.app = express();
        this.app.use(corsLib(options));
        // this.app.options('*', corsLib(options));
    }

    /**
     * socketサーバー作成
     */
    private createServer(): void {
        const options = {
            key : fs.readFileSync(this.ssl_key),
            cert: fs.readFileSync(this.ssl_crt),
            ca  : fs.readFileSync(this.ssl_ca)
        };
        this.server = createServer(options, this.app);
    }
    /**
     * ポート作成、未指定の場合標準のサービスポート使用
     */
    private config(): void {
        this.port = Number(process.env.PORT || this.PORT);
    }
    /**
     * グローバルソケット作成
     */
    private sockets(): void {
        this.io = socketIo(this.server);
        // this.io.set('origins', 'https://moriya.uzaking.uza:4200');
    }
    /**
     * 待受開始
     */
    public listen(): void {
        this.server.listen(this.port, '0.0.0.0', 0, () => {
            console.log('Running server on port %s', this.port);
        });
    }
    /**
     * expressオブジェクトを返す
     */
    public getApp(): express.Application {
        return this.app;
    }


    /**
     * 部屋に接続中のユーザー一覧を返す
     * ※機能せず
     * @param namespace string
     * @param room string
     */
    /*
    public getAllUserByRoom(namespace: string, room: string): object {
        return this.NameSpace[namespace].of(room).sockets.clients.connected;
    }*/

    /**
     * 初回接続処理
     * @param socketid string
     */
    public initialSession(socketid: string): void {
        this.Sockets[socketid].on('join', (m: any) => {
            // ルームの全メンバーへメッセージ送信
            this.emitBradcast(socketid, socketid, 'join', m['data']);
        });
    }

    /**
     * 部屋毎にコネクションイベントを設定
     * @param socketid コネクション時の固有番号
     * @param room 部屋名
     * @param tag タグ
     * @param namespace ネームスペース
     * tagに指定した識別子で接続された場合に処理を実行
     */
    public addNormalEmitEvent(socketid: string, room: string, tag: string, namespace: string): void {
        this.Sockets[socketid].on(tag, (m: any) => {
            if ('to' in m['data']) {
                // ルームの特定のメンバーへメッセージ送信
                m['data']['id'] = socketid;
                this.emitUser(namespace, tag, m['data'], m['data']['to']);
            } else {
                // ルームの全メンバーへメッセージ送信
                m['data']['id'] = socketid;
                this.emitBradcast(socketid, room, tag, m['data']);
            }
        });
    }

    /**
     * 自分以外にデータ送信
     * @param socketid ソケットID（コネクション時に割り当てられる固有番号）
     * @param to 送り先のroomかsocketid（自分以外）
     * @param title タグ
     * @param emit 送信データ
     */
    public emitBradcast(socketid: string, to: string, title: string, emit: object): void {
        this.Sockets[socketid]
        // this.NameSpace[namespace]
        .broadcast
        .to(to)
        .emit(title, emit);
    }
    /**
     * 自分も含めて同一room内の全員に送信
     * @param namespace ネームスペース
     * @param to 送り先のroomかsocketid
     * @param title タグ
     * @param emit 送信データ
     */
    public emitAll(namespace: string, to: string, title: string, emit: object): void {
        console.log(namespace);
        console.log(to);
        this.NameSpace[namespace]
        .in(to)
        .emit(title, emit);
    }
    /**
     * 特定の相手に送信（自分には送れない）
     * @param socketid ソケットID（コネクション時に割り当てられる固有番号）
     * @param title タグ
     * @param emit 送信データ
     */
    public emitUser(socketid: string, title: string, emit: object, to: string): void {
        this.NameSpace[socketid]
        .to(to)
        .emit(title, emit);
    }
}
