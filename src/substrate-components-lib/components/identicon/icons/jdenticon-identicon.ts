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
