import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmotionChartComponent } from './emotion-chart.component';

describe('EmotionChartComponent', () => {
  let component: EmotionChartComponent;
  let fixture: ComponentFixture<EmotionChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmotionChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmotionChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
