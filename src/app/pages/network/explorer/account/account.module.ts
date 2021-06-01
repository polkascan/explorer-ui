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
import { CommonModule } from '@angular/common';

import { AccountRoutingModule } from './account-routing.module';
import { AccountListComponent } from './account-list/account-list.component';
import { AccountValidatorsListComponent } from './validators/account-validators-list/account-validators-list.component';
import { AccountNominatorsListComponent } from './nominators/account-nominators-list/account-nominators-list.component';
import { AccountCouncilListComponent } from './council/account-council-list/account-council-list.component';
import { AccountTechnicalCommitteeListComponent } from './technical-committee/account-technical-committee-list/account-technical-committee-list.component';
import { AccountRegistrarsListComponent } from './registrars/account-registrars-list/account-registrars-list.component';
import { AccountTreasuryListComponent } from './treasury/account-treasury-list/account-treasury-list.component';
import { AccountSudoListComponent } from './sudo/account-sudo-list/account-sudo-list.component';
import { AccountIdentitiesListComponent } from './identities/account-identities-list/account-identities-list.component';
import { AccountDetailComponent } from './account-detail/account-detail.component';
import { AccountIndexDetailComponent } from './indices/account-index-detail/account-index-detail.component';
import { AccountIndexListComponent } from './indices/account-index-list/account-index-list.component';


@NgModule({
  declarations: [AccountListComponent, AccountValidatorsListComponent, AccountNominatorsListComponent, AccountCouncilListComponent,
    AccountTechnicalCommitteeListComponent, AccountRegistrarsListComponent, AccountTreasuryListComponent, AccountSudoListComponent,
    AccountIdentitiesListComponent, AccountDetailComponent, AccountIndexDetailComponent, AccountIndexListComponent],
  imports: [
    CommonModule,
    AccountRoutingModule
  ]
})
export class AccountModule {
}
