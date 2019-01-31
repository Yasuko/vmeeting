import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { confirmationAnimation } from '../../_lib_service';
import { SubjectsService } from '../../service';

@Component({
    selector: 'app-confirmation',
    templateUrl: './confirmation.component.html',
    styleUrls: ['./confirmation.scss'],
    animations: [ confirmationAnimation ]
})

export class ConfirmationComponent implements OnInit {

    confirmation = 'hide';
    confirmationMessage = '';
    callback = '';
    zindex1 = 0;
    zindex2 = 0;

    subscription: Subscription;
    constructor(
        private subjectsService: SubjectsService,
    ) {
    }
    ngOnInit(): void {
        this.confirmationCheck();
    }
    confirmationCheck(): void {
        this.subjectsService
            .on('confirmation')
            .subscribe((mess) => {
                this.confirmationMessage = mess['message'];
                this.callback = mess['callback'];
                this.showConfirmation();
            });
    }
    /**
     * 確認画面表示
     * @param message
     */
    showConfirmation(): void {
        this.zindex1 = 10000;
        this.zindex2 = this.zindex1 + 1;
        this.confirmation = 'show';
    }
    /**
     * 確認画面消す
     * @param message
     */
    closeConfirmation(): void {
        this.zindex1 = 0;
        this.zindex2 = 0;
        this.confirmation = 'hide';
        this.confirmationMessage = '';
    }
    accept(): void {
        // this.callback();
        this.closeConfirmation();
        this.subjectsService
            .publish('confirmation_result', {
                'result': true,
                'body': this.callback
            });
    }

    reject(): void {
        this.closeConfirmation();
    }
}
