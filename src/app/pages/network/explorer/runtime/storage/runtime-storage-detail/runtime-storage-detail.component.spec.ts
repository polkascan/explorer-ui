import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeStorageDetailComponent } from './runtime-storage-detail.component';

describe('RuntimeStorageDetailComponent', () => {
  let component: RuntimeStorageDetailComponent;
  let fixture: ComponentFixture<RuntimeStorageDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeStorageDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeStorageDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
