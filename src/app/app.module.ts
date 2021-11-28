import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { HelpComponent } from './help/help.component';
import { ParamsComponent } from './params/params.component';
import { TracksComponent } from './tracks/tracks.component';
import { HistoryComponent } from './history/history.component';

@NgModule({
  declarations: [
    AppComponent,
    HelpComponent,
    TracksComponent,
    ParamsComponent,
    HistoryComponent,
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
