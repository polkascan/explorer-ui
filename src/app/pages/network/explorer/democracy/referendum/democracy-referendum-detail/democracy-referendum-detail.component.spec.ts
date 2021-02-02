import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemocracyReferendumDetailComponent } from './democracy-referendum-detail.component';

describe('DemocracyReferendumDetailComponent', () => {
  let component: DemocracyReferendumDetailComponent;
  let fixture: ComponentFixture<DemocracyReferendumDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemocracyReferendumDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DemocracyReferendumDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
