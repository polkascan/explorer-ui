import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InherentRoutingModule } from './inherent-routing.module';
import { InherentListComponent } from './inherent-list/inherent-list.component';
import { InherentDetailComponent } from './inherent-detail/inherent-detail.component';


@NgModule({
  declarations: [InherentListComponent, InherentDetailComponent],
  imports: [
    CommonModule,
    InherentRoutingModule
  ]
})
export class InherentModule { }
