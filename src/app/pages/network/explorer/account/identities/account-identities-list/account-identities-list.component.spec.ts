import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountIdentitiesListComponent } from './account-identities-list.component';

describe('AccountIdentitiesListComponent', () => {
  let component: AccountIdentitiesListComponent;
  let fixture: ComponentFixture<AccountIdentitiesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountIdentitiesListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountIdentitiesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
