
export class LoadScreenService {

    imageData;
    imageName;
    imageType;

    constructor() {}

    /**
     * ファイル情報登録
     * @param name  ファイル名
     * @param type  拡張子
     * @param image 画像データ
     */
    setParam(name: string, type: string, image): void {
        this.imageData = image;
        this.imageName = name;
        this.imageType = type;
    }

    /**
    * 画像の保存
    *
    */
    saveImage(): void {
        const dlData = this.Base64toBlob(this.imageData);
        const type = this.imageType.split('/');
        this.saveBlob(dlData, this.imageName + '.' + type[1]);
    }
    Base64toBlob(base64): any {
        const tmp = base64.split(',');
        const data = atob(tmp[1]);
        const mime = tmp[0].split(':')[1].split(';')[0];

        // const buff = new ArrayBuffer(data.length);
        // const arr = new Uint8Array(buff);
        const arr = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            arr[i] = data.charCodeAt(i);
        }
        const blob = new Blob([arr], { type: mime });
        return blob;
    }
    saveBlob(blob, file): void {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (userAgent.indexOf('msie') !== -1) {
            window.navigator.msSaveBlob(blob, file);
        } else {
            const url = (window.URL || (window as any).web);
            const data = url.createObjectURL(blob);
            const e = document.createEvent('MouseEvents');
            e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            const a = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
            a.setAttribute('href', data);
            a.setAttribute('download', file);
            a.dispatchEvent(e);
        }
    }
}
