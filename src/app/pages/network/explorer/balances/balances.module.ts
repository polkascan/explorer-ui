import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BalancesRoutingModule } from './balances-routing.module';
import { BalancesTransferListComponent } from './transfer/balances-transfer-list/balances-transfer-list.component';
import { BalancesTransferDetailComponent } from './transfer/balances-transfer-detail/balances-transfer-detail.component';


@NgModule({
  declarations: [BalancesTransferListComponent, BalancesTransferDetailComponent],
  imports: [
    CommonModule,
    BalancesRoutingModule
  ]
})
export class BalancesModule { }
