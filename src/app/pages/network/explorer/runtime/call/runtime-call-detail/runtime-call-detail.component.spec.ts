import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeCallDetailComponent } from './runtime-call-detail.component';

describe('RuntimeCallDetailComponent', () => {
  let component: RuntimeCallDetailComponent;
  let fixture: ComponentFixture<RuntimeCallDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeCallDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeCallDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
