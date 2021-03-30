import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-referendum',
  template: `
    <ng-container *ngIf="attribute">
      <a (click)="clicked.next(attribute.value)">
        Referendum #{{ attribute.value }}
      </a>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeReferendumComponent {
  @Input() attribute: any;
  @Output() clicked = new EventEmitter();

  constructor() {
  }
}
