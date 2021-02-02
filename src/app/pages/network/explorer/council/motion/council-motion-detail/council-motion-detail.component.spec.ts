import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CouncilMotionDetailComponent } from './council-motion-detail.component';

describe('CouncilMotionDetailComponent', () => {
  let component: CouncilMotionDetailComponent;
  let fixture: ComponentFixture<CouncilMotionDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CouncilMotionDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CouncilMotionDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
