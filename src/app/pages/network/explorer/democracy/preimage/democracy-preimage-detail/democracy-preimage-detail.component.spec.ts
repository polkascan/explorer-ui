import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemocracyPreimageDetailComponent } from './democracy-preimage-detail.component';

describe('DemocracyPreimageDetailComponent', () => {
  let component: DemocracyPreimageDetailComponent;
  let fixture: ComponentFixture<DemocracyPreimageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemocracyPreimageDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DemocracyPreimageDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
