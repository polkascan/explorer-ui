import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-identities-list',
  templateUrl: './account-identities-list.component.html',
  styleUrls: ['./account-identities-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountIdentitiesListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
