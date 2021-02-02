import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechnicalCommitteeProposalListComponent } from './technical-committee-proposal-list.component';

describe('TechnicalCommitteeProposalListComponent', () => {
  let component: TechnicalCommitteeProposalListComponent;
  let fixture: ComponentFixture<TechnicalCommitteeProposalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TechnicalCommitteeProposalListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TechnicalCommitteeProposalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
