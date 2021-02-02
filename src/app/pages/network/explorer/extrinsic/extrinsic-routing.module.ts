import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExtrinsicListComponent } from './extrinsic-list/extrinsic-list.component';
import { ExtrinsicDetailComponent } from './extrinsic-detail/extrinsic-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ExtrinsicListComponent
  },
  {
    path: ':id',
    component: ExtrinsicDetailComponent
  }
];
// { path: 'extrinsic-param/download/:extrinsicId/:hash', component: ExtrinsicParamDownloadComponent}


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtrinsicRoutingModule {
}
