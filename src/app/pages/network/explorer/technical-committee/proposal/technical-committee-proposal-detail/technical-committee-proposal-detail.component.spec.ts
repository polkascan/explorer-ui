import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechnicalCommitteeProposalDetailComponent } from './technical-committee-proposal-detail.component';

describe('TechnicalCommitteeProposalDetailComponent', () => {
  let component: TechnicalCommitteeProposalDetailComponent;
  let fixture: ComponentFixture<TechnicalCommitteeProposalDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TechnicalCommitteeProposalDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicalCommitteeProposalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
