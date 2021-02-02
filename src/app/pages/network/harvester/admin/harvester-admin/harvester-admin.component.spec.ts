import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HarvesterAdminComponent } from './harvester-admin.component';

describe('HarvesterAdminComponent', () => {
  let component: HarvesterAdminComponent;
  let fixture: ComponentFixture<HarvesterAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HarvesterAdminComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HarvesterAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
