import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-boolean',
  template: `
    <ng-container *ngIf="attribute.value === 0 || attribute.value === false">
      X <small>(false)</small>
    </ng-container>
    <ng-container *ngIf="attribute.value === 1 || attribute.value === true">
      V <small>(true)</small>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeBooleanComponent {
  @Input() attribute: any;

  constructor() {
  }
}
