import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-analytics-chart-detail',
  templateUrl: './analytics-chart-detail.component.html',
  styleUrls: ['./analytics-chart-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsChartDetailComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
