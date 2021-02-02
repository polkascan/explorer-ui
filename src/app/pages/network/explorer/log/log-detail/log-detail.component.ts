import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-log-detail',
  templateUrl: './log-detail.component.html',
  styleUrls: ['./log-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
