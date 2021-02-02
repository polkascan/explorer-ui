import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountTreasuryListComponent } from './account-treasury-list.component';

describe('AccountTreasuryListComponent', () => {
  let component: AccountTreasuryListComponent;
  let fixture: ComponentFixture<AccountTreasuryListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountTreasuryListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountTreasuryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
