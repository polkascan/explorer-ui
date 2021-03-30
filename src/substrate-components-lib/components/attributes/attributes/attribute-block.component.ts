import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-block',
  template: `
    <ng-container *ngIf="attribute">
      <a (click)="clicked.next(attribute.value)">
        Block #{{ attribute.value }}}}
      </a>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeBlockComponent {
  @Input() attribute: any;
  @Output() clicked = new EventEmitter();

  constructor() {
  }
}
