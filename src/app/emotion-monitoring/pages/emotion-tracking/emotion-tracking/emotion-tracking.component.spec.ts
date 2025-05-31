import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmotionTrackingComponent } from './emotion-tracking.component';

describe('EmotionTrackingComponent', () => {
  let component: EmotionTrackingComponent;
  let fixture: ComponentFixture<EmotionTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmotionTrackingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmotionTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
