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
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  Renderer2,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IconTheme, Props } from './identicon.types';
import { PolkadotIdenticon } from './icons/polkadot-identicon';
import { EmptyIdenticon } from './icons/empty-identicon';
import { JdenticonIdenticon } from './icons/jdenticon-identicon';
import { BeachballIdenticon } from './icons/beachball-identicon';
import { EthereumIdenticon } from './icons/ethereum-identicon';
import { isHex, isU8a, u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress, ethereumEncode } from '@polkadot/util-crypto';
import { Prefix } from '@polkadot/util-crypto/address/types';

const identicons = {
  beachball: BeachballIdenticon,
  ethereum: EthereumIdenticon,
  empty: EmptyIdenticon,
  jdenticon: JdenticonIdenticon,
  polkadot: PolkadotIdenticon,
  substrate: JdenticonIdenticon,
};

const fallbackIdenticon = BeachballIdenticon;

const defaultSize = 64;

@Component({
  selector: 'identicon',
  template: ``,
  styleUrls: ['identicon.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IdenticonComponent implements AfterViewInit, OnChanges {
  @Input() value: string;
  @Input() size?: number;
  @Input() theme?: IconTheme;
  @Input() style?: string;
  @Input() isHighlight?: boolean;
  @Input() isAlternative?: boolean;
  @Input() prefix?: Prefix;
  @Input() customIdenticon?: new(properties: Props) => any; // A custom identicon class to be called with new.

  @Output() copied: EventEmitter<string> = new EventEmitter();

  private address: string;
  private publicKey: string;
  private identiconElement: HTMLDivElement | HTMLImageElement | SVGElement | undefined;

  constructor(private host: ElementRef,
              private renderer: Renderer2) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    const changed = Object.values(changes).some((change) =>
      change.firstChange === false
      && change.currentValue !== change.previousValue);

    if (changed) {
      if (changes['value'] && changes['value'].previousValue !== changes['value'].currentValue) {
        this.parseValue(this.value);
      }

      this.generateIdenticon();
    }
  }

  ngAfterViewInit(): void {
    this.parseValue(this.value);
    this.generateIdenticon();

    this.renderer.listen(this.host.nativeElement, 'click', () => {
      if (this.address) {
        this.copyAddress();
        this.copied.next(this.address);
      }
    });
  }

  private parseValue(value: string): void {
    if (value) {
      if (this.theme === 'ethereum') {
        this.address = (isU8a(value) ? ethereumEncode(value) : value) || '';
        this.publicKey = '';
        return;
      }

      try {
        const address = isU8a(value) || isHex(value)
          ? encodeAddress(value, this.prefix)
          : (value || '');
        const publicKey = u8aToHex(decodeAddress(address, false, this.prefix));

        this.address = address;
        this.publicKey = publicKey;
        return;

      } catch (e) {
        console.error(e);
      }
    }

    this.address = '';
    this.publicKey = '0x';
  }

  private generateIdenticon(): void {
    if (this.host) {
      const identicon = !this.address
        ? identicons.empty
        : this.customIdenticon || (this.theme ? identicons[this.theme] : undefined) || fallbackIdenticon;

      const identiconElement = new identicon({
        address: this.address,
        publicKey: this.publicKey,
        className: this.isHighlight ? 'highlight' : '',
        size: this.size || defaultSize,
        style: this.style,
        isAlternative: this.isAlternative,
      });

      if (this.identiconElement) {
        this.renderer.removeChild(this.host.nativeElement, this.identiconElement);
        this.identiconElement = undefined;
      }

      if (identiconElement) {
        this.identiconElement = identiconElement;
        this.renderer.appendChild(this.host.nativeElement, identiconElement);
      }
    }
  }

  private copyAddress(): void {
    const el = document.createElement('textarea');
    el.value = this.address;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}
