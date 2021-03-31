import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output, SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { IconTheme } from '../../identicon/identicon.types';

@Component({
  selector: 'attribute-struct',
  template: `
    <ng-container [ngSwitch]="attributeIsObject">
      <ng-container *ngSwitchCase="true">
        <ng-container *ngFor="let item of parsedAttribute | keyvalue">
          <ng-container *ngIf="{ isObject: isObject(item.value), hasType: $any(item.value)?.type } as itemCheck">
            <label>{{ itemCheck.isObject && itemCheck.hasType ? $any(item.value).name : item.key }}</label>

            <ng-container [ngSwitch]="itemCheck.isObject">
              <ng-container *ngSwitchCase="true">
                <ng-container [ngSwitch]="itemCheck.hasType">
                  <child-attributes *ngSwitchCase="true" [attributes]="$any(item.value)" [iconSize]="iconSize" [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals" [tokenSymbol]="tokenSymbol" (clicked)="clicked.next($event)"></child-attributes>
                  <attribute-struct *ngSwitchDefault [attribute]="item.value" [iconSize]="iconSize" [iconTheme]="iconTheme" [tokenDecimals]="tokenDecimals" [tokenSymbol]="tokenSymbol" (clicked)="clicked.next($event)"></attribute-struct>
                </ng-container>
              </ng-container>

              <div *ngSwitchDefault>{{ item.value }}</div>
            </ng-container>

          </ng-container>
        </ng-container>
      </ng-container>

      <ng-container *ngSwitchDefault>
        {{ parsedAttribute }}
      </ng-container>
    </ng-container>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeStructComponent implements OnChanges {
  @Input() attribute: any;
  @Input() iconTheme: IconTheme;
  @Input() iconSize: number;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;
  @Output() clicked = new EventEmitter();

  parsedAttribute: any;
  attributeIsObject: boolean;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.attribute) {
      let attribute = changes.attribute.currentValue;

      try {
        // Check if attribute is a JSON string, if so parse it.
        attribute = JSON.parse(attribute);
      } catch (e) {
        // Do nothing.
      }

      this.attributeIsObject = this.isObject(attribute);
      this.parsedAttribute = attribute;
    }
  }


  isObject(attribute: any): boolean {
    return Object.prototype.toString.call(attribute) === '[object Object]';
  }
}
