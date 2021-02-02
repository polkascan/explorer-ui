import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemocracyProposalDetailComponent } from './democracy-proposal-detail.component';

describe('DemocracyProposalDetailComponent', () => {
  let component: DemocracyProposalDetailComponent;
  let fixture: ComponentFixture<DemocracyProposalDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemocracyProposalDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DemocracyProposalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
