import { Injectable } from '@angular/core';
import { MouseService } from './';
@Injectable()
export class ImageService {
    private targetTag: any = null;
    private resultTag: any = null;
    private editTag: any = null;
    private layerTag: any = null;

    private images = [];
    private imageContent = {};

    // 編集が有効か
    private editon = false;
    // タグ編集が有効か
    private tagon = false;
    private mouseService: MouseService = null;
    private editer: HTMLCanvasElement;
    private editCtx;

    private editLineColor: string = '#000000';
    private editLineWidth: number = 5;
    private editLineAlpha = 1;
    private editLineCap = 'round';

    private editTags = [];
    private editMoveTag = null;
    private editMoveTagStartX = 0;
    private editMoveTagStartY = 0;

    public setTarget(target, result): void {
        this.targetTag = target;
        this.resultTag = result;
    }

    public setEditer(editer, layer): void {
        this.tagon = false;
        this.editTag = editer;
        this.layerTag = layer;
    }

    public setLineColor(color: string): void {
        this.tagon = false;
        this.editLineColor = color;
    }
    public setLineWidth(width: number): void {
        this.editLineWidth = width;
    }

    /**
     * 付箋の移動開始
     */
    public setMoveTag(index, e): void {
        // this.mouseService.mouseEventOff(e);
        this.editMoveTag = index;
        this.setMousePosition(e);
    }

    public setupTag(): void {
        this.tagon = true;
    }

    /**
     * タグの移動
     * @param e マウスイベント
     */
    public moveTag(e): void {
        if (this.editMoveTag !== null) {
            const position = this.mouseService.convertMouseDefference(
                e,
                this.editMoveTagStartY,
                this.editMoveTagStartX);
            this.editTags[this.editMoveTag]['top'] = this.editTags[this.editMoveTag]['top'] + position['mousey'];
            this.editTags[this.editMoveTag]['left'] = this.editTags[this.editMoveTag]['left'] + position['mousex'];
            this.setMousePosition(e);
        }
    }

    /**
     * タグ移動終了
     */
    public closeMoveTag(e): void {
        // this.mouseService.mouseEventOn(e);
        this.editMoveTag = null;
    }
    private setMousePosition(e): void {
        const position = this.mouseService.getPositions(e);
        this.editMoveTagStartX = position['x'];
        this.editMoveTagStartY = position['y'];
    }

    /**
     * キャプチャエディタ起動
     */
    public setupEditer(): void {
        if (this.editon) {
            return;
        }
        console.log('start capture editer');
        this.editon = true;
        if (this.mouseService !== null) {
            this.mouseService = null;
        }
        this.mouseService = new MouseService();
        this.editer = this.layerTag;
        this.editCtx = this.editer.getContext('2d');
        this.editCtx.clearRect(0, 0, this.editer.width, this.editer.height);

        const rect = this.editer.getBoundingClientRect();
        console.log(rect);
        this.mouseService.setCorrection(rect);

        this.setEditerEvent();
    }

    /**
     * 画面お絵かき用イベント
     */
    private setEditerEvent(): void {
        this.editer.addEventListener('mousedown', (e: MouseEvent) => {
            this.mouseService.setStartPosition(e);
        });
        this.editer.addEventListener('mouseup', (e) => {
            this.mouseService.end(e);
        });
        this.editer.addEventListener('mousemove', (e: MouseEvent) => {
            this.paint(e);
        });
        this.editer.addEventListener('click', (e: MouseEvent) => {
            if (this.tagon) {
                this.mouseService.setStartPosition(e);
                this.addTag(e);
            }
        });
        this.editer.addEventListener('touchstart', (e) => {
            this.mouseService.setStartPosition(e);
        });
        this.editer.addEventListener('touchend', (e) => {
            this.mouseService.end(e);
        });
        this.editer.addEventListener('touchmove', (e) => {
            this.paint(e);
        });
    }
    /**
     * ペイント処理
     * @param e マウスイベント
     */
    private paint(e): void {
        if (this.mouseService.getMoveFlag()) {
            this.mouseService.mouseMove(e);
            const position = this.mouseService.getMousePosition();
            this.editCtx.beginPath();
            this.editCtx.moveTo(
                position['startx'], position['starty']
            );
            this.editCtx.lineTo(
                position['movex'], position['movey']
            );
            this.editCtx.lineCap = this.editLineCap;
            this.editCtx.lineWidth = this.editLineWidth;
            this.editCtx.strokeStyle = this.editLineColor;
            this.editCtx.stroke();
        }
    }

    private addTag(e): void {
        this.mouseService.mouseMove(e);
        const position = this.mouseService.getMousePosition();
        this.editTags.push({
            text: '',
            top: position['starty'],
            left: position['startx']
        });
        this.mouseService.end(e);
    }

    public deleteTag(index): void {
        const tags = this.editTags.filter((n, i, a) => {
            if (i !== index) {
                return n;
            }
        });
        this.editTags = tags;
    }
    /**
     * 編集用キャプチャ画像を編集タグに読み込む
     * @param index キャプチャ配列のインデックス番号
     */
    public setupEditImage(index): Promise<boolean> {
        const img = new Image();
        const l_img = new Image();
        img.src = this.images[index]['image'];
        l_img.src = this.images[index]['layer'];

        // タグを編集オブジェクトにコピー
        this.editTags = this.images[index]['memo'];

        return new Promise((result) => {
            img.onload = () => {
                // 編集タグの取得（ここに書かないと表示前に実行される）
                this.getElement();
                const oc = this.editTag;
                const ctx = oc.getContext('2d');
                ctx.drawImage(img, 0, 0, oc.width, oc.height);
                result(true);
            };
            if (l_img.src !== null) {
                l_img.onload = () => {
                    const loc = this.layerTag;
                    const lctx = loc.getContext('2d');
                    lctx.drawImage(l_img, 0, 0, loc.width, loc.height);
                };
            }
        });
    }

    public closeEditer(index): void {
        this.saveImage(index).then(() => {
            this.editon = false;
            this.mouseService = null;
            this.editer = null;
            this.editTags = [];
        });
    }
    public getCapture(): object {
        return this.images;
    }

    public getCaptureToIndex(index): string {
        return this.images[index];
    }

    public getCaptureContent(index): object {
        return this.getCaptureContent[index];
    }

    public getTags(): object {
        return this.editTags;
    }

    public addCapture(): string {
        const img = this.CaptureVideo();
        this.images.push({
            image: img,
            layer: null,
            memo: []
        });
        return img;
    }

    public async saveImage(index): Promise<boolean> {
        const edit_img = this.CaputureEdit(this.editTag);
        const layer_img = this.CaputureEdit(this.layerTag);
        this.images[index] = {
            image: edit_img,
            layer: layer_img,
            memo: this.editTags
        };
        return false;
    }

    public getSingle(): string {
        return this.CaptureVideo();
    }
    public getElement(): void {
        this.editTag = <HTMLCanvasElement> document.getElementById(this.editTag);
        this.layerTag = <HTMLCanvasElement> document.getElementById(this.layerTag);
    }
    private CaptureVideo(): string {
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        oc.setAttribute('width', (this.targetTag.width).toString());
        oc.setAttribute('height', (this.targetTag.height).toString());
        ctx.drawImage(this.targetTag, 0, 0, this.targetTag.width, this.targetTag.height);
        const img = oc.toDataURL('image/jpg');
        return img;
    }

    private CaputureEdit(target: any): string {
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        oc.setAttribute('width', (target.width).toString());
        oc.setAttribute('height', (target.height).toString());
        ctx.drawImage(target, 0, 0, target.width, target.height);
        const img = oc.toDataURL('image/jpg');
        return img;
    }
}

export class Tag {
    text: string;
    top: number;
    left: number;
}
