import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticsSearchComponent } from './analytics-search.component';

describe('AnalyticsSearchComponent', () => {
  let component: AnalyticsSearchComponent;
  let fixture: ComponentFixture<AnalyticsSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnalyticsSearchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalyticsSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
