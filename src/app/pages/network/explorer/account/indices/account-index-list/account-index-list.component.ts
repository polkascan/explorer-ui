import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-index-list',
  templateUrl: './account-index-list.component.html',
  styleUrls: ['./account-index-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountIndexListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
