import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-democracy-referendum-list',
  templateUrl: './democracy-referendum-list.component.html',
  styleUrls: ['./democracy-referendum-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DemocracyReferendumListComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
