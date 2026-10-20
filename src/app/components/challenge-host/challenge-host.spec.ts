import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideTranslateService } from '@ngx-translate/core';
import { ChallengeHost } from './challenge-host';
import { BackendService } from '../../services/backend.service';
import { CalendarStateService } from '../../services/calendar-state.service';
import { CALENDAR_DAYS } from '../../config/calendar-config';
import { CHALLENGE_LOADERS } from '../../config/challenge-registry';

@Component({ template: '<p>Replay test game</p>' })
class ReplayTestGame implements OnDestroy {
  @Input() config: unknown;
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();
  destroyed = false;
  ngOnDestroy(): void { this.destroyed = true; }
}

describe('Replaying a completed game', () => {
  let backend: jasmine.SpyObj<BackendService>;
  let state: jasmine.SpyObj<CalendarStateService>;
  beforeEach(async () => {
    backend = jasmine.createSpyObj('BackendService', ['startRun', 'complete', 'saveExtra']);
    let attempts = 0;
    backend.startRun.and.callFake(async () => `run-${++attempts}`);
    backend.complete.and.resolveTo();
    backend.saveExtra.and.resolveTo();
    state = jasmine.createSpyObj('CalendarStateService', ['getGameStats', 'loadCloudProgress', 'markDayComplete'], { devMode: false });
    state.getGameStats.and.returnValue({ bestMoves: 5 });
    spyOn(CHALLENGE_LOADERS, 'juldle').and.resolveTo(ReplayTestGame);
    await TestBed.configureTestingModule({
      imports: [ChallengeHost, ReplayTestGame],
      providers: [provideTranslateService(), { provide: BackendService, useValue: backend },
        { provide: CalendarStateService, useValue: state }],
    }).compileComponents();
    CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, { day: 1, challengeType: 'juldle', reward: { type: 'text', textKey: 'reward' } });
  });
  afterEach(() => CALENDAR_DAYS.splice(0));

  it('starts fresh instances/attempts and saves each completed replay using its own run ID', async () => {
    const fixture = TestBed.createComponent(ChallengeHost);
    fixture.componentRef.setInput('dayConfig', CALENDAR_DAYS[0]);
    fixture.componentRef.setInput('isCompleted', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const first = fixture.debugElement.query(By.directive(ReplayTestGame)).componentInstance as ReplayTestGame;
    expect(first.isCompleted).toBeFalse();
    first.completed.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(first.destroyed).toBeTrue();
    expect(fixture.componentInstance.showFunFact).toBeTrue();
    expect(backend.complete).toHaveBeenCalledWith('run-1', { bestMoves: 5 });

    await fixture.componentInstance.replay();
    fixture.detectChanges();
    const second = fixture.debugElement.query(By.directive(ReplayTestGame)).componentInstance as ReplayTestGame;
    expect(second).not.toBe(first);
    expect(second.isCompleted).toBeFalse();
    expect(fixture.componentInstance.showFunFact).toBeFalse();
    expect(backend.startRun).toHaveBeenCalledTimes(2);
    first.completed.emit(); // A late event from the destroyed run must not submit the new run.
    expect(backend.complete).toHaveBeenCalledTimes(1);
    second.completed.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(backend.complete).toHaveBeenCalledWith('run-2', { bestMoves: 5 });
    expect(backend.complete).toHaveBeenCalledTimes(2);
    fixture.destroy();
  });

  it('lets extra levels replay without returning to the menu or submitting a daily score', async () => {
    const fixture = TestBed.createComponent(ChallengeHost);
    fixture.componentRef.setInput('dayConfig', { day: 0, challengeType: 'juldle', levelId: 'extra-juldle-1' });
    const closed = spyOn(fixture.componentInstance.close, 'emit');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.debugElement.query(By.directive(ReplayTestGame)).componentInstance.completed.emit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(closed).not.toHaveBeenCalled();
    expect(fixture.componentInstance.showFunFact).toBeTrue();
    await fixture.componentInstance.replay();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(ReplayTestGame))).not.toBeNull();
    expect(backend.startRun).not.toHaveBeenCalled();
    expect(backend.complete).not.toHaveBeenCalled();
    expect(backend.saveExtra).toHaveBeenCalledTimes(1);
    fixture.destroy();
  });
});
