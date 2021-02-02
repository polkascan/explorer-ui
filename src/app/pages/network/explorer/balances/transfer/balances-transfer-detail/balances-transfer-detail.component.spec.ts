import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalancesTransferDetailComponent } from './balances-transfer-detail.component';

describe('BalancesTransferDetailComponent', () => {
  let component: BalancesTransferDetailComponent;
  let fixture: ComponentFixture<BalancesTransferDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BalancesTransferDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BalancesTransferDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
