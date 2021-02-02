import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CouncilMotionListComponent } from './motion/council-motion-list/council-motion-list.component';
import { CouncilMotionDetailComponent } from './motion/council-motion-detail/council-motion-detail.component';

const routes: Routes = [
  {
    path: 'motion',
    component: CouncilMotionListComponent
  },
  {
    path: 'motion/:id',
    component: CouncilMotionDetailComponent
  },
  {
    path: '',
    redirectTo: 'motion'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CouncilRoutingModule { }
