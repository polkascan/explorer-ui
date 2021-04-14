import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { InherentRoutingModule } from './inherent-routing.module';
import { InherentListComponent } from './inherent-list/inherent-list.component';
import { InherentDetailComponent } from './inherent-detail/inherent-detail.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PolkadotAngularLibModule } from '../../../../../substrate-components-lib/polkadot-angular-lib.module';


@NgModule({
  declarations: [InherentListComponent, InherentDetailComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InherentRoutingModule,
    PolkadotAngularLibModule
  ]
})
export class InherentModule { }
