import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-treasury-proposal-list',
  templateUrl: './treasury-proposal-list.component.html',
  styleUrls: ['./treasury-proposal-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreasuryProposalListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
