import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-runtime-constant-detail',
  templateUrl: './runtime-constant-detail.component.html',
  styleUrls: ['./runtime-constant-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RuntimeConstantDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
