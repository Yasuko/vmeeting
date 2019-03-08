# vMeet

WebSocket, WebRTCを使用したスクリーン共有

提供機能

- スクリーン共有（配信側はFirefoxのみ）
- 音声共有
- マウスカーソル共有
- テキストチャット
- ファイル転送（デフォルト５MBまで）　
- スクリーンショット機能
- スクリーン手書きメモ
- スクリーン付箋メモ
----


## サンプル
----
■配信側アドレス
https://yasukosan.dip.jp/vmeet/

準備完了後に表示される8桁のROOM番号が
クライアントアドレスの引数になる

■配信側アドレス
https://yasukosan.dip.jp/vmeet/?room=生成されたROOM番号



----
## Build（開発）
----
開発環境
- Angular：6.0以上
- Mongodb：
- NodeJs ：5.6以上
- Httpサーバー（静的コンテンツ参照用）
<br>
※Angularのビルドオプションで全てnodejsで動かす場合は不要
- HTTPS接続環境（UserMediaの取得にHTTPS環境必須）


ダウンロード後に、プロジェクトフォルダ内で

`npm install`

関連パッケージがインストールされる<br>
インストール完了後

`npm start`

サーバーとクライアントがビルドされる<br>
ブラウザより下記にアクセス<br>
静的コンテンツ  ：https://localhost/プロジェクト/dist/<br>
websocket    　：https://localhost:3000<br>


