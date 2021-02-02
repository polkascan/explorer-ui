import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountRegistrarsListComponent } from './account-registrars-list.component';

describe('AccountRegistrarsListComponent', () => {
  let component: AccountRegistrarsListComponent;
  let fixture: ComponentFixture<AccountRegistrarsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountRegistrarsListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountRegistrarsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
