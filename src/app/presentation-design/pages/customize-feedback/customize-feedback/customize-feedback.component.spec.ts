import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomizeFeedbackComponent } from './customize-feedback.component';

describe('CustomizeFeedbackComponent', () => {
  let component: CustomizeFeedbackComponent;
  let fixture: ComponentFixture<CustomizeFeedbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomizeFeedbackComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomizeFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
