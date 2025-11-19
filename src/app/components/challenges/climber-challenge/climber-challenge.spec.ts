import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClimberChallenge } from './climber-challenge';

describe('ClimberChallenge', () => {
  let component: ClimberChallenge;
  let fixture: ComponentFixture<ClimberChallenge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimberChallenge]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClimberChallenge);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
