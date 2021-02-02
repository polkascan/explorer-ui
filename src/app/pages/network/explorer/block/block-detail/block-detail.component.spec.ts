import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockDetailComponent } from './block-detail.component';

describe('BlockDetailComponent', () => {
  let component: BlockDetailComponent;
  let fixture: ComponentFixture<BlockDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlockDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BlockDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
