import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkComponent } from './network.component';
import { NetworkRoutingModule } from './network-routing.module';


@NgModule({
  declarations: [NetworkComponent],
  imports: [
    CommonModule,
    NetworkRoutingModule
  ]
})
export class NetworkModule { }
