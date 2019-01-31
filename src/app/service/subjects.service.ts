import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SubjectsService {
    private subjects: Subject<any>[] = [];

    publish(eventName: string, sendData: any = null): void {
        // ensure a subject for the event name exists
        this.subjects[eventName] = this.subjects[eventName] || new Subject<any>();

        // publish event
        this.subjects[eventName].next(sendData);
    }

    on(eventName: string): Observable<any> {
        // ensure a subject for the event name exists
        this.subjects[eventName] = this.subjects[eventName] || new Subject<any>();

        // return observable
        return this.subjects[eventName].asObservable();
    }
}
