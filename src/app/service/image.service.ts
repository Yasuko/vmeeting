import { Injectable } from '@angular/core';

@Injectable()
export class ImageService {
    private targetTag: any = null;
    private resultTag: any = null;

    private images: string[] = [];

    public setTarget(target, result): void {
        this.targetTag = target;
        this.resultTag = result;
    }

    public getCapture(): object {
        return this.images;
    }

    public getCaptureToIndex(index): string {
        return this.images[index];
    }

    public addCapture(): string {
        const img = this.Capture();
        this.images.push(img);
        return img;
    }

    public getSingle(): string {
        return this.Capture();
    }

    private Capture(): string {
        const oc = <HTMLCanvasElement> document.createElement('canvas');
        const ctx = oc.getContext('2d');
        oc.setAttribute('width', (this.targetTag.width).toString());
        oc.setAttribute('height', (this.targetTag.height).toString());
        ctx.drawImage(this.targetTag, 0, 0, this.targetTag.width, this.targetTag.height);
        const img = oc.toDataURL('image/jpg');
        return img;
    }
}
