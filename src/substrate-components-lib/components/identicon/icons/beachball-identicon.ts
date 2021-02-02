import { beachballIcon } from '@polkadot/ui-shared';
import { Props } from '../identicon.types';
import { EmptyIdenticon } from './empty-identicon';

export class BeachballIdenticon {
  constructor({address, className, size, style}: Props) {
    const div = document.createElement('div');
    if (className) {
      div.setAttribute('class', className);
    }
    if (style) {
      div.setAttribute('style', style);
    }

    try {
      const icon = beachballIcon(address, {isAlternative: false, size});
      div.appendChild(icon);

      return div;
    } catch (e) {
      console.error(e);
      return new EmptyIdenticon({address, className, size, style, publicKey: ''});
    }
  }
}
