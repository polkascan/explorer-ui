import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CouncilMotionListComponent } from './council-motion-list.component';

describe('CouncilMotionListComponent', () => {
  let component: CouncilMotionListComponent;
  let fixture: ComponentFixture<CouncilMotionListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CouncilMotionListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CouncilMotionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
