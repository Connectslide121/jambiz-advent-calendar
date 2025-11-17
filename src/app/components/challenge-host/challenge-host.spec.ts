import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChallengeHost } from './challenge-host';

describe('ChallengeHost', () => {
  let component: ChallengeHost;
  let fixture: ComponentFixture<ChallengeHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChallengeHost]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChallengeHost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
