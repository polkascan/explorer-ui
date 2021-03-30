import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-date',
  template: `
    <ng-container *ngIf="attribute">
      {{ attribute.value | date: 'medium' }}
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeDateComponent {
  @Input() attribute: any;

  constructor() {
  }
}
