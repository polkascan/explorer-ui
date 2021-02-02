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
