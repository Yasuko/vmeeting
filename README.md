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

--

## サンプル

■配信側アドレス
https://yasukosan.dip.jp/vmeet/

準備完了後に表示される8桁のROOM番号が
クライアントアドレスの引数になる


■配信側アドレス
https://yasukosan.dip.jp/vmeet/?room=生成されたROOM番号





## Build（開発）

コードのダウンロード後に、プロジェクトフォルダ内で

`npm update`

を実行し関連パッケージのインストール
その後

`npm start`

を実行することでサーバーとクライアントがビルドされる
各機能は下記ポートにてアクセス可能
クライアント「http://localhost:4200」
サーバー    「http://localhost:3000」


##　Build（公開）

- Apache、nginx等の静的コンテンツ配信
- websocket用node.js
- クライアント保持用mongodb
以上を満たす必要あり

nodejs側は
- mongoose
- express
- cors
- socket.io
パッケージが参照可能なこと

