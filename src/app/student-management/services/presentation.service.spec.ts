import { TestBed } from '@angular/core/testing';

import { PresentationService } from './presentation.service';

describe('PresentationService', () => {
  let service: PresentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PresentationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
