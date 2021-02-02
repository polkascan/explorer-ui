import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExtrinsicRoutingModule } from './extrinsic-routing.module';
import { ExtrinsicListComponent } from './extrinsic-list/extrinsic-list.component';
import { ExtrinsicDetailComponent } from './extrinsic-detail/extrinsic-detail.component';


@NgModule({
  declarations: [ExtrinsicListComponent, ExtrinsicDetailComponent],
  imports: [
    CommonModule,
    ExtrinsicRoutingModule
  ]
})
export class ExtrinsicModule { }
