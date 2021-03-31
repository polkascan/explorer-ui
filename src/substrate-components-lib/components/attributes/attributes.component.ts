import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
  EventEmitter
} from '@angular/core';
import { IconTheme } from '../identicon/identicon.types';


@Component({
  template: ''
})
class AttributesBaseComponent implements OnChanges {
  @Input() attributes: any[] | string;
  @Input() iconTheme: IconTheme;
  @Input() iconSize: number;
  @Input() tokenDecimals: number;
  @Input() tokenSymbol: string;
  @Output() clicked = new EventEmitter();

  parsedAttributes: any[] = [];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.attributes) {
      let attrs = [];
      if (changes.attributes.currentValue) {
        if (typeof changes.attributes.currentValue === 'string') {
          try {
            const parsed = JSON.parse(changes.attributes.currentValue);
            if (Array.isArray(parsed)) {
              attrs = parsed;
            }
          } catch (e) {
            // Do nothing
          }
        } else if (Array.isArray(changes.attributes.currentValue)) {
          attrs = changes.attributes.currentValue;
        }
      }

      this.parsedAttributes = attrs;
    }
  }
}


@Component({
  selector: 'child-attributes',
  templateUrl: 'attributes.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChildAttributesComponent extends AttributesBaseComponent {
  constructor() {
    super();
  }
}


@Component({
  selector: 'event-attributes',
  templateUrl: 'attributes.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventAttributesComponent extends AttributesBaseComponent {
  constructor() {
    super();
  }
}


@Component({
  selector: 'extrinsic-attributes',
  templateUrl: 'attributes.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicAttributesComponent extends AttributesBaseComponent {

  constructor() {
    super();
  }
}

