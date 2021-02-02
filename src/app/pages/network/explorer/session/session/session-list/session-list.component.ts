import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-session-list',
  templateUrl: './session-list.component.html',
  styleUrls: ['./session-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
