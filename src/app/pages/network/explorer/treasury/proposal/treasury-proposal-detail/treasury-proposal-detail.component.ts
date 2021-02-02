import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-treasury-proposal-detail',
  templateUrl: './treasury-proposal-detail.component.html',
  styleUrls: ['./treasury-proposal-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreasuryProposalDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
