import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreasuryProposalListComponent } from './treasury-proposal-list.component';

describe('TreasuryProposalListComponent', () => {
  let component: TreasuryProposalListComponent;
  let fixture: ComponentFixture<TreasuryProposalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreasuryProposalListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TreasuryProposalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
