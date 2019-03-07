import { BrowserModule } from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { ScreenComponent } from './demo/screen.component';

import { AlertComponent, ConfirmationComponent, LoadingComponent } from './_lib_component';

import { MessageService } from './message/message.service';
import {
   WebSocketService, ImageService,
   MouseService, FileService,
   WebRTCService, RecorderService,
   SDPService
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
    ScreenComponent,
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
    WebRTCService, RecorderService, SDPService,
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
