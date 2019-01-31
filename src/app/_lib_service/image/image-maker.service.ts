import { Injectable } from '@angular/core';


@Injectable()
export class ImageMakerService {

    alreadyEnlargement = false;

    /**
     * 印刷サイズ
     */
    private sheetSize = {
        width: 210,
        height: 297
    };
    /**
     * ラベルに関するサイズ、余白情報
     */
    private sheetSpec = {
        marginTop: 0,       // ページ余白上
        marginLeft: 0,      // ページ余白左
    };

    /**
     * 文字デザイン
     */
    private textDesine = {
        fontDesine: 'MS PMincho',
        fontWeight: 'normal',
    };

    private sheetBackground;

    private resulution = 13.78095;

    private printContents = [];
    private printTexts = [];

    private sheetImage;

    constructor(
    ) {}
    /**
     * 用紙サイズ設定
     * @param width
     * @param height
     */
    setSheetSize(width: number, height: number): void {
        this.sheetSize.width = width;
        this.sheetSize.height = height;
        this.alreadyEnlargement = false;
    }
    /**
     * 拡大率設定
     * 印刷用に350dpiに合わせる場合13.78095を設定
     * @param magnification
     */
    setResulution(magnification): void {
        this.resulution = magnification;
        this.alreadyEnlargement = false;
    }
    setSheetPropatie(spec): void {
        this.setParams(spec, 'sheetSpec');
    }
    setSheetBackground(bg): void {
        this.sheetBackground = bg;
    }
    setPrintOption(option): void {
        this.setParams(option, 'printOption');
    }
    setPrintContents(contents): void {
        this.printContents = contents;
    }
    setPrintTextts(texts): void {
        this.printTexts = texts;
    }
    setTextDesine(desine): void {
        this.setParams(desine, 'textDesine');
    }

    /**
     * ■パラメーターの設定
     * 同一keyを持ったパラメーターに設定値を代入
     * @param propatie 設定パラメーター
     * @param target 設定先
     */
    setParams(propatie, target): void {
        for (const key in propatie) {
            if (propatie.hasOwnProperty(key)) {
                console.log(key + ': ' + propatie[key]);
                this[target][key] = propatie[key];
            }
        }
    }

    sheetMaker(): Promise<string> {

        this.doEnlargement();
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        const bg = <HTMLCanvasElement> document.createElement('canvas');
        const bgctx = bg.getContext('2d');
        const fg = <HTMLCanvasElement> document.createElement('canvas');
        const fgctx = fg.getContext('2d');

        oc.setAttribute('width', (this.sheetSize.width).toString());
        oc.setAttribute('height', (this.sheetSize.height).toString());
        bg.setAttribute('width', (this.sheetSize.width).toString());
        bg.setAttribute('height', (this.sheetSize.height).toString());
        fg.setAttribute('width', (this.sheetSize.width).toString());
        fg.setAttribute('height', (this.sheetSize.height).toString());

        for (const key in this.printTexts) {
            if (this.printTexts.hasOwnProperty(key)) {
                fgctx.font = (this.printTexts[key]['size'] * (this.resulution / 3)) + 'px "' + this.textDesine.fontDesine + '"';
                fgctx.fillText(
                    this.printTexts[key]['text'],
                    this.printTexts[key]['x'] * (this.resulution / 3),
                    this.printTexts[key]['y'] * (this.resulution / 3));
            }
        }

        return new Promise((resolve, reject) => {

            const loadImage = () => {
                const img = new Image();
                    img.onload = (e) => {
                        bgctx.drawImage(img, 0, 0, this.sheetSize.width, this.sheetSize.height);

                        ctx.drawImage(bg, 0, 0, this.sheetSize.width, this.sheetSize.height);
                        ctx.drawImage(fg, 0, 0, this.sheetSize.width, this.sheetSize.height);

                        console.log(oc.width);
                        this.sheetImage = oc.toDataURL('image/jpg');
                        resolve(this.sheetImage);
                    };
                img.src = this.sheetBackground;
            };
            loadImage();
        });

    }

    svgToImg(): Promise<string> {

        this.doEnlargement();
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        const bg = <HTMLCanvasElement> document.createElement('canvas');
        const bgctx = bg.getContext('2d');

        oc.setAttribute('width', (this.sheetSize.width).toString());
        oc.setAttribute('height', (this.sheetSize.height).toString());
        bg.setAttribute('width', (this.sheetSize.width).toString());
        bg.setAttribute('height', (this.sheetSize.height).toString());
        return new Promise((resolve, reject) => {

            const loadImage = () => {
                const img = new Image();
                img.onload = (e) => {
                    bgctx.drawImage(img, 0, 0, this.sheetSize.width, this.sheetSize.height);
                    ctx.drawImage(bg, 0, 0, this.sheetSize.width, this.sheetSize.height);

                    this.sheetImage = oc.toDataURL('image/jpg');
                    resolve(this.sheetImage);
                };
                img.src = this.sheetBackground;
            };
            loadImage();
        });
    }
    overFaceShot(face: string): Promise<string> {
        this.doEnlargement();
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        const bg = <HTMLCanvasElement> document.createElement('canvas');
        const bgctx = bg.getContext('2d');
        const fg = <HTMLCanvasElement> document.createElement('canvas');
        const fgctx = fg.getContext('2d');

        oc.setAttribute('width', (this.sheetSize.width).toString());
        oc.setAttribute('height', (this.sheetSize.height).toString());
        bg.setAttribute('width', (this.sheetSize.width).toString());
        bg.setAttribute('height', (this.sheetSize.height).toString());
        fg.setAttribute('width', (this.sheetSize.width).toString());
        fg.setAttribute('height', (this.sheetSize.height).toString());
        const imgFace = new Image();
        imgFace.src = face;
        fgctx.drawImage(imgFace, 2205, 234, 400, 524);
        return new Promise((resolve, reject) => {

            const loadImage = () => {
                const img = new Image();
                    img.onload = (e) => {
                        bgctx.drawImage(img, 0, 0, this.sheetSize.width, this.sheetSize.height);

                        ctx.drawImage(bg, 0, 0, this.sheetSize.width, this.sheetSize.height);
                        ctx.drawImage(fg, 0, 0, this.sheetSize.width, this.sheetSize.height);

                        console.log(oc.width);
                        this.sheetImage = oc.toDataURL('image/jpg');
                        resolve(this.sheetImage);
                    };
                img.src = this.sheetBackground;
            };
            loadImage();
        });
    }

    /**
     * 指定倍率の応じたシートサイズの拡大
     */
    doEnlargement(): void {
        if (!this.alreadyEnlargement) {
            this.sheetSize.width = this.sheetSize.width * this.resulution;
            this.sheetSize.height = this.sheetSize.height * this.resulution;
            this.alreadyEnlargement = true;
        }
    }

    getSheetImage(): string {
        return this.sheetImage;
    }

    initialization(): void {
        this.sheetImage = null;
        this.sheetSize = {
            width: 100,
            height: 148
        };
        this.sheetSpec = {
            marginTop: 0,
            marginLeft: 0,
        };

        this.textDesine = {
            fontDesine: 'MS PMincho',
            fontWeight: 'normal',
        };

        this.resulution = 1;
        this.printContents = [];

        this.resulution = 1;

        this.printContents = [];

        this.sheetImage = null;
    }
}

