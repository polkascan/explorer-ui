import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RuntimeListComponent } from './runtime-list/runtime-list.component';
import { RuntimeDetailComponent } from './runtime-detail/runtime-detail.component';
import { RuntimeModuleListComponent } from './module/runtime-module-list/runtime-module-list.component';
import { RuntimeModuleDetailComponent } from './module/runtime-module-detail/runtime-module-detail.component';
import { RuntimeCallDetailComponent } from './call/runtime-call-detail/runtime-call-detail.component';
import { RuntimeEventDetailComponent } from './event/runtime-event-detail/runtime-event-detail.component';
import { RuntimeStorageDetailComponent } from './storage/runtime-storage-detail/runtime-storage-detail.component';
import { RuntimeConstantDetailComponent } from './constant/runtime-constant-detail/runtime-constant-detail.component';
import { RuntimeTypeListComponent } from './type/runtime-type-list/runtime-type-list.component';

const routes: Routes = [
  {
    path: 'module/:id',
    component: RuntimeModuleDetailComponent
  },
  {
    path: 'module',
    component: RuntimeModuleListComponent
  },
  {
    path: 'call/:id',
    component: RuntimeCallDetailComponent
  },
  {
    path: 'event/:id',
    component: RuntimeEventDetailComponent
  },
  {
    path: 'storage/:id',
    component: RuntimeStorageDetailComponent
  },
  {
    path: 'constant/:id',
    component: RuntimeConstantDetailComponent
  },
  {
    path: 'type',
    component: RuntimeTypeListComponent
  },
  {
    path: '',
    component: RuntimeListComponent
  },
  {
    path: ':id',
    component: RuntimeDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RuntimeRoutingModule {
}
