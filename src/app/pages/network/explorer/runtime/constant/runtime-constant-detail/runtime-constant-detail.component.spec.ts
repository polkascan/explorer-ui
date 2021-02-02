import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeConstantDetailComponent } from './runtime-constant-detail.component';

describe('RuntimeConstantDetailComponent', () => {
  let component: RuntimeConstantDetailComponent;
  let fixture: ComponentFixture<RuntimeConstantDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeConstantDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeConstantDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
