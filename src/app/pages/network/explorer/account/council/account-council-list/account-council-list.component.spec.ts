import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountCouncilListComponent } from './account-council-list.component';

describe('AccountCouncilListComponent', () => {
  let component: AccountCouncilListComponent;
  let fixture: ComponentFixture<AccountCouncilListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountCouncilListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountCouncilListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
