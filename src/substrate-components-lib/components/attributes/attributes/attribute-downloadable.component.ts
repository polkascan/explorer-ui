import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-downloadable',
  template: `
    <ng-container *ngIf="attribute">
      <a (click)="clicked.next(attribute.value)">Download binary</a>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeDownloadableComponent {
  @Input() attribute: any;
  @Output() clicked = new EventEmitter();

  constructor() {
  }
}
