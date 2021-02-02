import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-democracy-proposal-list',
  templateUrl: './democracy-proposal-list.component.html',
  styleUrls: ['./democracy-proposal-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemocracyProposalListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
