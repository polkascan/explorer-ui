import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-session-detail',
  templateUrl: './session-detail.component.html',
  styleUrls: ['./session-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
