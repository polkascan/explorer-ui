import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-democracy-proposal-detail',
  templateUrl: './democracy-proposal-detail.component.html',
  styleUrls: ['./democracy-proposal-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemocracyProposalDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
