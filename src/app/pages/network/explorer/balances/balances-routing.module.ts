import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BalancesTransferListComponent } from './transfer/balances-transfer-list/balances-transfer-list.component';
import { BalancesTransferDetailComponent } from './transfer/balances-transfer-detail/balances-transfer-detail.component';

const routes: Routes = [
  {
    path: 'transfer',
    component: BalancesTransferListComponent
  },
  {
    path: 'transfer/:id',
    component: BalancesTransferDetailComponent
  },
  {
    path: '',
    redirectTo: 'transfer'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BalancesRoutingModule { }
