import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-block-detail',
  templateUrl: './block-detail.component.html',
  styleUrls: ['./block-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlockDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
