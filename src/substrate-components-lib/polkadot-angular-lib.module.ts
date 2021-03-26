import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IdenticonComponent } from './components/identicon/identicon.component';
import { EventAttributesComponent, ExtrinsicAttributesComponent } from './components/attributes/attributes.component';

@NgModule({
  declarations: [
    IdenticonComponent,
    EventAttributesComponent,
    ExtrinsicAttributesComponent
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    IdenticonComponent,
    EventAttributesComponent,
    ExtrinsicAttributesComponent
  ]
})
export class PolkadotAngularLibModule { }
