import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TreasuryProposalListComponent } from './proposal/treasury-proposal-list/treasury-proposal-list.component';
import { TreasuryProposalDetailComponent } from './proposal/treasury-proposal-detail/treasury-proposal-detail.component';

const routes: Routes = [
  {
    path: 'proposal',
    component: TreasuryProposalListComponent
  },
  {
    path: 'proposal/:id',
    component: TreasuryProposalDetailComponent
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
export class TreasuryRoutingModule {
}
