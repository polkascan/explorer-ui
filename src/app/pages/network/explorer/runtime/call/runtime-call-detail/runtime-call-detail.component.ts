import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-call-detail',
  templateUrl: './runtime-call-detail.component.html',
  styleUrls: ['./runtime-call-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeCallDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
