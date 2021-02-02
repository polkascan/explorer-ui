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
