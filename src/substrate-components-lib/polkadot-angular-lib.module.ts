import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IdenticonComponent } from './components/identicon/identicon.component';

@NgModule({
  declarations: [
    IdenticonComponent
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    IdenticonComponent
  ]
})
export class PolkadotAngularLibModule { }
