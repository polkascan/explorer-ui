import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountListComponent } from './account-list/account-list.component';
import { AccountDetailComponent } from './account-detail/account-detail.component';
import { AccountValidatorsListComponent } from './validators/account-validators-list/account-validators-list.component';
import { AccountNominatorsListComponent } from './nominators/account-nominators-list/account-nominators-list.component';
import { AccountCouncilListComponent } from './council/account-council-list/account-council-list.component';
import { AccountTechnicalCommitteeListComponent } from './technical-committee/account-technical-committee-list/account-technical-committee-list.component';
import { AccountRegistrarsListComponent } from './registrars/account-registrars-list/account-registrars-list.component';
import { AccountTreasuryListComponent } from './treasury/account-treasury-list/account-treasury-list.component';
import { AccountSudoListComponent } from './sudo/account-sudo-list/account-sudo-list.component';
import { AccountIdentitiesListComponent } from './identities/account-identities-list/account-identities-list.component';
import { AccountIndexListComponent } from './indices/account-index-list/account-index-list.component';
import { AccountIndexDetailComponent } from './indices/account-index-detail/account-index-detail.component';

const routes: Routes = [
  {
    path: 'validators',
    component: AccountValidatorsListComponent
  },
  {
    path: 'nominators',
    component: AccountNominatorsListComponent
  },
  {
    path: 'council',
    component: AccountCouncilListComponent
  },
  {
    path: 'technical-committee',
    component: AccountTechnicalCommitteeListComponent
  },
  {
    path: 'registrars',
    component: AccountRegistrarsListComponent
  },
  {
    path: 'treasury',
    component: AccountTreasuryListComponent
  },
  {
    path: 'sudo',
    component: AccountSudoListComponent
  },
  {
    path: 'identities',
    component: AccountIdentitiesListComponent
  },
  {
    path: 'indices',
    component: AccountIndexListComponent
  },
  {
    path: 'indices/:id',
    component: AccountIndexDetailComponent
  },
  {
    path: '',
    component: AccountListComponent
  },
  {
    path: ':id',
    component: AccountDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule {
}
