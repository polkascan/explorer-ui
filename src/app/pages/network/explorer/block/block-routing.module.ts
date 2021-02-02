import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlockListComponent } from './block-list/block-list.component';
import { BlockDetailComponent } from './block-detail/block-detail.component';

const routes: Routes = [
  {
    path: '',
    component: BlockListComponent
  },
  {
    path: ':id',
    component: BlockDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BlockRoutingModule {
}
