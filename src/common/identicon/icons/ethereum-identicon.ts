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

import makeBlockie from 'ethereum-blockies-base64';
import { Props } from '../identicon.types';
import { EmptyIdenticon } from './empty-identicon';

export class EthereumIdenticon {
  constructor({ address, className, style, size }: Props) {
    try {
      const src = makeBlockie(address);
      const img = document.createElement('img');
      img.src = src;
      img.style.display = 'block';

      if (size) {
        img.style.height = `${size}px`;
        img.style.width = `${size}px`;
      }
      if (className) {
        img.setAttribute('class', className);
      }
      if (style) {
        img.setAttribute('style', style);
      }

      return img;
    } catch (e) {
      console.error(e);
      return new EmptyIdenticon({address, className, size, style, publicKey: ''});
    }
  }
}
