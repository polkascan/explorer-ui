import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InherentListComponent } from './inherent-list.component';

describe('InherentListComponent', () => {
  let component: InherentListComponent;
  let fixture: ComponentFixture<InherentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InherentListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InherentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
