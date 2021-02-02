import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-list',
  templateUrl: './runtime-list.component.html',
  styleUrls: ['./runtime-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
