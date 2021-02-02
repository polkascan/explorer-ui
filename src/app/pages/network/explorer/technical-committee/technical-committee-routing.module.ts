import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TechnicalCommitteeProposalListComponent } from './proposal/technical-committee-proposal-list/technical-committee-proposal-list.component';
import { TechnicalCommitteeProposalDetailComponent } from './proposal/technical-committee-proposal-detail/technical-committee-proposal-detail.component';

const routes: Routes = [
  {
    path: 'proposal',
    component: TechnicalCommitteeProposalListComponent
  },
  {
    path: 'proposal/:id',
    component: TechnicalCommitteeProposalDetailComponent
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
export class TechnicalCommitteeRoutingModule { }
