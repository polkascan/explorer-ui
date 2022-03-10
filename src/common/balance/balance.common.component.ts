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

@Component({
  selector: 'balance',
  template: `
    <ng-container *ngIf="convertedValue !== null">
      {{ convertedValue }} {{ tokenSymbol }}
    </ng-container>
  `,
  styles: [`
    balance {
      white-space: nowrap;
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalanceCommonComponent implements OnChanges {
  @Input() value: number;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;

  convertedValue: number | null = null;
  private decimals: number;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tokenDecimals']) {
      this.decimals = Math.max(0, this.tokenDecimals) || 0;
    }

    if (changes['tokenDecimals'] || changes['value']) {
      let converted: number | null;

      try {
        converted = Math.max(0, this.value) / Math.pow(10, this.decimals);
        if (isNaN(converted)) {
          converted = null;
        }
      } catch (e) {
        converted = null;
      }


      this.convertedValue = converted;
    }
  }
}
