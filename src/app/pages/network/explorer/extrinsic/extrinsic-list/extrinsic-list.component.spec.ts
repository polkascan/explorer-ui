import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtrinsicListComponent } from './extrinsic-list.component';

describe('ExtrinsicListComponent', () => {
  let component: ExtrinsicListComponent;
  let fixture: ComponentFixture<ExtrinsicListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ExtrinsicListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExtrinsicListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
