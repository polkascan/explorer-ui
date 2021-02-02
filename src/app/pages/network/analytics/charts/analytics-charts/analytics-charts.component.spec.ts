import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsChartsComponent } from './analytics-charts.component';

describe('AnalyticsChartsComponent', () => {
  let component: AnalyticsChartsComponent;
  let fixture: ComponentFixture<AnalyticsChartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalyticsChartsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyticsChartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
