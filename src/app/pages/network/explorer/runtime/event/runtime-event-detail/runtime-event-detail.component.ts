import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-event-detail',
  templateUrl: './runtime-event-detail.component.html',
  styleUrls: ['./runtime-event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeEventDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
