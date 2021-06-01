/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2021 Polkascan Foundation (NL)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
