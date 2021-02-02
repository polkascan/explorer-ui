import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountValidatorsListComponent } from './account-validators-list.component';

describe('AccountValidatorsListComponent', () => {
  let component: AccountValidatorsListComponent;
  let fixture: ComponentFixture<AccountValidatorsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountValidatorsListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountValidatorsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
