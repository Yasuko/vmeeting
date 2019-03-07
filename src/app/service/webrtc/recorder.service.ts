import { Injectable } from '@angular/core';
import { SubjectsService } from '../subjects.service';

@Injectable()
export class RecorderService {

    private Stream: any = null;
    private recorder: MediaRecorder;
    private recordData = [];
    private recordeTarget: any;
    private recordeURL: any;

    constructor(
        private subjectService: SubjectsService
    ) {}

    public setStream(stream): void {
        this.Stream = stream;
    }

    /**
     * 録画開始
     * @param time 録画時間
     * デフォルトで録画時間は10秒
     * コーデックはvp9
     * ビットレート　512kにて録画される
     */
    public startRecord(time: number = 1000): void {
        const options = {
            videoBitsPerSecond : 512000,
            mimeType : 'video/webm; codecs=vp9'
        };
        this.recorder = new MediaRecorder(this.Stream, options);
        this.recorder.ondataavailable = (result) => {
            this.recordData.push(result.data);
        };
        this.recorder.start(time);
    }
    /**
     * 録画停止
     */
    public stopRecord(): void {
        this.recorder.onstop =  (result) => {
            this.recorder = null;
        };
        this.recorder.stop();
    }

    /**
     * 録画映像の再生先登録
     * @param target 録画再生ターゲットDOM
     */
    public setRecordePlayer(target): void {
        this.recordeTarget = target;
    }
    /**
     * 録画の再生
     */
    public plyaRecord(): void {
        if (this.recordeTarget === null) {
            console.error('Recorde Player Not Set');
            return;
        }
        const videoBlob = new Blob(
                this.recordData,
                { type: 'video/webm'}
            );
        this.recordeURL = window.URL.createObjectURL(videoBlob);

        if (this.recordeTarget.src) {
            window.URL.revokeObjectURL(this.recordeTarget.src);
            this.recordeTarget.src = null;
        }
        this.recordeTarget.src = this.recordeURL;
        this.recordeTarget.play();
    }

    /**
     * 録画データのDL用URL取得
     */
    public getRecordeURL(): string {
        return this.recordeURL;
    }

}
