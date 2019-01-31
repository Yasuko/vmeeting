import { Injectable } from '@angular/core';
import { SubjectsService } from '../../service';

@Injectable()
export class ImageLoadingService {

    private ImageData = new Object;
    private loadState = false;

    constructor(
        private subjectService: SubjectsService
    ) {}

    public setImage(images): void {
        this.ImageData = images;
    }
    public getImage(): object {
        this.loadState = false;
        return this.ImageData;
    }
    public getLoadState(): boolean {
        return this.loadState;
    }
    public loadImage(): void {
        const Reader = new Object;
        const LoadedImage = new Array;
        const fileCount = Object.keys(this.ImageData).length;
        let loadCount = 0;
        const Loader = (i) => {
            Reader[i] = new FileReader();
            Reader[i].onloadend = (e) => {
                LoadedImage[i] = new Image;
                LoadedImage[i] = e.target.result;
                console.log(fileCount);
                console.log(loadCount);
                if (loadCount === fileCount - 1) {
                    this.ImageData = LoadedImage;
                    this.loadState = true;
                    this.hub('load_local_image', '');
                } else {
                    loadCount++;
                }
            };
            Reader[i].readAsDataURL(this.ImageData[i]);
        };

        // データタイプの判定
        if (!this.ImageData[0] || this.ImageData[0].type.indexOf('image/') < 0) {
        } else {
            for (let i = 1; i <= fileCount; i++) {
                if (i <= 4) {
                    Loader(i - 1);
                }
            }

        }
    }
    private hub(tag: string, data: any): void {
        this.subjectService.publish(tag, data);
    }
}

