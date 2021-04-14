import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RuntimeRoutingModule } from './runtime-routing.module';
import { RuntimeListComponent } from './runtime-list/runtime-list.component';
import { RuntimeDetailComponent } from './runtime-detail/runtime-detail.component';
import { RuntimePalletDetailComponent } from './pallet/runtime-pallet-detail/runtime-pallet-detail.component';
import { RuntimeCallDetailComponent } from './call/runtime-call-detail/runtime-call-detail.component';
import { RuntimeEventDetailComponent } from './event/runtime-event-detail/runtime-event-detail.component';
import { RuntimeStorageDetailComponent } from './storage/runtime-storage-detail/runtime-storage-detail.component';
import { RuntimeConstantDetailComponent } from './constant/runtime-constant-detail/runtime-constant-detail.component';
import { RouterModule } from '@angular/router';


@NgModule({
  declarations: [RuntimeListComponent, RuntimeDetailComponent, RuntimePalletDetailComponent,
    RuntimeCallDetailComponent, RuntimeEventDetailComponent, RuntimeStorageDetailComponent, RuntimeConstantDetailComponent,
  ],
  imports: [
    CommonModule,
    RuntimeRoutingModule,
    RouterModule
  ]
})
export class RuntimePallet {
}
