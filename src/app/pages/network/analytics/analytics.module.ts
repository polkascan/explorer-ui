import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AnalyticsRoutingModule } from './analytics-routing.module';
import { AnalyticsSearchComponent } from './search/analytics-search/analytics-search.component';
import { AnalyticsChartsComponent } from './charts/analytics-charts/analytics-charts.component';
import { AnalyticsChartDetailComponent } from './charts/analytics-chart-detail/analytics-chart-detail.component';


@NgModule({
  declarations: [AnalyticsSearchComponent, AnalyticsChartsComponent, AnalyticsChartDetailComponent],
  imports: [
    CommonModule,
    AnalyticsRoutingModule
  ]
})
export class AnalyticsModule { }
