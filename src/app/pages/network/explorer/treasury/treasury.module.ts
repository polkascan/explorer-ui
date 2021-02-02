import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TreasuryRoutingModule } from './treasury-routing.module';
import { TreasuryProposalListComponent } from './proposal/treasury-proposal-list/treasury-proposal-list.component';
import { TreasuryProposalDetailComponent } from './proposal/treasury-proposal-detail/treasury-proposal-detail.component';


@NgModule({
  declarations: [TreasuryProposalListComponent, TreasuryProposalDetailComponent],
  imports: [
    CommonModule,
    TreasuryRoutingModule
  ]
})
export class TreasuryModule { }
