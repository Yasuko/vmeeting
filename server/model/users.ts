import * as mongoose from 'mongoose';
import { MongoDBService } from '../core';

export class UsersModel {

    private Users = new mongoose.Schema({
        userid      : { type: String, default: '' },
        namespace   : { type: String, default: 'test1' },
        room        : { type: String, default: 'test' },
        name        : { type: String, default: 'ゲスト' },
        color        : { type: String, default: '#000000' },
    });

    private mongodbService: MongoDBService = new MongoDBService;

    constructor () {
        this.initial();
    }

    private initial(): void {
        this.mongodbService.addModel(this.Users, 'users');
        this.mongodbService.resetCollection('users');
    }

    public async saveData(user: object): Promise<boolean> {
        const result = await this.getByUserid(user['userid']);

        // 登録済みの場合
        if (result) {
            return false;

        // 未登録の場合新規登録
        } else {
            return await this.mongodbService.save(
                'users',
                {
                    userid      : user['userid'],
                    namespace   : user['namespace'],
                    room        : user['room'],
                    name        : user['name'],
                    color        : user['color']
                }
            );
        }
    }

    public getByUserid(userid: string): Promise<boolean|object> {
        // const _userid = userid.split('#');
        return this.mongodbService.find(
                'users',
                {
                    userid  : userid
                }
            );
    }
    public getByUseridForId(userid: string): Promise<boolean|object> {
        // const _userid = userid.split('#');
        return this.mongodbService.find(
                'users',
                {
                    userid  : userid
                },
                'userid'
            );
    }
    public getByNamespace(namespace: string): Promise<object | boolean> {
        return this.mongodbService.find(
                'users',
                { namespace : namespace }
            );
    }
    public getByRoom(room: string): Promise<object | boolean> {
        return this.mongodbService.find(
                'users',
                { room : room }
            );
    }

    public updateByUserid(userid: string, users: object): Promise<boolean> {
        return this.mongodbService.update(
                'users',
                { userid: userid},
                { $set: {
                    userid      : users['userid'],
                    namespace   : users['namespace'],
                    room        : users['room'],
                    name        : users['name'],
                    color       : users['color'],
                }}
            );
    }

    public async deleteByUserid(userid: string): Promise<boolean> {
        const result = await this.getByUserid(userid);

        // 登録済みの場合
        if (result) {
            return this.mongodbService.delete(
                'users',
                { userid    : userid}
            );
        }
        return false;
    }
}


