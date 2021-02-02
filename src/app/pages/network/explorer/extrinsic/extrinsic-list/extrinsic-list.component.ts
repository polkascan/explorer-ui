import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-extrinsic-list',
  templateUrl: './extrinsic-list.component.html',
  styleUrls: ['./extrinsic-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
