import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeListComponent } from './runtime-list.component';

describe('RuntimeListComponent', () => {
  let component: RuntimeListComponent;
  let fixture: ComponentFixture<RuntimeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
