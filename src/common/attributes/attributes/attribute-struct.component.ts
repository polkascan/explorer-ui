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

import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IconTheme } from '../../identicon/identicon.types';

@Component({
  selector: 'attribute-struct',
  template: `
    <ng-container [ngSwitch]="attributeIsObject">
      <ng-container *ngSwitchCase="true">
        <ng-container *ngFor="let item of parsedAttribute | keyvalue">
          <ng-container *ngIf="{ isObject: isObject(item.value), isArray: isArray(item.value), hasType: $any(item.value)?.type } as itemCheck">
            <label>{{ itemCheck.isObject && itemCheck.hasType ? $any(item.value).name : item.key }}</label>

            <ng-container [ngSwitch]="itemCheck.isObject || itemCheck.isArray">
              <ng-container *ngSwitchCase="true">
                <ng-container [ngSwitch]="itemCheck.hasType">
                  <attributes *ngSwitchCase="true" [attributes]="$any(item.value)" [iconSize]="iconSize" [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals" [tokenSymbol]="tokenSymbol"></attributes>
                  <ng-container *ngSwitchDefault>
                    <ng-container [ngSwitch]="itemCheck.isArray">
                      <ng-container *ngSwitchCase="true">
                        <attribute-struct *ngFor="let subItem of $any(item.value)"
                                          [attribute]="subItem" [iconSize]="iconSize" [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals" [tokenSymbol]="tokenSymbol"></attribute-struct>
                      </ng-container>
                      <ng-container *ngSwitchDefault>
                        <attribute-struct [attribute]="item.value" [iconSize]="iconSize" [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals" [tokenSymbol]="tokenSymbol"></attribute-struct>
                      </ng-container>
                    </ng-container>

                  </ng-container>
                </ng-container>
              </ng-container>

              <div *ngSwitchDefault>{{ item.value }}</div>
            </ng-container>

          </ng-container>
        </ng-container>
      </ng-container>

      <div *ngSwitchDefault>
        {{ parsedAttribute }}
      </div>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeStructComponent implements OnChanges {
  @Input() attribute: any;
  @Input() iconTheme: IconTheme;
  @Input() iconSize: number;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;

  parsedAttribute: any;
  attributeIsObject: boolean;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attribute']) {
      let attribute = changes['attribute'].currentValue;

      try {
        // Check if attribute is a JSON string, if so parse it.
        attribute = JSON.parse(attribute);
      } catch (e) {
        // Do nothing.
      }

      this.attributeIsObject = this.isObject(attribute);
      this.parsedAttribute = attribute;
    }
  }


  isObject(attribute: any): boolean {
    return Object.prototype.toString.call(attribute) === '[object Object]';
  }


  isArray(attribute: any): boolean {
    return Array.isArray(attribute);
  }
}
