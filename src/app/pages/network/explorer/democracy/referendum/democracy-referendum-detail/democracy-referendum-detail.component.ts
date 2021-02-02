import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-democracy-referendum-detail',
  templateUrl: './democracy-referendum-detail.component.html',
  styleUrls: ['./democracy-referendum-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemocracyReferendumDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
