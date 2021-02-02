import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-extrinsic-detail',
  templateUrl: './extrinsic-detail.component.html',
  styleUrls: ['./extrinsic-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtrinsicDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
