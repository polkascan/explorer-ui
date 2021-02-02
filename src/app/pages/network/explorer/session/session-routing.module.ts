import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SessionListComponent } from './session/session-list/session-list.component';
import { SessionDetailComponent } from './session/session-detail/session-detail.component';

const routes: Routes = [
  {
    path: 'session',
    component: SessionListComponent
  },
  {
    path: 'session/:id',
    component: SessionDetailComponent
  },
  {
    path: 'validator',
    component: SessionListComponent
  },
  {
    path: 'validator/:id',
    component: SessionDetailComponent
  },
  {
    path: 'nominator',
    component: SessionListComponent
  },
  {
    path: '',
    redirectTo: 'session'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SessionRoutingModule {
}
