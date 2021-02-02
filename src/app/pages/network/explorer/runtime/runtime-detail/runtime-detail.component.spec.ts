import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeDetailComponent } from './runtime-detail.component';

describe('RuntimeDetailComponent', () => {
  let component: RuntimeDetailComponent;
  let fixture: ComponentFixture<RuntimeDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
