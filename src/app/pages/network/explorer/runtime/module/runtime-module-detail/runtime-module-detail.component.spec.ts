import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeModuleDetailComponent } from './runtime-module-detail.component';

describe('RuntimeModuleDetailComponent', () => {
  let component: RuntimeModuleDetailComponent;
  let fixture: ComponentFixture<RuntimeModuleDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeModuleDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeModuleDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
