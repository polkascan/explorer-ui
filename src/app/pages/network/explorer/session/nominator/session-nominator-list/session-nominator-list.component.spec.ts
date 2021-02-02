import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionNominatorListComponent } from './session-nominator-list.component';

describe('NominatorListComponent', () => {
  let component: SessionNominatorListComponent;
  let fixture: ComponentFixture<SessionNominatorListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SessionNominatorListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SessionNominatorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
