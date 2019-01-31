import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { fadeInAnimation } from '../../_lib_service';
import { SubjectsService } from '../../service';

@Component({
    selector: 'app-loading',
    templateUrl: './loading.component.html',
    styleUrls: ['./loading.scss'],
    animations: [ fadeInAnimation ],
})

export class LoadingComponent implements OnInit {

    loading = 'default';
    loadMessage = 'Now Yomikonderunen';
    zindex1 = 0;
    zindex2 = 0;

    subscription: Subscription;
    constructor(
        private subjectsService: SubjectsService,
    ) {
    }

    ngOnInit(): void {
        this.loadScreen();
    }
    loadScreen(): void {
        this.subjectsService
            .on('load')
            .subscribe((mess) => {
                if (mess === 'show') {
                    this.loading = 'loading';
                    this.zindex1 = 300000;
                    this.zindex2 = 300001;
                } else {
                    this.loading = 'loadend';
                    this.zindex1 = 0;
                    this.zindex2 = 0;
                }
            });
    }
}
