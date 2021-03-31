import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-ethereum-address',
  template: `
    <ng-container *ngIf="attribute">
      <a (click)="clicked.next(attribute.value)">
        <identicon [value]="attribute.value" [theme]="'ethereum'" [size]="iconSize"></identicon>
        {{ attribute.value }}
      </a>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeEthereumAddressComponent {
  @Input() attribute: { type: string, value: string };
  @Input() iconSize: number;
  @Output() clicked = new EventEmitter();

  constructor() {
  }
}
