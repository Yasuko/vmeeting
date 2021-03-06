import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class MouseService {

    private correctionX: number = 0;
    private correctionY: number = 0;
    private mouseStartX: number;
    private mouseStartY: number;
    private mouseMoveX: number;
    private mouseMoveY: number;
    private moveSwitch: boolean;

    constructor(

    ) {}
    public mouseEventOff(e: any): void {
        e.preventDefault();
    }
    public mouseEventOn(e: any): void {
        e.stopPropagation();
    }
    public convertMouseDefference(e: any, top, left): object {
        const position = this.getPositions(e);

        const x = position['x'] - left;
        const y = position ['y'] - top;
        return {mousex: x, mousey: y};
    }
    public setCorrection(rect: DOMRect | ClientRect): void {
        this.correctionX = rect.left;
        this.correctionY = rect.top;
    }

    public setStartPosition(e: any): void {
        e.preventDefault();
        this.reset();
        const position = this.getPositions(e);

        this.mouseStartX = position['x'] - this.correctionX;
        this.mouseStartY = position ['y'] - this.correctionY;
        this.moveSwitch = true;
    }

    public end(e: any): void {
        e.stopPropagation();
        this.reset();
        this.moveSwitch = false;
    }

    public mouseMove(e: any): void {
        const position = this.getPositions(e);
        if (this.moveSwitch) {
            if (this.mouseMoveX > 0) {
                this.mouseStartX = this.mouseMoveX;
                this.mouseStartY = this.mouseMoveY;
            }
            this.mouseMoveX = position['x'] - this.correctionX;
            this.mouseMoveY = position['y'] - this.correctionY;
        }
    }

    public getMousePosition(): object {
        return {
            startx: this.mouseStartX,
            starty: this.mouseStartY,
            movex: this.mouseMoveX,
            movey: this.mouseMoveY,
        };
    }

    public getMoveFlag(): boolean {
        return this.moveSwitch;
    }

    public getPositions(e: any): object {
        if (!e.clientX) {
            return {x: e.pageX, y: e.pageY};
        } else {
            return {x: e.clientX, y: e.clientY};
        }
    }

    private reset(): void {
        this.mouseStartX = 0;
        this.mouseStartY = 0;
        this.mouseMoveX = 0;
        this.mouseMoveY = 0;
    }


}
