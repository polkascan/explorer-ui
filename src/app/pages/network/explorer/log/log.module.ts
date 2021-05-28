import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LogRoutingModule } from './log-routing.module';
import { LogDetailComponent } from './log-detail/log-detail.component';
import { LogListComponent } from './log-list/log-list.component';
import { PolkadotAngularLibModule } from '../../../../../substrate-components-lib/polkadot-angular-lib.module';


@NgModule({
  declarations: [LogDetailComponent, LogListComponent],
  imports: [
    CommonModule,
    LogRoutingModule,
    PolkadotAngularLibModule
  ]
})
export class LogModule { }
