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
import { BN } from '@polkadot/util';

@Component({
  selector: 'balance',
  template: `
    <span *ngIf="integralPart && integralPart.length"
          [title]="decimalPart.length ? integralPart + '.' + decimalPart : integralPart">
      <span>{{ integralPart }}</span>
      <span *ngIf="decimalPartCapped && decimalPartCapped.length">.<span class="balance-decimal-numbers">
            <span>{{decimalPartCapped}}</span><span *ngIf="decimalPart.length > decimalPartCapped.length">&mldr;</span>
      </span>
      </span>
      {{ tokenSymbol }}
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
  @Input() value: number | string | BN;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;
  @Input() maxDecimals: number;

  private decimals: number;

  integralPart: string;
  decimalPart: string;
  decimalPartCapped: string;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tokenDecimals']) {
      this.decimals = Math.max(0, this.tokenDecimals) || 0;
    }

    if (changes['tokenDecimals'] || changes['value']) {
      let val: BN | undefined;
      if (BN.isBN(this.value)) {
        val = this.value;
      } else {
        try {
          val = new BN(this.value as number);
        } catch (e) {
          this.integralPart = '';
          this.decimalPart = '';
          this.decimalPartCapped = '';
          return;
        }
      }

      if (val) {
        if (val.isZero()) {
          this.integralPart = '0';
          this.decimalPart = '';
          this.decimalPartCapped = '';
        } else {
          const stringified = val.toString(undefined, this.decimals + 1); // String gets added preceding zeros.

          const l = stringified.length;
          // Split the string in two parts where the decimal point is expected.
          this.integralPart = stringified.substring(0, l - this.decimals).replace(/^0+\B/, ''); // remove preceding zeros, but allow a value of '0'.
          this.decimalPart = stringified.substring(l - this.decimals).replace(/0+$/, ''); // remove leading zeros

          // Make a short readable decimal value.
          // /(^0{1}[1-9]{1}\d{1})|(^0{2}[1-9]{1})|(^0+[1-9]{1})|(^\d{1,3})/  earlier used regex.
          const cappedResult = this.decimalPart.match(new RegExp(`\\d{0,${this.maxDecimals === undefined ? 5 : this.maxDecimals}}`));
          this.decimalPartCapped = cappedResult && cappedResult[0] ? cappedResult[0] : '';
        }
      }
    }
  }
}
