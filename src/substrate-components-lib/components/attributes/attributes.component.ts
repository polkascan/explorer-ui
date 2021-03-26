import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';


@Component({
  template: ''
})
class AttributesBaseComponent implements OnChanges {
  @Input() attributes: any[] | string;

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

