import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DemocracyProposalListComponent } from './proposal/democracy-proposal-list/democracy-proposal-list.component';
import { DemocracyProposalDetailComponent } from './proposal/democracy-proposal-detail/democracy-proposal-detail.component';
import { DemocracyPreimageListComponent } from './preimage/democracy-preimage-list/democracy-preimage-list.component';
import { DemocracyPreimageDetailComponent } from './preimage/democracy-preimage-detail/democracy-preimage-detail.component';
import { DemocracyReferendumListComponent } from './referendum/democracy-referendum-list/democracy-referendum-list.component';
import { DemocracyReferendumDetailComponent } from './referendum/democracy-referendum-detail/democracy-referendum-detail.component';

const routes: Routes = [
  {
    path: 'proposal',
    component: DemocracyProposalListComponent
  },
  {
    path: 'proposal/id',
    component: DemocracyProposalDetailComponent
  },
  {
    path: 'preimage',
    component: DemocracyPreimageListComponent
  },
  {
    path: 'preimage/:id',
    component: DemocracyPreimageDetailComponent
  },
  {
    path: 'referendum',
    component: DemocracyReferendumListComponent
  },
  {
    path: 'referendum/:id',
    component: DemocracyReferendumDetailComponent
  },
  {
    path: '',
    redirectTo: 'proposal'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DemocracyRoutingModule { }
