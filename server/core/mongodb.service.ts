import * as _mongoose from 'mongoose';
import { Schema } from 'inspector';

export class MongoDBService {

    private mongoose = _mongoose;
    // private Schema = this.mongoose.Schema;
    private Models = new Array();

    constructor() {
        this.connect();
    }

    private connect(): void {
        this.mongoose.connect('mongodb://localhost/paint-chat');
    }

    public addModel(model: any, name: string): void {
        this.Models[name] = this.mongoose.model(name, model);
    }

    /**
     * コレクションを初期化（全削除）
     * @param model コレクション名
     */
    public resetCollection(model: string): void {
        this.Models[model].deleteMany({}, (err) => {
            if (err) {
                console.log(err);
            }
        });
    }

    /**
     * ドキュメント検索
     * @param model コレクション名
     * @param query 検索クエリ
     * @param keys ドキュメントに含めるキー
     */
    public async find(model: string, query: object, keys: string = '', skip: number = 0): Promise<object|boolean> {
        const result = await this.Models[model]
                        .find(query)
                        .select(keys)
                        .skip(skip)
                        .exec();
        if (Object.keys(result).length > 0) {
            return result;
        }
        return false;
    }

    /**
     * ドキュメント追加
     * @param model コレクション名
     * @param query 保存クエリ
     */
    public async save(model: string, query: object): Promise< boolean > {
        const data = new this.Models[model](query);

        const err = await data.save();
        if (err) {
            // console.log(err);
            return false;
        }
        return true;
    }

    /**
     * アップデート（ターゲット１つ）
     * @param model コレクション名
     * @param query 検索クエリ
     * @param update アップデート内容
     * @return boolean アップデートの可否
     */
    public async update(model: string, query: object, update: object): Promise<boolean> {
        const err = await this.Models[model].updateOne(query, update);

        if (err) {
            return false;
        }
        return true;
    }

    /**
     * ドキュメント削除
     * @param model コレクション名
     * @param query 削除クエリ
     */
    public async delete(model: string, query: object): Promise< boolean > {
        return this.Models[model].deleteOne(
            query,
            (err) => {
                if (err) {
                    return false;
                }
                return true;
            }
        );
    }

}
