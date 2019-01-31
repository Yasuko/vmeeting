import { Injectable } from '@angular/core';


@Injectable()
export class ImageResizeService {

    private Image;
    private ImageData;
    private ResizeImage;
    private ResizeImageData;

    private originalWidth = 0;
    private originalHeight = 0;
    private resizeWidth = 0;
    private resizeHeight = 0;
    private rate = 0;

    constructor(
    ) {}


    public async publishResize(img, w = 0, h = 0, r = 0): Promise<string> {
        this.setImage(img);
        this.getImageSize(img);
        if (r === 0) {
            this.resizeWidth = w;
            this.resizeHeight = h;
            this.setRate();
        } else {
            this.resizeWidth = this.originalWidth * r;
            this.resizeHeight = this.originalHeight * r;
            this.rate = r;
        }
        return this.resizeImage();
    }

    /**
     * アルゴリズムべースのリサイズ処理
     * @param img 変換元画像データ
     * @param r 変換倍率
     * @param mode リサイズアルゴリズム
     * バイキュービック法：　bicubic
     * ランチョス法　　　：　lanczos3
     * バイリニア法　　　：　bilinear
     */
    public publishCalcResize(img, r: number = 1, mode: string = 'bi'): Promise<string> {
        this.setImage(img);
        this.getImageSize(img);
        this.resizeWidth = this.originalWidth * r;
        this.resizeHeight = this.originalHeight * r;
        this.rate = r;

        return this.calcResize(mode);
    }

    public setRate(): void {
        const rate = (this.resizeWidth / this.originalWidth).toFixed(2);
        this.rate = Number(rate);
    }

    /**
     * 用紙サイズ設定
     * @param width
     * @param height
     */
    public setimageSize(width: number, height: number): void {
        this.originalWidth = width;
        this.originalHeight = height;
    }

    public setImage(img): void {
        this.Image = img;
    }

    public resizeImage(): Promise<string> {
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        oc.setAttribute('width', (this.resizeWidth).toString());
        oc.setAttribute('height', (this.resizeHeight).toString());

　       return new Promise((resolve, reject) => {
            const loadImage = () => {
                const img = new Image();
                    img.onload = (e) => {
                        ctx.drawImage(img, 0, 0, this.resizeWidth, this.resizeHeight);
                        this.ResizeImage = oc.toDataURL('image/jpg');
                        resolve(this.ResizeImage);
                    };
                img.src = this.Image;
            };
            loadImage();
        });
    }

    private async calcResize(mode: string): Promise<any> {
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        oc.setAttribute('width', (this.originalWidth).toString());
        oc.setAttribute('height', (this.originalHeight).toString());


        const loadImage = () => {
            const img = new Image();
                img.onload = (e) => {
                    ctx.drawImage(img, 0, 0, this.originalWidth, this.originalHeight);
                    this.ImageData = ctx.getImageData(0, 0, this.originalWidth, this.originalHeight).data;
                    if (mode === 'bicubic') {
                        this.ResizeImage = this.resizeByBicubic();
                    } else if (mode === 'lanczos3') {
                        this.ResizeImage = this.resizeByLanczos3();
                    } else if (mode === 'bilinear') {

                    }
                    return this.ResizeImage;
                };
            img.src = this.Image;
        };
        return await loadImage();
    }

    private resizeByNormal(): void {

    }

    private async resizeByBicubic(): Promise<any> {
        const dc = <HTMLCanvasElement> document.createElement('canvas');
        const dstCtx = dc.getContext('2d');
        const dstImgData = dstCtx.getImageData(0, 0, this.resizeWidth, this.resizeHeight);
        const dData = dstImgData.data;

        const range = [-1, 0, 1, 2];
        let pos = 0;

        for (let dy = 0; dy < this.resizeHeight; dy++) {
            const sy = dy / this.rate;
            const rangeY = range.map(i => i + Math.floor(sy));

            for (let dx = 0; dx < this.resizeWidth; dx++) {
                const sx = dx / this.rate;
                const rangeX = range.map(i => i + Math.floor(sx));

                let r = 0, g = 0, b = 0;
                for (const y of rangeY) {
                    const weightY = this.getWeightByBicubic(y, sy);
                    for (const x of rangeX) {
                        const weight = weightY * this.getWeightByBicubic(x, sx);
                        if (weight === 0) {
                        continue;
                        }

                        const color: any = this.rgb(x, y);
                        r += color.r * weight;
                        g += color.g * weight;
                        b += color.b * weight;
                    }
                }
                dData[pos++] = Math.floor(r);
                dData[pos++] = Math.floor(g);
                dData[pos++] = Math.floor(b);
                dData[pos++] = 255;
            }
        }

        return  dc.toDataURL('image/jpg');
    }


    private async resizeByLanczos3(): Promise<string> {
        const dc = <HTMLCanvasElement> document.createElement('canvas');
        const dstCtx = dc.getContext('2d');
        const dstImgData = dstCtx.getImageData(0, 0, this.resizeWidth, this.resizeHeight);
        const dData = dstImgData.data;

        const range = [-2, -1, 0, 1, 2, 3];

        let pos = 0;
        for (let dy = 0; dy < this.resizeHeight; dy++) {
          const sy = dy / this.rate;
          const rangeY = range.map(i => i + Math.floor(sy));

          for (let dx = 0; dx < this.resizeWidth; dx++) {
            const sx = dx / this.rate;
            const rangeX = range.map(i => i + Math.floor(sx));

            let r = 0, g = 0, b = 0;
            for (const y of rangeY) {
              const weightY = this.getWeightByLanczos(y, sy);
              for (const x of rangeX) {
                const weight = weightY * this.getWeightByLanczos(x, sx);
                if (weight === 0) {
                  continue;
                }

                const color: any = this.rgb(x, y);
                r += color.r * weight;
                g += color.g * weight;
                b += color.b * weight;
              }
            }

            dData[pos++] = Math.floor(r);
            dData[pos++] = Math.floor(g);
            dData[pos++] = Math.floor(b);
            dData[pos++] = 255;
          }
        }

        return  dc.toDataURL('image/jpg');
    }

    private getWeightByBicubic(t1, t2): number {
        const a = -1;
        const d = Math.abs(t1 - t2);
        if (d < 1) {
            return (a + 2) * Math.pow(d, 3) - (a + 3) * Math.pow(d, 2) + 1;
        } else if (d < 2) {
            return a * Math.pow(d, 3) - 5 * a * Math.pow(d, 2) + 8 * a * d - 4 * a;
        } else {
            return 0;
        }
    }
    private getWeightByLanczos(t1, t2): number {
        const sinc = (t) => {
            return Math.sin(t * Math.PI) / (t * Math.PI);
        };
        const d = Math.abs(t1 - t2);
        if (d === 0) {
          return 1;
        } else if (d < 3) {
          return sinc(d) * sinc(d / 3);
        } else {
          return 0;
        }
      }
    private getImageSize(img): void {
        const _img = new Image();
        _img.onload = (e) => {
            this.setimageSize(_img.naturalWidth, _img.naturalHeight);
        };
        img.src = img;
    }

    private rgb(x, y): object {
        x = x < 0 ? 0 : x < this.originalWidth ? x : this.originalWidth - 1;
        y = y < 0 ? 0 : y < this.originalHeight ? y : this.originalHeight - 1;
        const p = ((this.originalWidth * y) + x) * 4;
        return {
            r: this.ImageData[p],
            g: this.ImageData[p + 1],
            b: this.ImageData[p + 2]
        };
    }

    initialization(): void {
    }
}

