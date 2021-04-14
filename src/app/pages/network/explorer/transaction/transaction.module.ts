import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TransactionRoutingModule } from './transaction-routing.module';
import { TransactionListComponent } from './transaction-list/transaction-list.component';
import { TransactionDetailComponent } from './transaction-detail/transaction-detail.component';
import { PolkadotAngularLibModule } from '../../../../../substrate-components-lib/polkadot-angular-lib.module';
import { ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    TransactionListComponent,
    TransactionDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TransactionRoutingModule,
    PolkadotAngularLibModule
  ]
})
export class TransactionModule {
}
