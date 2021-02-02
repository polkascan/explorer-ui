import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-technical-committee-proposal-list',
  templateUrl: './technical-committee-proposal-list.component.html',
  styleUrls: ['./technical-committee-proposal-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TechnicalCommitteeProposalListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
