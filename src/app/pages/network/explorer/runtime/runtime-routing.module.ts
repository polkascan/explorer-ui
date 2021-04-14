import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RuntimeListComponent } from './runtime-list/runtime-list.component';
import { RuntimeDetailComponent } from './runtime-detail/runtime-detail.component';
import { RuntimePalletDetailComponent } from './pallet/runtime-pallet-detail/runtime-pallet-detail.component';
import { RuntimeCallDetailComponent } from './call/runtime-call-detail/runtime-call-detail.component';
import { RuntimeEventDetailComponent } from './event/runtime-event-detail/runtime-event-detail.component';
import { RuntimeStorageDetailComponent } from './storage/runtime-storage-detail/runtime-storage-detail.component';
import { RuntimeConstantDetailComponent } from './constant/runtime-constant-detail/runtime-constant-detail.component';

const routes: Routes = [
  {
    path: '',
    component: RuntimeListComponent
  },
  {
    path: ':specVersion',
    component: RuntimeDetailComponent
  },
  {
    path: ':specVersion/pallet/:pallet',
    component: RuntimePalletDetailComponent
  },
  {
    path: ':specVersion/pallet/:pallet/call/:callName',
    component: RuntimeCallDetailComponent
  },
  {
    path: ':specVersion/pallet/:pallet/event/:eventName',
    component: RuntimeEventDetailComponent
  },
  {
    path: ':specVersion/pallet/:pallet/storage/:storageName',
    component: RuntimeStorageDetailComponent
  },
  {
    path: ':specVersion/pallet/:pallet/constant/:constantName',
    component: RuntimeConstantDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RuntimeRoutingModule {
}
