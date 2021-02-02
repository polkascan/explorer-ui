import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemocracyReferendumListComponent } from './democracy-referendum-list.component';

describe('DemocracyReferendumListComponent', () => {
  let component: DemocracyReferendumListComponent;
  let fixture: ComponentFixture<DemocracyReferendumListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemocracyReferendumListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DemocracyReferendumListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
