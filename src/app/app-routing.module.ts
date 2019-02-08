import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ScreenComponent } from './demo/screen.component';

const routes: Routes = [
    {
        path: '',
        component:  ScreenComponent,
    },
    {
        path: '**',
        redirectTo: ''
    }
];
@NgModule({
    imports:    [
        RouterModule.forRoot (routes)
    ],
    exports: [ RouterModule ]
})
export class AppRoutingModule { }
