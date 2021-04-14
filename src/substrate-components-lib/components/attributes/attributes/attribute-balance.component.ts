import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'attribute-balance',
  template: `
    <ng-container *ngIf="attribute">
      {{ tokenSymbol }} {{ convertedValue | number: '1.0-15' }}
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeBalanceComponent implements OnChanges {
  @Input() attribute: { type: string, value: number };
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;

  convertedValue: number | null;
  private decimals: number;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.tokenDecimals) {
      this.decimals = Math.max(0, this.tokenDecimals) || 0;
    }

    if (changes.tokenDecimals || changes.attribute || changes.decimals) {
      let converted: number | null;

      try {
        converted = Math.max(0, this.attribute.value) / Math.pow(10, this.decimals);
      } catch (e) {
        converted = null;
      }

      this.convertedValue = converted;
    }
  }
}
