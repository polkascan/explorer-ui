import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IdenticonComponent } from './components/identicon/identicon.component';
import {
  ChildAttributesComponent,
  EventAttributesComponent
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
    EventAttributesComponent,
    ChildAttributesComponent,
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
