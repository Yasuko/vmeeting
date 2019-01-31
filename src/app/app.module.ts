import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';

import { EchoTestComponent } from './demo/echotest.component';
import { VideoroomComponent } from './demo/videoroom.component';
import { ScreenComponent } from './demo/screen.component';

import { AlertComponent, ConfirmationComponent, LoadingComponent } from './_lib_component';

import { MessageService } from './message/message.service';
import { WebSocketService, WebRTCService, ImageService } from './service';
// import { JanusService } from './service';

import { SubjectsService } from './service';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    ConfirmationComponent,
    LoadingComponent,
    EchoTestComponent,
    VideoroomComponent,
    ScreenComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpModule,
    FormsModule
  ],
  providers: [
    SubjectsService,
    MessageService,
    WebSocketService,
    WebRTCService,
    ImageService
    // JanusService
  ],
  bootstrap: [
    AppComponent,
  ]
})
export class AppModule { }
