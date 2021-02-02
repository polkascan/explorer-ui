import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-registrars-list',
  templateUrl: './account-registrars-list.component.html',
  styleUrls: ['./account-registrars-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountRegistrarsListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
