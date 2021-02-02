import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-democracy-preimage-detail',
  templateUrl: './democracy-preimage-detail.component.html',
  styleUrls: ['./democracy-preimage-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemocracyPreimageDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
