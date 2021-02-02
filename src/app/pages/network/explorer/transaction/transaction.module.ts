import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TransactionRoutingModule } from './transaction-routing.module';
import { TransactionListComponent } from './transaction-list/transaction-list.component';
import { TransactionDetailComponent } from './transaction-detail/transaction-detail.component';
import { IdenticonComponent } from '../../../../../substrate-components-lib/components/identicon/identicon.component';


@NgModule({
  declarations: [
    TransactionListComponent,
    TransactionDetailComponent,
    IdenticonComponent
  ],
  imports: [
    CommonModule,
    TransactionRoutingModule
  ]
})
export class TransactionModule {
}
