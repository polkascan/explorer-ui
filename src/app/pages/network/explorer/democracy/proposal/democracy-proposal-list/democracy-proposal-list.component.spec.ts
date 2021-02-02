import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemocracyProposalListComponent } from './democracy-proposal-list.component';

describe('DemocracyProposalListComponent', () => {
  let component: DemocracyProposalListComponent;
  let fixture: ComponentFixture<DemocracyProposalListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DemocracyProposalListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DemocracyProposalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
