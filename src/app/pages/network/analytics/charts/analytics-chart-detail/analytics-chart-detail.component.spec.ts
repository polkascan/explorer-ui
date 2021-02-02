import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsChartDetailComponent } from './analytics-chart-detail.component';

describe('AnalyticsChartDetailComponent', () => {
  let component: AnalyticsChartDetailComponent;
  let fixture: ComponentFixture<AnalyticsChartDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalyticsChartDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyticsChartDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
