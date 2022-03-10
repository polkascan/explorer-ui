/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2022 Polkascan Foundation (NL)
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
