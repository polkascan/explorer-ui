import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-validator-detail',
  templateUrl: './session-validator-detail.component.html',
  styleUrls: ['./session-validator-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionValidatorDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
