import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-analytics-charts',
  templateUrl: './analytics-charts.component.html',
  styleUrls: ['./analytics-charts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalyticsChartsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
