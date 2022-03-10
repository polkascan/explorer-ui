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
import { BalancesTransferListComponent } from './transfer/balances-transfer-list/balances-transfer-list.component';
import { BalancesTransferDetailComponent } from './transfer/balances-transfer-detail/balances-transfer-detail.component';

const routes: Routes = [
  {
    path: 'transfer',
    component: BalancesTransferListComponent
  },
  {
    path: 'transfer/:id',
    component: BalancesTransferDetailComponent
  },
  {
    path: '',
    redirectTo: 'transfer'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BalancesRoutingModule { }
