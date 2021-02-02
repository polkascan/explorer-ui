import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InherentDetailComponent } from './inherent-detail.component';

describe('InherentDetailComponent', () => {
  let component: InherentDetailComponent;
  let fixture: ComponentFixture<InherentDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InherentDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InherentDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
