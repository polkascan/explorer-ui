import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-bytes',
  template: `
    {{ attribute.value }}
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeBytesComponent {
  @Input() attribute: { type: string, value: string };

  constructor() {
  }
}
