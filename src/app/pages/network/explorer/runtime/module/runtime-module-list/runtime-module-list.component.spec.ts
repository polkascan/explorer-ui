import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeModuleListComponent } from './runtime-module-list.component';

describe('RuntimeModuleListComponent', () => {
  let component: RuntimeModuleListComponent;
  let fixture: ComponentFixture<RuntimeModuleListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeModuleListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeModuleListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
