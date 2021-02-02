import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HarvesterRoutingModule } from './harvester-routing.module';
import { HarvesterAdminComponent } from './admin/harvester-admin/harvester-admin.component';


@NgModule({
  declarations: [HarvesterAdminComponent],
  imports: [
    CommonModule,
    HarvesterRoutingModule
  ]
})
export class HarvesterModule { }
