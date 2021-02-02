import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-nominator-list',
  templateUrl: './session-nominator-list.component.html',
  styleUrls: ['./session-nominator-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionNominatorListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
