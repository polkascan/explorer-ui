import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RuntimeRoutingModule } from './runtime-routing.module';
import { RuntimeListComponent } from './runtime-list/runtime-list.component';
import { RuntimeDetailComponent } from './runtime-detail/runtime-detail.component';
import { RuntimeModuleListComponent } from './module/runtime-module-list/runtime-module-list.component';
import { RuntimeModuleDetailComponent } from './module/runtime-module-detail/runtime-module-detail.component';
import { RuntimeCallDetailComponent } from './call/runtime-call-detail/runtime-call-detail.component';
import { RuntimeEventDetailComponent } from './event/runtime-event-detail/runtime-event-detail.component';
import { RuntimeStorageDetailComponent } from './storage/runtime-storage-detail/runtime-storage-detail.component';
import { RuntimeConstantDetailComponent } from './constant/runtime-constant-detail/runtime-constant-detail.component';
import { RuntimeTypeListComponent } from './type/runtime-type-list/runtime-type-list.component';


@NgModule({
  declarations: [RuntimeListComponent, RuntimeDetailComponent, RuntimeModuleListComponent, RuntimeModuleDetailComponent,
    RuntimeCallDetailComponent, RuntimeEventDetailComponent, RuntimeStorageDetailComponent, RuntimeConstantDetailComponent,
    RuntimeTypeListComponent],
  imports: [
    CommonModule,
    RuntimeRoutingModule
  ]
})
export class RuntimeModule {
}
