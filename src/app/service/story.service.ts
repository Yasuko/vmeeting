import { Injectable } from '@angular/core';

@Injectable()
export class StoryService {

    private show = {
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
        this.show['ScreenCapture'] = true;
        this.show['Room'] = true;
    }

    public showRemoteStream(): void {
        this.show['CenterScreen'] = false;
        this.show['ScreenCapture'] = true;
        this.show['HeaderScreen'] = true;
        this.show['Room'] = true;
    }

}

