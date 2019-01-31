import { Injectable } from '@angular/core';
import { SubjectsService } from '../../service';

@Injectable()
export class ImageOrientationService {

    private ImageData: string[] = new Array<string>();
    constructor(
        private subjectService: SubjectsService
    ) {}

    public getImage(): string[] {
        return this.ImageData;
    }

    public doOrientation(image): void {
        const count = Object.keys(image).length - 1;
        let counter = 0;
        const checkCount = () => {
            if (count === counter) {
                this.hub('load_orientation_image', '');
            } else {
                counter++;
            }
        };
        for (const key in image) {
            if (image.hasOwnProperty(key)) {
                const rotate = this.getOrientation(image[key]);
                if (rotate === 0 || rotate === 1) {
                    this.ImageData[key] = image[key];
                    checkCount();
                } else {
                    this.ImgRotation(image[key], rotate)
                        .then((_image) => {
                            this.ImageData[key] = _image;
                            checkCount();
                        });
                }
            }
        }
    }

    getOrientation(imgDataURL: string): number {
        const byteString = atob(imgDataURL.split(',')[1]);
        const orientaion = this.byteStringToOrientation(byteString);
        return orientaion;
    }

    private byteStringToOrientation(img: string): number {
        let head = 0;
        let orientation;
        while (1) {
            if (img.charCodeAt(head) === 255 && img.charCodeAt(head + 1) === 218) { break; }
            if (img.charCodeAt(head) === 255 && img.charCodeAt(head + 1) === 216) {
                head += 2;
            } else {
                const length = img.charCodeAt(head + 2) * 256 + img.charCodeAt(head + 3);
                const endPoint = head + length + 2;
                if (img.charCodeAt(head) === 255 && img.charCodeAt(head + 1) === 225) {
                    const segment = img.slice(head, endPoint);
                    const bigEndian = segment.charCodeAt(10) === 77;
                    let count;
                    if (bigEndian) {
                        count = segment.charCodeAt(18) * 256 + segment.charCodeAt(19);
                    } else {
                        count = segment.charCodeAt(18) + segment.charCodeAt(19) * 256;
                    }
                    for (let i = 0; i < count; i++) {
                        const field = segment.slice(20 + 12 * i, 32 + 12 * i);
                        if ((bigEndian && field.charCodeAt(1) === 18) || (!bigEndian && field.charCodeAt(0) === 18)) {
                            orientation = bigEndian ? field.charCodeAt(9) : field.charCodeAt(8);
                        }
                    }
                    break;
                }
                head = endPoint;
            }
            if (head > img.length) { break; }
        }
        return orientation;
    }

    /**
     * 画像回転
     * ローテーションの意味
     * ０：未定義　１：通常　２：左右反転　３：180度回転　４：上下反転
     * ５：反時計回りに９０度回転　上下反転
     * ６：時計回りに９０度回転
     * ７：時計回りに９０度回転　上下反転
     * ８：反時計回りに９０度回転
     * @param imgB64_src 画像データ
     * @param width 横幅
     * @param height 高さ
     * @param rotate 取得したオリエンテーション情報
     * @param callback あ
     */
    ImgRotation(imgB64_src, rotate): Promise<any> {
        // Image Type
        const img_type = imgB64_src.substring(5, imgB64_src.indexOf(';'));

        // Source Image
        const img = new Image();
        return new Promise((resolve, reject) => {

            img.onload = (e) => {
                // New Canvas
                const canvas = <HTMLCanvasElement> document.createElement('canvas');
                const width = img.naturalWidth;
                const height = img.naturalHeight;
                if (rotate === 5 || rotate === 6 || rotate === 7 || rotate === 8) {
                    // swap w <==> h
                    canvas.setAttribute('width', height.toString());
                    canvas.setAttribute('height', width.toString());
                } else {
                    canvas.setAttribute('width', width.toString());
                    canvas.setAttribute('height', height.toString());
                }

                // Draw (Resize)
                const ctx = canvas.getContext('2d');
                if (rotate === 0) {

                } else if (rotate === 1) {

                } else if (rotate === 2) {
                    ctx.transform(1, -1, 0, 0, 0, 0);
                } else if (rotate === 3) {
                    ctx.rotate(180 * Math.PI / 180);
                    ctx.translate(-width, -height);
                } else if (rotate === 4) {
                    ctx.transform(1, 0, 0, -1, 0, 0);
                } else if (rotate === 5) {
                    ctx.rotate(270 * Math.PI / 180);
                    ctx.translate(-width, 0);
                    ctx.transform(1, 0, 0, -1, 0, 0);
                } else if (rotate === 6) {
                    ctx.rotate(90 * Math.PI / 180);
                    ctx.translate(0, -height);
                } else if (rotate === 7) {
                    ctx.rotate(rotate * Math.PI / 180);
                    ctx.translate(0, -height);
                    ctx.transform(1, 0, 0, -1, 0, 0);
                } else if (rotate === 8) {
                    ctx.rotate(270 * Math.PI / 180);
                    ctx.translate(-width, 0);
                }
                ctx.drawImage(img, 0, 0, width, height);
                // _ctx.drawImage(img, 0, 0, _width, _height);
                // Destination Image

                resolve(canvas.toDataURL(img_type));
            };
            img.src = imgB64_src;
        });
    }

    private hub(tag: string, data: any): void {
        this.subjectService.publish(tag, data);
    }
}

