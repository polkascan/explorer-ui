import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-sudo-list',
  templateUrl: './account-sudo-list.component.html',
  styleUrls: ['./account-sudo-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountSudoListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
