import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-type-list',
  templateUrl: './runtime-type-list.component.html',
  styleUrls: ['./runtime-type-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeTypeListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
