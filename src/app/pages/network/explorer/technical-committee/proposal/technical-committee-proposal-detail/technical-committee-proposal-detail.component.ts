import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-technical-committee-proposal-detail',
  templateUrl: './technical-committee-proposal-detail.component.html',
  styleUrls: ['./technical-committee-proposal-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicalCommitteeProposalDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
