import { Injectable, ViewChild } from '@angular/core';
import { SubjectsService } from '../subjects.service';

@Injectable()
export class SDPService {

    private delCodec = ['VP8', 'VP9'];

    constructor(
        private subjectService: SubjectsService
    ) {}

    public addDelCodec(codec): void {
        this.delCodec.push(codec);
    }
    public delDelCodec(codec): void {
        const _codec = this.delCodec.filter(n => n !== codec);
        this.delCodec = _codec;
    }
    public getDelCodec(): object {
        return this.delCodec;
    }

    /**
     * SDP情報から不要なコーデック情報を削除し再パッケージする
     * @param sdp SDP
     * 現在固定機能で「VP8」「VP9」を削除
     */
    public sdpStripper(sdp): object {
        const _sdp = sdp['sdp'].split(/\r\n|\r|\n/);
        const _conv = [];
        const deleteCode = this.sdpSplitVideoCodeIndex(_sdp);
        // const deleteCode = this.sdpSplitVideoCodeIndex(_sdp, []);
        // 削除コーデックが宣言されている行を削除
        const codeCheck = (s) => {
            let result = false;
            for (const i in deleteCode) {
                if (deleteCode.hasOwnProperty(i)) {
                    if (s.match('\\:' + String(deleteCode[i])) !== null) {
                        result = true;
                    }
                }
            }
            return result;
        };
        // videoコーデックのペイロード一覧から不要なものを消す
        const deleteIndex = (s) => {
            console.log(deleteCode);
            for (const i in deleteCode) {
                if (deleteCode.hasOwnProperty(i)) {
                    s = s.replace(deleteCode[i] + ' ', '');
                }
            }
            return s;
        };

        // SDP整形処理
        for (const key in _sdp) {
            if (_sdp.hasOwnProperty(key)) {
                if (_sdp[key].match('m\\=video') !== null) {
                    _sdp[key] = deleteIndex(_sdp[key]);
                    _conv.push(_sdp[key]);
                } else if (!codeCheck(_sdp[key])) {
                    _conv.push(_sdp[key]);
                }
            }
        }
        // 整形済みのSDPをオブジェクトに戻す
        sdp['sdp'] = _conv.join('\r\n');
        return sdp;
    }

    /**
     * 削除コーデックのペイロード番号を取得
     * 削除コーデックのRTXペイロードも取得
     * @param sdp 配列変換されたsdpデータ
     * @param codec 削除対象のコーデック
     */
    private sdpSplitVideoCodeIndex(sdp): object {
        const index = [];
        const apt = [];

        const codec_check = this.delCodec.join('|');
        for (const key in sdp) {
            if (sdp.hasOwnProperty(key)) {
                if (sdp[key].match(('apt=')) !== null) {
                    apt.push(sdp[key]);
                }
                if (sdp[key].match(codec_check) !== null) {
                    index.push(this.stlipCodecIndex(sdp[key]));
        　      }
            }
        }
        const apt_check = index.join('|');
        for (const key in apt) {
            if (apt.hasOwnProperty(key)) {
                if (apt[key].match(apt_check) !== null) {
                    const apt_index = this.stplipAPTIndex(apt[key]);
                    if (!index.includes(apt_index)) {
                        index.push(apt_index);
                    }
                }
            }
        }
        return index;
    }

    /**
     * SDPからコーデック情報を取得
     * @param codec コーデック
     */
    private stlipCodecIndex(codec): number {
        const _co = codec.split(' ');
        const _co2 = _co[0].split(':');
        return Number(_co2[1]);
    }

    /**
     * @param sdp
     */
    private stplipAPTIndex(sdp): number {
        const _apt = sdp.split(' ');
        const _apt2 = _apt[0].split(':');
        return Number(_apt2[1]);
    }

}
