import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-council-list',
  templateUrl: './account-council-list.component.html',
  styleUrls: ['./account-council-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountCouncilListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
