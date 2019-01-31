import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import 'rxjs';

@Injectable()

export class MessageService {

    private server_url = 'http://192.168.2.223/dist/server/test';

    constructor(private http: Http) {}

    getAll(): Observable<any> {
        return this.http
            .get('/api/messages')
            .pipe(
                map((response: Response) => {
                    const result = response.json();
                    return result;
                }),
                catchError((error: Response) => Observable.throw(error.json()))
            );
    }

    gettest(): Observable<any> {
        return this.http
        .get(this.server_url)
        .pipe(
            map((response: Response) => {
                const result = response.json();
                console.log(response);
                console.log(result);
                return result;
            }),
            catchError((error: Response) => Observable.throw(error.json()))
        );
    }

    regist(message: string): Observable<any> {
        return this.http
            .post('/api/messages', {message: message})
            .pipe(
            map((response: Response) => {
                const result = response.json();
                return result;
            }),
            catchError((error: Response) => Observable.throw(error.json()))
            );
    }
}
