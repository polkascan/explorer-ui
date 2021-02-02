import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuntimeEventDetailComponent } from './runtime-event-detail.component';

describe('RuntimeEventDetailComponent', () => {
  let component: RuntimeEventDetailComponent;
  let fixture: ComponentFixture<RuntimeEventDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuntimeEventDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuntimeEventDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
