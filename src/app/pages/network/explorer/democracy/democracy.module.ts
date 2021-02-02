import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DemocracyRoutingModule } from './democracy-routing.module';
import { DemocracyProposalListComponent } from './proposal/democracy-proposal-list/democracy-proposal-list.component';
import { DemocracyProposalDetailComponent } from './proposal/democracy-proposal-detail/democracy-proposal-detail.component';
import { DemocracyPreimageListComponent } from './preimage/democracy-preimage-list/democracy-preimage-list.component';
import { DemocracyPreimageDetailComponent } from './preimage/democracy-preimage-detail/democracy-preimage-detail.component';
import { DemocracyReferendumListComponent } from './referendum/democracy-referendum-list/democracy-referendum-list.component';
import { DemocracyReferendumDetailComponent } from './referendum/democracy-referendum-detail/democracy-referendum-detail.component';


@NgModule({
  declarations: [DemocracyProposalListComponent, DemocracyProposalDetailComponent, DemocracyPreimageListComponent, DemocracyPreimageDetailComponent, DemocracyReferendumListComponent, DemocracyReferendumDetailComponent],
  imports: [
    CommonModule,
    DemocracyRoutingModule
  ]
})
export class DemocracyModule { }
