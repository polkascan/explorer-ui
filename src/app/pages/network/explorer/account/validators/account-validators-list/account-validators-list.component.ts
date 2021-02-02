import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-validators-list',
  templateUrl: './account-validators-list.component.html',
  styleUrls: ['./account-validators-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountValidatorsListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
