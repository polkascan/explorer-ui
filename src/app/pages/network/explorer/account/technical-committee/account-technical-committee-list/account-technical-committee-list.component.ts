import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-committee-list',
  templateUrl: './account-technical-committee-list.component.html',
  styleUrls: ['./account-technical-committee-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountTechnicalCommitteeListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
