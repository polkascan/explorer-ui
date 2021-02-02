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
