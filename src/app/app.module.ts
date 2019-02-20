import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { EchoTestComponent } from './demo/echotest.component';
import { VideoroomComponent } from './demo/videoroom.component';
import { ScreenComponent } from './demo/screen.component';
import { RecorderComponent } from './demo/recorder.component';
import { TextRoomComponent } from './demo/textroom.component';

import { AlertComponent, ConfirmationComponent, LoadingComponent } from './_lib_component';

import { MessageService } from './message/message.service';
import {
   WebSocketService, WebRTCService, ImageService,
   MouseService, FileService
} from './service';
import { ImageSaveService } from './_lib_service';


// import { JanusService } from './service';

import { SubjectsService } from './service';

import {
  TextService, UserService, ContentService, DrawService,
  StoryService
} from './service';

@NgModule({
  declarations: [
    AppComponent,
    AlertComponent,
    ConfirmationComponent,
    LoadingComponent,
    EchoTestComponent,
    VideoroomComponent,
    ScreenComponent,
    RecorderComponent,
    TextRoomComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpModule,
    FormsModule
  ],
  providers: [
    SubjectsService,
    MessageService,
    WebSocketService,
    MouseService,
    WebRTCService,
    ImageService,
    TextService, UserService, ContentService, DrawService,
    StoryService, FileService,
    ImageSaveService
  ],
  bootstrap: [
    AppComponent,
  ]
})
export class AppModule { }
