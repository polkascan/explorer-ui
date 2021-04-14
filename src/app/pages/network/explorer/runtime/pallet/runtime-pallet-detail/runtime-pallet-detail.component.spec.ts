import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimePalletDetailComponent } from './runtime-pallet-detail.component';

describe('RuntimePalletDetailComponent', () => {
  let component: RuntimePalletDetailComponent;
  let fixture: ComponentFixture<RuntimePalletDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimePalletDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimePalletDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
