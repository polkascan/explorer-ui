import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InherentListComponent } from './inherent-list/inherent-list.component';
import { InherentDetailComponent } from './inherent-detail/inherent-detail.component';

const routes: Routes = [
  {
    path: '',
    component: InherentListComponent
  },
  {
    path: ':id',
    component: InherentDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InherentRoutingModule {
}
