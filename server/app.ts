import { SocketService } from './core';
import { SocketIDService, NameSpaceService, RoomService } from './service';

import { UsersModel } from './model';
// import { ConsoleReporter } from 'jasmine';

export class ChatServer extends SocketService {

    // private nameSpace: NameSpaceService;
    // private room: RoomService;
    private NameSpaces: string[] = ['test1', 'test2', 'test3', 'test4'];
    private Rooms: string[] = [];
    private usersModel: UsersModel = new UsersModel;

    constructor(
        private socketID: SocketIDService = new SocketIDService,
    ) {
        super();
        this.listen();
        for (const key in this.NameSpaces) {
            if (this.NameSpaces.hasOwnProperty(key)) {
                this.addNamespace(this.NameSpaces[key]);
            }
        }
    }

    /**
     * ネームスペースの登録、待受開始
     * @param namespace string
     * メソッド実行後、待ち状態になるので
     * 不要になった場合に明示的な削除が必要
     */
    public addNamespace(namespace: string): void {

        // ネームスペースを登録、保存
        this.NameSpace[namespace] = this.io.of('/' + namespace);
        // コネクション待ち開始
        this.NameSpace[namespace].on('connection', (socket) => {
            // 接続ユーザー情報表示
            console.log('Connected client on id %s', socket.id);
            // ソケット情報を一時保存
            this.Sockets[socket.id] = socket;

            /**
             *　初回接続処理
             *　ネームスペースに接続後、部屋を登録か部屋に接続
             * 部屋ごとに設定されている待受を登録
             */
            this.joinRoom(socket.id, namespace)
                .then((result) => {
                    for (const key in this.Rooms) {
                        if (this.Rooms.hasOwnProperty(key)) {
                            this.addNormalEmitEvent(
                                socket.id,
                                this.socketID.getSocketid(
                                    this.Sockets[socket.id]['id']
                                )['room'],
                                this.Rooms[key],
                                namespace
                            );
                        }
                    }
                });

            /**
             * クライアントからのコネクション切断後に
             * namespace、roomからも消す
             */
            socket.on('disconnect', () => {
                console.log('Client disconnected');
                this.disconnected(socket.id);
            });
        });
    }

    private addRoom(room: string): void {
        this.Rooms.push(room);
    }

    private delRoom(room): void {
        const rooms = this.Rooms.filter(n => n !== room);
        this.Rooms = rooms;
    }

    private checkRoomName(name: string): boolean {
        if (!this.Rooms.hasOwnProperty(name)) {
            this.Rooms.push(name);
            return true;
        }
        return false;
    }

    private checkNameSpace(name: string): boolean {
        if (!this.NameSpaces.hasOwnProperty(name)) {
            this.NameSpaces.push(name);
            return true;
        }
        return false;
    }

    /**
     * 初回接続処理
     * @param namespace string
     * ユーザーサイドから見た場合、実質初期化処理
     */
    public joinRoom(socketid: string, namespace: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.Sockets[socketid].on('join', (m: any) => {
                // 接続ユーザーの初期処理
                if (!this.checkRoomName(m['group'])) {
                    this.addRoom(m['group']);
                }
                resolve(this.joinUserSeaquens(m, socketid, namespace));
            });
        });
    }

    /**
     * roomに入ったユーザーに初期処理を実施
     * @param m コネクション時に渡されたJSONデータ
     * @param socketid コネクション時の固有番号
     * @param namespace 接続されたネームスペース
     */
    private async joinUserSeaquens(m: any, socketid: string, namespace: string): Promise<any> {
        // 接続ユーザー情報保存
        console.log(m);
        await this.socketID.setSocketid(
            socketid,
            {
                socketid    : socketid,
                namespace   : socketid,
                room        : m['group'],
                name        : m['name'],
                color       : m['color']
            }
        );

        // 部屋に入室
        await this.Sockets[socketid].join(m['group'], () => {
            console.log(
                'Join Room: %s User: %s',
                m['group'],
                socketid
            );
        });
        // MongoDBにも保存
        await this.usersModel.saveData({
            userid      : socketid,
            room        : m['group'],
            namespace   : namespace,
            name        : m['name'],
            color       : m['color']
        });

        /**
         * ルーム内の全ユーザーへ色々情報を送る
         * 送り元にも送る
         */
        const result: any = await this.usersModel.getByRoom(m['group']);

        if (Object.keys(result).length > 0) {
            console.log(result);
            this.emitAll(namespace, m['group'], 'allusers', result);
            // this.emitUser(socketid, 'allusers', result);
        }

        // ルームの全メンバーへ新規ユーザーを伝える
        await this.emitAll(
            namespace, m['group'], 'sys', {
                data: {
                    socketid: socketid,
                    name: m['name'],
                    color: m['color']
                },
                type: 'new_user',
                job: 'join'
            }
        );
        // Promiseで処理終了を返す
        return true;
    }

    /**
     * クライアント切断イベントの登録
     * @param socketid コネクション時の固有番号
     */
    private async disconnected(socketid: string): Promise<void> {
        // MongoDBにも保存
        const user = await this.usersModel.getByUserid(socketid);
        console.log(user);
        await this.emitAll(
            user[0]['namespace'],
            user[0]['room'],
            'sys',
            {
                data: {
                    id: socketid
                },
                type: 'leave_user',
                job: 'leave'
            }
        );
        this.usersModel.deleteByUserid(socketid);
        if (this.socketID.checkSocketid(socketid)) {
            this.Sockets[socketid].leave(
                user[0]['room'],
                () => {
                    console.log('Client ROOM Out');
                }
            );
        }
        this.socketID.deleteSocketid(socketid);
    }
}
