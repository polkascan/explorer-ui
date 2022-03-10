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

import { Props } from '../identicon.types';

export class EmptyIdenticon {
  constructor({className, size, style}: Props) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
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

    return svg;
  }
}
