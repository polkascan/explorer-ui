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
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IconTheme } from '../identicon/identicon.types';
import { Prefix } from '@polkadot/util-crypto/address/types';
import { types as pst } from '@polkadapt/polkascan-explorer';
import { attributesConfig } from './attributes.config';
import { BehaviorSubject } from 'rxjs';

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
  @Input() runtimeEventAttributes: pst.RuntimeEventAttribute[] | null | undefined;

  isArray = new BehaviorSubject<boolean>(false);

  parsedAttributes: any[] = [];
  attributesConfig = attributesConfig;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attributes'] || changes['runtimeEventAttributes']) {
      let attrs = [];
      const currentValue = this.attributes;

      if (currentValue) {
        if (typeof currentValue === 'string') {
          try {
            const parsed = JSON.parse(currentValue);
            if (Array.isArray(parsed)) {
              attrs = parsed;
              this.isArray.next(true);
            } else if (typeof parsed === 'object' && Object.keys(parsed).length) {
              attrs = [parsed];
            }
          } catch (e) {
            // Do nothing
          }
        } else if (Array.isArray(currentValue)) {
          this.isArray.next(true);
          attrs = currentValue;
        } else if (typeof currentValue === 'object') {
          attrs = [currentValue];
        }

        if (Array.isArray(this.runtimeEventAttributes)) {
          attrs = attrs.map(value => {
            if (value.type) {
              return value;
            }

            if (typeof value === 'object' && !Array.isArray(value)) {
              // This is an Object with (sub)attribute names and values.
              value = Object.entries(value).map(([subName, subValue]) => {
                const eventAttribute = (this.runtimeEventAttributes as pst.RuntimeEventAttribute[]).find((ea) => ea.eventAttributeName === subName);
                if (eventAttribute && eventAttribute.scaleType) {
                  return {
                    name: subName,
                    type: eventAttribute.scaleType,
                    value: subValue
                  };
                } else {
                  return subValue;
                }
              });
            }
            return value;
          });
          if (attrs.length === 1 && Array.isArray(attrs[0])) {
            attrs = attrs[0];
          }
        }
      }
      this.parsedAttributes = attrs;
    }
  }
}
