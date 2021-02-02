import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-democracy-preimage-list',
  templateUrl: './democracy-preimage-list.component.html',
  styleUrls: ['./democracy-preimage-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemocracyPreimageListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
