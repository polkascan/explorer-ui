import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LogListComponent } from './log-list/log-list.component';
import { LogDetailComponent } from './log-detail/log-detail.component';

const routes: Routes = [
    {
    path: '',
    component: LogListComponent
  },
  {
    path: ':id',
    component: LogDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LogRoutingModule { }
