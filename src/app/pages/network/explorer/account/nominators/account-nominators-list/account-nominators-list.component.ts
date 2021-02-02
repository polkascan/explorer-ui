import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-nominators-list',
  templateUrl: './account-nominators-list.component.html',
  styleUrls: ['./account-nominators-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountNominatorsListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
