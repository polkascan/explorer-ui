import { ChangeDetectionStrategy, Component, Input, Output, ViewEncapsulation, EventEmitter } from '@angular/core';
import { IconTheme } from '../../identicon/identicon.types';

@Component({
  selector: 'attribute-address',
  template: `
    <ng-container *ngIf="attribute">
      <a (click)="clicked.next(attribute.value)">
        <identicon [value]="attribute.value" [theme]="iconTheme" [size]="iconSize"></identicon>
        {{ attribute.value }}
      </a>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeAddressComponent {
  @Input() attribute: { type: string, value: string };
  @Input() iconTheme: IconTheme;
  @Input() iconSize: number;
  @Output() clicked = new EventEmitter();

  constructor() {
  }
}
