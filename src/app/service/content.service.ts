import { Injectable } from '@angular/core';

@Injectable()
export class ContentService {

    private show = {
        WaitingVideo: false,
        HeaderScreen: false,
        CenterScreen: true,

        ScreenVideo: false,
        ScreenStart: true,
        ScreenMenu: false,
        ScreenSelect: false,

        CreateNow: false,
        JoinNow: false,
        Room: false,

        // ツール表示
        ScreenDashbord: false,

        // キャプチャ操作
        ScreenCapture: false,
        CaptureEditer: false,

        // テキスト
        ScreenText: false,

        // ストーリーボード
        ScreenStory: false,

        ScreenBlock: false,
    };


    public checkShow(target: string): boolean {
        if (this.show.hasOwnProperty(target)) {
            return this.show[target];
        }
        return false;
    }

    /**
     * コンテンツフラグの変更
     * @param target ターゲットコンテンツ
     * @param bool フラグ、無しの場合フラグ反転
     * @return boolean
     */
    public changeState(target, bool: boolean | null = null): boolean {
        if (this.show.hasOwnProperty(target)) {
            if (bool !== null) {
                this.show[target] = bool;
                return this.show[target];
            }
            if (this.show[target]) {
                this.show[target] = false;
            } else {
                this.show[target] = true;
            }
            return this.show[target];
        }
        return false;
    }

    public showVideoPlay(): void {
        this.show['WaitingVideo'] = false;
        this.show['ScreenVideo'] = false;
    }

    public showStartSequence(): void {
        this.show['ScreenStart'] = false;
        this.show['ScreenMenu'] = true;
        this.show['CreateNow'] = true;
        this.show['JoinNow'] = true;
        this.show['Room'] = true;
    }

    public showLocalStream(): void {
        this.show['CenterScreen'] = false;
        this.show['HeaderScreen'] = true;
    }

    public showRemoteStream(): void {
        this.show['CenterScreen'] = false;
        this.show['HeaderScreen'] = true;
    }

    public showDashbordeContent(target: string): void {
        this.closeDashborde();
        this.show[target] = true;
    }

    public closeDashborde(): void {
        this.show['ScreenStory'] = false;
        this.show['ScreenCapture'] = false;
        this.show['ScreenText'] = false;
        this.show['ScreenEditer'] = false;
    }

    public screenReset(): void {
        this.show = {
            WaitingVideo: false,
            HeaderScreen: false,
            CenterScreen: true,

            ScreenVideo: false,
            ScreenStart: true,
            ScreenMenu: false,
            ScreenSelect: false,

            CreateNow: false,
            JoinNow: false,
            Room: false,

            // ツール表示
            ScreenDashbord: false,

            // キャプチャ操作
            ScreenCapture: false,
            CaptureEditer: false,

            // テキスト
            ScreenText: false,

            // ストーリーボード
            ScreenStory: false,

            ScreenBlock: false,
        };
    }

}

