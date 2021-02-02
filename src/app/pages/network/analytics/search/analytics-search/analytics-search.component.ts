import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-analytics-search',
  templateUrl: './analytics-search.component.html',
  styleUrls: ['./analytics-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsSearchComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
