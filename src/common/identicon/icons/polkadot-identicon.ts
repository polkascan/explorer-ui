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

import { polkadotIcon } from '@polkadot/ui-shared';
import { Circle } from '@polkadot/ui-shared/icons/types';
import { Props } from '../identicon.types';
import { EmptyIdenticon } from './empty-identicon';

export class PolkadotIdenticon {
  constructor({address, className, isAlternative = false, size, style}: Props) {
    if (!address) {
      return new EmptyIdenticon({address, className, size, style, publicKey: ''});
    }

    try {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttributeNS('', 'id', address);
      svg.setAttributeNS('', 'name', address);
      svg.setAttributeNS('', 'viewBox', '0 0 64 64');
      if (size) {
        svg.setAttributeNS('', 'height', `${size}`);
        svg.setAttributeNS('', 'width', `${size}`);
      }
      if (className) {
        svg.setAttributeNS('', 'class', className);
      }
      if (style) {
        svg.setAttributeNS('', 'style', style);
      }

      polkadotIcon(address, {isAlternative}).forEach(({cx, cy, fill, r}: Circle, key: number) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttributeNS('', 'cx', `${cx}`);
        circle.setAttributeNS('', 'cy', `${cy}`);
        circle.setAttributeNS('', 'fill', `${fill}`);
        circle.setAttributeNS('', 'r', `${r}`);
        circle.setAttributeNS('', 'key', `${key}`);
        svg.appendChild(circle);
      });

      return svg;
    } catch (e) {
      console.error(e);
      return new EmptyIdenticon({address, className, size, style, publicKey: ''});
    }
  }
}
