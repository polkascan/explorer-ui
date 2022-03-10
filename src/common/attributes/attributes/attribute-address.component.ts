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

import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IconTheme } from '../../identicon/identicon.types';
import { Prefix } from '@polkadot/util-crypto/address/types';
import { encodeAddress } from '@polkadot/util-crypto';
import { HexString } from '@polkadot/util/types';
import { isHex, isU8a } from '@polkadot/util';
import { ActivatedRoute } from '@angular/router';
import { TooltipsService } from '../../../app/services/tooltips.service';

@Component({
  selector: 'attribute-address',
  template: `
    <ng-container *ngIf="encoded">
      <account-id [address]="encoded" [iconTheme]="iconTheme" [iconSize]="iconSize"
                  [ss58Prefix]="ss58Prefix"></account-id>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeAddressComponent implements OnChanges {
  @Input() attribute: { type: string, value: HexString | Uint8Array | string };
  @Input() iconTheme: IconTheme;
  @Input() iconSize: number;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;
  @Input() ss58Prefix: Prefix;

  encoded: string;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attribute']) {
      const value = changes['attribute'].currentValue && changes['attribute'].currentValue.value;
      let address = '';

      if (value) {
        address = isU8a(value) || isHex(value)
          ? encodeAddress(value, this.ss58Prefix)
          : (value || '');
      }

      this.encoded = address;
    }
  }
}
