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

import * as jdenticon from 'jdenticon';
import { Props } from '../identicon.types';
import { EmptyIdenticon } from './empty-identicon';

export class JdenticonIdenticon {
  constructor({className, publicKey, size, style}: Props) {
    const div = document.createElement('div');
    if (className) {
      div.setAttribute('class', className);
    }
    if (style) {
      div.setAttribute('style', style);
    }

    try {
      const icon = new DOMParser().parseFromString(
        jdenticon.toSvg(publicKey.substr(2), size), 'image/svg+xml'
      ).firstChild;

      if (icon) {
        div.appendChild(icon);
        return div;
      }
    } catch (e) {
      console.error(e);
      return new EmptyIdenticon({className, size, style, publicKey, address: ''});
    }
  }
}
