import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-treasury-list',
  templateUrl: './account-treasury-list.component.html',
  styleUrls: ['./account-treasury-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountTreasuryListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
