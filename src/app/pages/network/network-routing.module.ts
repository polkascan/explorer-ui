import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NetworkComponent } from './network.component';

const routes: Routes = [
  {path: '', pathMatch: 'full', redirectTo: 'explorer'},
  {
    path: '',
    component: NetworkComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'explorer',
        loadChildren: () => import('./explorer/explorer.module').then(m => m.ExplorerModule)
      },
      {
        path: 'harvester',
        loadChildren: () => import('./harvester/harvester.module').then(m => m.HarvesterModule)
      },
      {
        path: 'analytics',
        loadChildren: () => import('./analytics/analytics.module').then(m => m.AnalyticsModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NetworkRoutingModule {
}
