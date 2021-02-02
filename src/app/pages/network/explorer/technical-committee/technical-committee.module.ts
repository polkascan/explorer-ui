import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TechnicalCommitteeRoutingModule } from './technical-committee-routing.module';
import { TechnicalCommitteeProposalListComponent } from './proposal/technical-committee-proposal-list/technical-committee-proposal-list.component';
import { TechnicalCommitteeProposalDetailComponent } from './proposal/technical-committee-proposal-detail/technical-committee-proposal-detail.component';


@NgModule({
  declarations: [TechnicalCommitteeProposalListComponent, TechnicalCommitteeProposalDetailComponent],
  imports: [
    CommonModule,
    TechnicalCommitteeRoutingModule
  ]
})
export class TechnicalCommitteeModule { }
