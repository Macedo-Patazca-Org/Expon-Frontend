import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPerformanceComponent } from './user-performance.component';

describe('UserPerformanceComponent', () => {
  let component: UserPerformanceComponent;
  let fixture: ComponentFixture<UserPerformanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserPerformanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserPerformanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
