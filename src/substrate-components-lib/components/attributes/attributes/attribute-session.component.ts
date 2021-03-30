import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-session',
  template: `
    <ng-container *ngIf="attribute">
      <a (click)="clicked.next(attribute.value)">
        Session #{{ attribute.value }}
      </a>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeSessionComponent {
  @Input() attribute: any;
  @Output() clicked = new EventEmitter();

  constructor() {
  }
}
