import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateConfigComponent } from './template-config.component';

describe('TemplateConfigComponent', () => {
  let component: TemplateConfigComponent;
  let fixture: ComponentFixture<TemplateConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemplateConfigComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemplateConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
