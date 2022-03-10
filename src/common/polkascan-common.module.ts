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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IdenticonComponent } from './identicon/identicon.component';
import { AttributeAccountIndexComponent } from './attributes/attributes/attribute-account-index.component';
import { AttributeAddressComponent } from './attributes/attributes/attribute-address.component';
import { AttributeBalanceComponent } from './attributes/attributes/attribute-balance.component';
import { AttributeBlockComponent } from './attributes/attributes/attribute-block.component';
import { AttributeBooleanComponent } from './attributes/attributes/attribute-boolean.component';
import { AttributeBytesComponent } from './attributes/attributes/attribute-bytes.component';
import { AttributeDateComponent } from './attributes/attributes/attribute-date.component';
import { AttributeDownloadableComponent } from './attributes/attributes/attribute-downloadable.component';
import { AttributeEthereumAddressComponent } from './attributes/attributes/attribute-ethereum-address.component';
import { AttributeProposalComponent } from './attributes/attributes/attribute-proposal.component';
import { AttributeReferendumComponent } from './attributes/attributes/attribute-referendum.component';
import { AttributeSessionComponent } from './attributes/attributes/attribute-session.component';
import { AttributeStructComponent } from './attributes/attributes/attribute-struct.component';
import { AccountIdCommonComponent } from './account-id/account-id.common.component';
import { BalanceCommonComponent } from './balance/balance.common.component';
import { AttributesComponent } from './attributes/attributes.component';
import { RouterModule } from '@angular/router';
import { TimeAgoCommonComponent } from './time-ago/time-ago.common.component';

@NgModule({
  declarations: [
    IdenticonComponent,
    AccountIdCommonComponent,
    BalanceCommonComponent,
    TimeAgoCommonComponent,
    AttributesComponent,
    AttributeAccountIndexComponent,
    AttributeAddressComponent,
    AttributeBalanceComponent,
    AttributeBlockComponent,
    AttributeBooleanComponent,
    AttributeBytesComponent,
    AttributeDateComponent,
    AttributeDownloadableComponent,
    AttributeEthereumAddressComponent,
    AttributeProposalComponent,
    AttributeReferendumComponent,
    AttributeSessionComponent,
    AttributeStructComponent
  ],
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    IdenticonComponent,
    AccountIdCommonComponent,
    BalanceCommonComponent,
    TimeAgoCommonComponent,
    AttributesComponent,
    AttributeAccountIndexComponent,
    AttributeAddressComponent,
    AttributeBalanceComponent,
    AttributeBlockComponent,
    AttributeBooleanComponent,
    AttributeBytesComponent,
    AttributeDateComponent,
    AttributeDownloadableComponent,
    AttributeEthereumAddressComponent,
    AttributeProposalComponent,
    AttributeReferendumComponent,
    AttributeSessionComponent,
    AttributeStructComponent
  ]
})
export class PolkascanCommonModule {
}
