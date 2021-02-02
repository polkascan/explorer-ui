import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtrinsicDetailComponent } from './extrinsic-detail.component';

describe('ExtrinsicDetailComponent', () => {
  let component: ExtrinsicDetailComponent;
  let fixture: ComponentFixture<ExtrinsicDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExtrinsicDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExtrinsicDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
