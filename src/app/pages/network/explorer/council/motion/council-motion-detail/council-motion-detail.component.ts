import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-council-motion-detail',
  templateUrl: './council-motion-detail.component.html',
  styleUrls: ['./council-motion-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CouncilMotionDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
