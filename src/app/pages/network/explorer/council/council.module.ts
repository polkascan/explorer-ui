import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CouncilRoutingModule } from './council-routing.module';
import { CouncilMotionListComponent } from './motion/council-motion-list/council-motion-list.component';
import { CouncilMotionDetailComponent } from './motion/council-motion-detail/council-motion-detail.component';


@NgModule({
  declarations: [CouncilMotionListComponent, CouncilMotionDetailComponent],
  imports: [
    CommonModule,
    CouncilRoutingModule
  ]
})
export class CouncilModule { }
