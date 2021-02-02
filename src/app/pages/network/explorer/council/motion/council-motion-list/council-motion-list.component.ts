import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-council-motion-list',
  templateUrl: './council-motion-list.component.html',
  styleUrls: ['./council-motion-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CouncilMotionListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
