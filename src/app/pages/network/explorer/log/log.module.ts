import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LogRoutingModule } from './log-routing.module';
import { LogDetailComponent } from './log-detail/log-detail.component';
import { LogListComponent } from './log-list/log-list.component';


@NgModule({
  declarations: [LogDetailComponent, LogListComponent],
  imports: [
    CommonModule,
    LogRoutingModule
  ]
})
export class LogModule { }
