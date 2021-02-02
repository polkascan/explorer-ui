import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SessionRoutingModule } from './session-routing.module';
import { SessionListComponent } from './session/session-list/session-list.component';
import { SessionDetailComponent } from './session/session-detail/session-detail.component';
import { SessionValidatorListComponent } from './validator/session-validator-list/session-validator-list.component';
import { SessionValidatorDetailComponent } from './validator/session-validator-detail/session-validator-detail.component';
import { SessionNominatorListComponent } from './nominator/session-nominator-list/session-nominator-list.component';


@NgModule({
  declarations: [SessionListComponent, SessionDetailComponent, SessionValidatorListComponent, SessionValidatorDetailComponent,
    SessionNominatorListComponent],
  imports: [
    CommonModule,
    SessionRoutingModule
  ]
})
export class SessionModule {
}
