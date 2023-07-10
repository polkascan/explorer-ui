/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2023 Polkascan Foundation (NL)
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
import { CommonModule } from '@angular/common';

import { TransferRoutingModule } from './transfer-routing.module';
import { TransferListComponent } from './transfer-list/transfer-list.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PolkascanCommonModule } from '../../../../../common/polkascan-common.module';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';


@NgModule({
  declarations: [
    TransferListComponent
  ],
    imports: [
        CommonModule,
        TransferRoutingModule,
        ReactiveFormsModule,
        PolkascanCommonModule,
        MatTableModule,
        MatSelectModule,
        MatButtonModule,
        MatProgressBarModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatInputModule,
        MatIconModule
    ]
})
export class TransferModule {
}
