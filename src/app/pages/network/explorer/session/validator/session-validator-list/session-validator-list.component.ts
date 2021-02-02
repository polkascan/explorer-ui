import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-validator-list',
  templateUrl: './session-validator-list.component.html',
  styleUrls: ['./session-validator-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionValidatorListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
