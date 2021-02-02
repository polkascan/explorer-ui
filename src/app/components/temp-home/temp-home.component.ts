import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';


@Component({
  templateUrl: 'temp-home.component.html',
  styleUrls: ['temp-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TempHomeComponent {

  constructor() {
  }
}
