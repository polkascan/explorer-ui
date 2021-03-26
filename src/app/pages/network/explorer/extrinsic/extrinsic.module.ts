import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExtrinsicRoutingModule } from './extrinsic-routing.module';
import { ExtrinsicListComponent } from './extrinsic-list/extrinsic-list.component';
import { ExtrinsicDetailComponent } from './extrinsic-detail/extrinsic-detail.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PolkadotAngularLibModule } from '../../../../../substrate-components-lib/polkadot-angular-lib.module';


@NgModule({
  declarations: [ExtrinsicListComponent, ExtrinsicDetailComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ExtrinsicRoutingModule,
    PolkadotAngularLibModule
  ]
})
export class ExtrinsicModule { }
