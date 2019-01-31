import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { alertAnimation } from '../../_lib_service';
import { SubjectsService } from '../../service';

@Component({
    selector: 'app-alert',
    templateUrl: './alert.component.html',
    styleUrls: ['./alert.scss'],
    animations: [ alertAnimation ]
})

export class AlertComponent implements OnInit {

    alert = 'hide';
    alertMessage = '';
    zindex1 = 0;

    subscription: Subscription;
    constructor(
        private subjectsService: SubjectsService,
    ) {
    }

    ngOnInit(): void {
        this.alertCheck();
    }
    alertCheck(): void {
        this.subjectsService
            .on('alert')
            .subscribe((mess) => {
                this.alertMessage = mess;
                this.setupAlert();
            });
    }
    /**
     * アラート画面表示
     * @param message
     */
    setupAlert(): void {
        this.alert = 'show';
        this.zindex1 = 100000;
        setTimeout(() => {
            this.alert = 'hide';
            this.zindex1 = 0;
            this.alertMessage = '';
        }, 2000);
    }

}
