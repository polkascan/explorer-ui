import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountNominatorsListComponent } from './account-nominators-list.component';

describe('AccountNominatorsListComponent', () => {
  let component: AccountNominatorsListComponent;
  let fixture: ComponentFixture<AccountNominatorsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountNominatorsListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountNominatorsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
