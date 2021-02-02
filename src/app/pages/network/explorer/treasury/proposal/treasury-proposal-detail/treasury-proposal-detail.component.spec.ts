import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryProposalDetailComponent } from './treasury-proposal-detail.component';

describe('TreasuryProposalDetailComponent', () => {
  let component: TreasuryProposalDetailComponent;
  let fixture: ComponentFixture<TreasuryProposalDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreasuryProposalDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TreasuryProposalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
