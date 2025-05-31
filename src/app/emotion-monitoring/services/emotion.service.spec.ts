import { TestBed } from '@angular/core/testing';

import { EmotionService } from './emotion.service';

describe('EmotionService', () => {
  let service: EmotionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmotionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
