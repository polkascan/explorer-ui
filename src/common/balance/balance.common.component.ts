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
import { BN } from '@polkadot/util';

@Component({
  selector: 'balance',
  template: `
    <span *ngIf="partOne.length" [title]="partTwo.length ? partOne + '.' + partTwo : partOne">
      {{ partOne }}<ng-container *ngIf="partTwoCapped.length">.<span class="balance-decimal-numbers">{{partTwoCapped}}</span></ng-container> {{ tokenSymbol }}
    </span>
  `,
  styles: [`
    balance {
      white-space: nowrap;

      .balance-decimal-numbers {
        font-size: 70%;
        opacity: 0.7;
      }
    }
  `],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BalanceCommonComponent implements OnChanges {
  @Input() value: number | BN;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;

  private decimals: number;

  partOne: string;
  partTwo: string;
  partTwoCapped: string;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tokenDecimals']) {
      this.decimals = Math.max(0, this.tokenDecimals) || 0;
    }

    if (changes['tokenDecimals'] || changes['value']) {
      let val = this.value;

      if (BN.isBN(this.value) === false) {
        val = new BN(this.value as number);
      }

      const stringified = val.toString();
      const l = stringified.length;
      const partOne = stringified.substring(0, l - this.decimals);
      let partTwo = stringified.substring(l - this.decimals);
      while (partTwo.endsWith('0') === true) {
        // Remove trailing zeros.
        partTwo = partTwo.substring(0, partTwo.length - 1);
      }

      this.partOne = partOne.length ? partOne : '';
      this.partTwo = partTwo.length ? partTwo : '';
      this.partTwoCapped = partTwo.length ? partTwo.substring(0, 3) : '';
    }
  }
}
