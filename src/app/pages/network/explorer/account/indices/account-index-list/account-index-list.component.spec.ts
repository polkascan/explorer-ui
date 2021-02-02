import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountIndexListComponent } from './account-index-list.component';

describe('AccountIndexListComponent', () => {
  let component: AccountIndexListComponent;
  let fixture: ComponentFixture<AccountIndexListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountIndexListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountIndexListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
