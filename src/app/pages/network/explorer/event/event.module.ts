import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EventRoutingModule } from './event-routing.module';
import { EventListComponent } from './event-list/event-list.component';
import { EventDetailComponent } from './event-detail/event-detail.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PolkadotAngularLibModule } from '../../../../../substrate-components-lib/polkadot-angular-lib.module';


@NgModule({
  declarations: [
    EventListComponent,
    EventDetailComponent,
  ],
  imports: [
    CommonModule,
    EventRoutingModule,
    ReactiveFormsModule,
    PolkadotAngularLibModule
  ]
})
export class EventModule {
}
