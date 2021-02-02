import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-module-detail',
  templateUrl: './runtime-module-detail.component.html',
  styleUrls: ['./runtime-module-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeModuleDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
