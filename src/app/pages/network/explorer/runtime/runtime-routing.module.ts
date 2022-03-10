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
import { RuntimeListComponent } from './runtime-list/runtime-list.component';
import { RuntimeDetailComponent } from './runtime-detail/runtime-detail.component';
import { RuntimePalletDetailComponent } from './pallet/runtime-pallet-detail/runtime-pallet-detail.component';
import { RuntimeCallDetailComponent } from './call/runtime-call-detail/runtime-call-detail.component';
import { RuntimeEventDetailComponent } from './event/runtime-event-detail/runtime-event-detail.component';
import { RuntimeStorageDetailComponent } from './storage/runtime-storage-detail/runtime-storage-detail.component';
import { RuntimeConstantDetailComponent } from './constant/runtime-constant-detail/runtime-constant-detail.component';

const routes: Routes = [
  {
    path: '',
    component: RuntimeListComponent
  },
  {
    path: ':runtime',
    component: RuntimeDetailComponent
  },
  {
    path: ':runtime/pallet/:pallet',
    component: RuntimePalletDetailComponent
  },
  {
    path: ':runtime/pallet/:pallet/call/:callName',
    component: RuntimeCallDetailComponent
  },
  {
    path: ':runtime/pallet/:pallet/event/:eventName',
    component: RuntimeEventDetailComponent
  },
  {
    path: ':runtime/pallet/:pallet/storage/:storageName',
    component: RuntimeStorageDetailComponent
  },
  {
    path: ':runtime/pallet/:pallet/constant/:constantName',
    component: RuntimeConstantDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RuntimeRoutingModule {
}
