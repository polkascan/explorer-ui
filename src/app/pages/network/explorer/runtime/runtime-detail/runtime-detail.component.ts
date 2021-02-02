import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-detail',
  templateUrl: './runtime-detail.component.html',
  styleUrls: ['./runtime-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
