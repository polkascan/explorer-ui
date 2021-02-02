import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSudoListComponent } from './account-sudo-list.component';

describe('AccountSudoListComponent', () => {
  let component: AccountSudoListComponent;
  let fixture: ComponentFixture<AccountSudoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountSudoListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountSudoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
