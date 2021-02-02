import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemocracyPreimageListComponent } from './democracy-preimage-list.component';

describe('DemocracyPreimageListComponent', () => {
  let component: DemocracyPreimageListComponent;
  let fixture: ComponentFixture<DemocracyPreimageListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemocracyPreimageListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DemocracyPreimageListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
