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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IdenticonComponent } from './components/identicon/identicon.component';
import {
  ChildAttributesComponent,
  EventAttributesComponent,
  ExtrinsicAttributesComponent
} from './components/attributes/attributes.component';
import { AttributeAccountIndexComponent } from './components/attributes/attributes/attribute-account-index.component';
import { AttributeAddressComponent } from './components/attributes/attributes/attribute-address.component';
import { AttributeBalanceComponent } from './components/attributes/attributes/attribute-balance.component';
import { AttributeBlockComponent } from './components/attributes/attributes/attribute-block.component';
import { AttributeBooleanComponent } from './components/attributes/attributes/attribute-boolean.component';
import { AttributeBytesComponent } from './components/attributes/attributes/attribute-bytes.component';
import { AttributeDateComponent } from './components/attributes/attributes/attribute-date.component';
import { AttributeDownloadableComponent } from './components/attributes/attributes/attribute-downloadable.component';
import { AttributeEthereumAddressComponent } from './components/attributes/attributes/attribute-ethereum-address.component';
import { AttributeProposalComponent } from './components/attributes/attributes/attribute-proposal.component';
import { AttributeReferendumComponent } from './components/attributes/attributes/attribute-referendum.component';
import { AttributeSessionComponent } from './components/attributes/attributes/attribute-session.component';
import { AttributeStructComponent } from './components/attributes/attributes/attribute-struct.component';

@NgModule({
  declarations: [
    IdenticonComponent,
    ChildAttributesComponent,
    EventAttributesComponent,
    ExtrinsicAttributesComponent,
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
  ],
  exports: [
    IdenticonComponent,
    EventAttributesComponent,
    ExtrinsicAttributesComponent,
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
export class PolkadotAngularLibModule {
}
