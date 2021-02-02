import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HarvesterAdminComponent } from './admin/harvester-admin/harvester-admin.component';

const routes: Routes = [
  {
    path: 'admin',
    component: HarvesterAdminComponent
  },
  {
    path: '',
    redirectTo: 'admin'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HarvesterRoutingModule {
}
