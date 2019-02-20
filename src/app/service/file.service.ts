import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import * as socketIo from 'socket.io-client';
import { SubjectsService } from './subjects.service';
import { reject } from 'q';


@Injectable()
export class FileService {

    private images = [];
    private files = [];

    private Reader: FileReader = null;
    private sizeLimit = 5000000;

    private iconList = {
        'zip': 'zip',
        'exe': 'pc',
        'pdf': 'pdf',
        'txt': 'txt',
        'xlsx': 'excell',
        'xls': 'excell',
        'docx': 'word',
        'doc': 'word',
    };

    constructor(
        private subjectService: SubjectsService
    ) {}

    public getDragFile(e: any): Promise<boolean> {
        const file = e.dataTransfer.files;
        const count = file.length;
        let counter = 0;
        return new Promise((resolve) => {
            for (const key in file) {
                if (file.hasOwnProperty(key)) {
                    if (this.checkFileSize(file[key])) {
                        this.ReadFile(file[key]).then(() => {
                            counter++;
                            if (count === counter) {
                                resolve(true);
                            }
                        });
                    }
                }
            }
            // resolve(false);
        });
    }

    private ReadFile(file: any): Promise<boolean> {
        this.Reader = new FileReader();
        return new Promise((resolve) => {
            try {
                this.Reader.onloadend = (event: any) => {
                    const type = this.checkFileType(file);
                    const _file = event.target.result;
                    if (this.checkImage(type)) {
                        this.addImage(_file, type, file.name, file.size);
                    } else {
                        this.addFile(_file, type, file.name, file.size);
                    }
                    this.sendFile(_file, type, file.name, file.size);
                    resolve(true);
                };
                this.Reader.readAsDataURL(file);
            } catch (error) {
                console.log('File Read ERROR ::' + error);
                resolve(false);
            }
        });
    }

    private checkImage(type: string): boolean {
        if (type === 'jpeg' || type === 'gif' || type === 'png') {
            return true;
        } else {
            return false;
        }
    }
    private checkFileType(file): string {
        if (file.type.indexOf('jpeg') > 0) {
            return 'jpeg';
        } else if (file.type.indexOf('gif') > 0) {
            return 'gif';
        } else if (file.type.indexOf('png') > 0) {
            return 'png';
        } else if (file.type.indexOf('x-zip-compressed') > 0) {
            return 'zip';
        } else if (file.type.indexOf('x-msdownload') > 0) {
            return 'exe';
        } else if (file.type.indexOf('pdf') > 0) {
            return 'pdf';
        } else if (file.type.indexOf('text') > 0) {
            return 'txt';
        } else if (file.type.indexOf('spreadsheetml') > 0) {
            return 'xlsx';
        } else if (file.type.indexOf('vnd.ms-excel') > 0) {
            return 'xls';
        } else if (file.type.indexOf('wordprocessingml') > 0) {
            return 'docx';
        } else if (file.type.indexOf('msword') > 0) {
            return 'doc';
        } else {
            return 'file';
        }
    }

    private checkFileSize(file): boolean {
        if (this.sizeLimit === 0) {
            return true;
        } else {
            if (file.size <= this.sizeLimit) {
                return true;
            } else {
                return false;
            }
        }
    }

    public getIcon(type): string {
        if (this.iconList.hasOwnProperty(type)) {
            return this.iconList[type];
        } else {
            return 'file';
        }
    }

    public addRemoteFile(file: any): void {
        if (this.checkImage(file.type)) {
            this.addImage(
                file.data, file.type, file.name, file.size
                );
        } else {
            this.addFile(
                file.data, file.type, file.name, file.size
                );
        }
    }

    public addFile(file, type, name, size): void {
        const _file = {
            data: file,
            type: type,
            name: name,
            size: size
        };
        this.files.push(_file);
    }

    public addImage(image, type, name, size): void {
        const _file = {
            data: image,
            type: type,
            name: name,
            size: size
        };
        this.images.push(_file);
    }

    private sendFile(file, type, name, size): void {
        console.log(name);
        this.subjectService.publish(
            'pub_file_send',
            {
                data: file,
                type: type,
                name: name,
                size: size
            }
        );
    }

    public getAllFile(): object {
        return this.files;
    }

    public getFileByIndex(index: number): object {
        const file = this.files.filter((n, i, a) => {
            if (i === index) {
                return n;
            }
        });
        return file[0];
    }

    public getFileByType(type: string): object {
        const files = this.files.filter(n => {
            if (n.type === type) {
                return n;
            }
        });
        return files;
    }

    public getAllImage(): object {
        return this.images;
    }

    public getImageByIndex(index: number): object {
        const image = this.images.filter((n, i, a) => {
            if (i === index) {
                return n;
            }
        });
        return image[0];
    }

    public getImageByType(type: string): object {
        const image = this.images.filter(n => {
            if (n.type === type) {
                return n;
            }
        });
        return image;
    }

    public deleteFileByIndex(index: number): void {
        const files = this.files.filter((n, i, a) => {
            if (i !== index) {
                return n;
            }
        });
        this.files = files;
    }

    public deleteFileByType(type: string): void {
        const files = this.files.filter(n => {
            if (n.type !== type) {
                return n;
            }
        });
        this.files = files;
    }

    public deleteImageByIndex(index: number): void {
        const files = this.files.filter((n, i, a) => {
            if (i !== index) {
                return n;
            }
        });
        this.files = files;
    }

    public deleteImageByType(type: string): void {
        const files = this.files.filter(n => {
            if (n.type !== type) {
                return n;
            }
        });
        this.files = files;
    }
}



