import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnalyticsSearchComponent } from './search/analytics-search/analytics-search.component';
import { AnalyticsChartDetailComponent } from './charts/analytics-chart-detail/analytics-chart-detail.component';
import { AnalyticsChartsComponent } from './charts/analytics-charts/analytics-charts.component';

const routes: Routes = [
  {
    path: 'search',
    component: AnalyticsSearchComponent
  },
  {
    path: 'search/:query',
    component: AnalyticsSearchComponent
  },
  {
    path: 'charts',
    component: AnalyticsSearchComponent
  },
  {
    path: 'charts/:id',
    component: AnalyticsChartsComponent
  },
  {
    path: 'chart/:id',
    component: AnalyticsChartDetailComponent
  },
  {
    path: '',
    redirectTo: 'search'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AnalyticsRoutingModule {
}
