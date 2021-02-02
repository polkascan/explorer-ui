import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalancesTransferListComponent } from './balances-transfer-list.component';

describe('BalancesTransferListComponent', () => {
  let component: BalancesTransferListComponent;
  let fixture: ComponentFixture<BalancesTransferListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BalancesTransferListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BalancesTransferListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
