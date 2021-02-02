import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-module-list',
  templateUrl: './runtime-module-list.component.html',
  styleUrls: ['./runtime-module-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeModuleListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
