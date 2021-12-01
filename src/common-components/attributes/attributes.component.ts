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

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IconTheme } from '../identicon/identicon.types';
import { Prefix } from '@polkadot/util-crypto/address/types';


// TODO string als input werkt niet.

@Component({
  selector: 'attributes',
  templateUrl: 'attributes.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributesComponent implements OnChanges {
  @Input() attributes: any[] | string;
  @Input() iconTheme: IconTheme;
  @Input() iconSize: number;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;
  @Input() ss58Prefix: Prefix;
  @Output() clicked = new EventEmitter();

  parsedAttributes: any[] = [];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attributes']) {
      let attrs = [];
      if (changes['attributes'].currentValue) {
        if (typeof changes['attributes'].currentValue === 'string') {
          try {
            const parsed = JSON.parse(changes['attributes'].currentValue);
            if (Array.isArray(parsed)) {
              attrs = parsed;
            }
          } catch (e) {
            // Do nothing
          }
        } else if (Array.isArray(changes['attributes'].currentValue)) {
          attrs = changes['attributes'].currentValue;
        }
      }

      this.parsedAttributes = attrs;
    }
  }
}
