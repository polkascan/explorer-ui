import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-account-index-detail',
  templateUrl: './account-index-detail.component.html',
  styleUrls: ['./account-index-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountIndexDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
