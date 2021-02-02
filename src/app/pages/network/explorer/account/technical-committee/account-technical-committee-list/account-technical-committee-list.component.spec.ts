import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountTechnicalCommitteeListComponent } from './account-technical-committee-list.component';

describe('AccountCommitteeListComponent', () => {
  let component: AccountTechnicalCommitteeListComponent;
  let fixture: ComponentFixture<AccountTechnicalCommitteeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountTechnicalCommitteeListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountTechnicalCommitteeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
