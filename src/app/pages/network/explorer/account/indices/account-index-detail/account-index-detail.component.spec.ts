import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountIndexDetailComponent } from './account-index-detail.component';

describe('AccountIndexDetailComponent', () => {
  let component: AccountIndexDetailComponent;
  let fixture: ComponentFixture<AccountIndexDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountIndexDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountIndexDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
