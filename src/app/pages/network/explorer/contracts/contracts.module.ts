import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContractsRoutingModule } from './contracts-routing.module';
import { ContractDetailComponent } from './contract-detail/contract-detail.component';
import { ContractListComponent } from './contract-list/contract-list.component';


@NgModule({
  declarations: [ContractDetailComponent, ContractListComponent],
  imports: [
    CommonModule,
    ContractsRoutingModule
  ]
})
export class ContractsModule { }
