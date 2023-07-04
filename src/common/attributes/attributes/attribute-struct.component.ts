/*
 * Polkascan Explorer UI
 * Copyright (C) 2018-2023 Polkascan Foundation (NL)
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
      <ng-container *ngIf="attributeIsArray">
          <ng-container *ngFor="let item of $any(parsedAttribute); let i = index">
              <div class="attribute">
                  <div class="attributes-index">
                      {{i}}
                  </div>
                  <attribute-struct [attribute]="item"
                                    [iconSize]="iconSize"
                                    [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals"
                                    [tokenSymbol]="tokenSymbol"></attribute-struct>
              </div>
          </ng-container>
      </ng-container>
      <ng-container *ngIf="attributeIsObject">
          <div *ngFor="let item of parsedAttribute | keyvalue; let i = index;">
              <ng-container
                      *ngIf="{ isObject: isObject(item.value), isArray: isArray(item.value), hasType: $any(item.value)?.type, count: getCount($any(item.value)) } as itemCheck">
                  <label>
                      <span class="attribute-struct-label-text">{{ itemCheck.hasType ? $any(item.value).name : item.key }}</span>
                      <span *ngIf="itemCheck.count !== null"
                            class="attribute-struct-array-count">({{itemCheck.count}} items)</span>
                      <ng-container *ngIf="itemCheck.isArray && $any(item.value).length || itemCheck.isObject">
                          <button mat-icon-button (click)="toggleVisibility(i)">
                              <mat-icon class="mat-icon-rtl-mirror">
                                  {{shown[i] ? 'expand_more' : 'chevron_right'}}
                              </mat-icon>
                          </button>
                      </ng-container>
                  </label>

                  <ng-container [ngSwitch]="itemCheck.isObject || itemCheck.isArray">
                      <ng-container *ngSwitchCase="true">
                          <!-- An Object or and Array -->
                          <ng-container *ngIf="shown[i]">

                              <ng-container [ngSwitch]="itemCheck.isObject || itemCheck.isArray">
                                  <ng-container *ngSwitchCase="true">
                                      <attributes *ngIf="$any(item.value).length !== 0"
                                                  [attributes]="$any(item.value)"
                                                  [iconSize]="iconSize"
                                                  [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals"
                                                  [tokenSymbol]="tokenSymbol"></attributes>
                                  </ng-container>

                                  <ng-container *ngSwitchDefault>
                                      <attribute-struct [attribute]="item.value" [iconSize]="iconSize"
                                                        [iconTheme]="iconTheme"
                                                        [tokenDecimals]="tokenDecimals"
                                                        [tokenSymbol]="tokenSymbol"></attribute-struct>

                                  </ng-container>
                              </ng-container>
                          </ng-container>
                      </ng-container>

                      <div *ngSwitchDefault>
                          <!-- IS A VALUE -->
                          <span class="attribute-struct-value-null" *ngIf="item.value === null">null</span>
                          {{item.value}}
                      </div>
                  </ng-container>
              </ng-container>
          </div>
      </ng-container>

      <div *ngIf="!attributeIsObject && !attributeIsArray">
          <span class="attribute-struct-value-null" *ngIf="parsedAttribute === null">null</span>
          {{parsedAttribute}}
      </div>
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

  shown: {[i: number]: boolean} = {};

  parsedAttribute: any;
  attributeIsObject: boolean;
  attributeIsArray: boolean;

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
      this.attributeIsArray = this.isArray(attribute);
      this.parsedAttribute = attribute;
    }
  }


  isObject(attribute: any): boolean {
    return Object.prototype.toString.call(attribute) === '[object Object]';
  }


  isArray(attribute: any): boolean {
    return Array.isArray(attribute);
  }

  getCount(attribute: any): number | null {
    if (this.isArray(attribute)) {
      return attribute.length;
    } else if (this.isObject(attribute)) {
      return Object.keys(attribute).length;
    }
    return null;
  }

  toggleVisibility(i: number): void {
    this.shown[i] = !this.shown[i];
  }
}
