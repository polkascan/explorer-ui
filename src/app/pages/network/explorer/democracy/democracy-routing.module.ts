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
import { DemocracyProposalListComponent } from './proposal/democracy-proposal-list/democracy-proposal-list.component';
import { DemocracyProposalDetailComponent } from './proposal/democracy-proposal-detail/democracy-proposal-detail.component';
import { DemocracyPreimageListComponent } from './preimage/democracy-preimage-list/democracy-preimage-list.component';
import { DemocracyPreimageDetailComponent } from './preimage/democracy-preimage-detail/democracy-preimage-detail.component';
import { DemocracyReferendumListComponent } from './referendum/democracy-referendum-list/democracy-referendum-list.component';
import { DemocracyReferendumDetailComponent } from './referendum/democracy-referendum-detail/democracy-referendum-detail.component';

const routes: Routes = [
  {
    path: 'proposal',
    component: DemocracyProposalListComponent
  },
  {
    path: 'proposal/id',
    component: DemocracyProposalDetailComponent
  },
  {
    path: 'preimage',
    component: DemocracyPreimageListComponent
  },
  {
    path: 'preimage/:id',
    component: DemocracyPreimageDetailComponent
  },
  {
    path: 'referendum',
    component: DemocracyReferendumListComponent
  },
  {
    path: 'referendum/:id',
    component: DemocracyReferendumDetailComponent
  },
  {
    path: '',
    redirectTo: 'proposal'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DemocracyRoutingModule { }
