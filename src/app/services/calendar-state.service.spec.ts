import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BackendService } from './backend.service';
import { CalendarStateService } from './calendar-state.service';
import { CALENDAR_DAYS } from '../config/calendar-config';
import { ChallengeHost } from '../components/challenge-host/challenge-host';

describe('Local calendar previews', () => {
  const official = { day: 1, challengeType: 'juldle' as const, challengeData: {} };
  const preview = Array.from({ length: 24 }, (_, i) => ({ ...official, day: i + 1, reward: { type: 'text', textKey: 'preview' } }));
  let state: CalendarStateService;
  let backend: { player: ReturnType<typeof signal<any>>; complete: jasmine.Spy; saveExtra: jasmine.Spy };
  beforeEach(() => {
    localStorage.removeItem('jambiz-advent-dev-mode');
    localStorage.removeItem('jambiz-advent-devtools-visible');
    backend = { player: signal({ days: [{ day: 2, stats: { bestMoves: 3 } }], extras: {} }),
      complete: jasmine.createSpy('complete'), saveExtra: jasmine.createSpy('saveExtra') };
    TestBed.configureTestingModule({ providers: [{ provide: BackendService, useValue: backend }] });
    state = TestBed.inject(CalendarStateService);
    CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, official);
    state.loadCloudProgress();
  });
  afterEach(() => {
    CALENDAR_DAYS.splice(0);
    localStorage.removeItem('jambiz-advent-dev-mode');
    localStorage.removeItem('jambiz-advent-devtools-visible');
  });

  it('restores dev tools and dev mode on reload, and remembers turning them off', async () => {
    spyOn(window, 'fetch').and.callFake(async () => new Response(JSON.stringify({ days: preview })));
    state.devToolsVisible = true;
    await state.setDevMode(true);
    CALENDAR_DAYS.splice(0, CALENDAR_DAYS.length, official);
    const restored = TestBed.runInInjectionContext(() => new CalendarStateService());
    restored.loadCloudProgress();
    await restored.restoreDevPreferences();
    expect(restored.devToolsVisible).toBeTrue();
    expect(restored.devMode).toBeTrue();
    expect(CALENDAR_DAYS.length).toBe(24);
    restored.devToolsVisible = false;
    await restored.setDevMode(false);
    const disabled = TestBed.runInInjectionContext(() => new CalendarStateService());
    await disabled.restoreDevPreferences();
    expect(disabled.devToolsVisible).toBeFalse();
    expect(disabled.devMode).toBeFalse();
    expect(CALENDAR_DAYS).toEqual([official]);
  });

  it('keeps preview usable when localStorage is blocked', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ days: preview })));
    spyOn(Storage.prototype, 'getItem').and.throwError('Storage blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('Storage blocked');
    const isolated = TestBed.runInInjectionContext(() => new CalendarStateService());
    isolated.devToolsVisible = true;
    await isolated.setDevMode(true);
    expect(isolated.devToolsVisible).toBeTrue();
    expect(isolated.devMode).toBeTrue();
  });

  it('unlocks all content locally and restores cloud progress on exit', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ days: preview })));
    await state.setDevMode(true);
    expect(state.devMode).toBeTrue();
    expect(state.isDayUnlocked(24)).toBeTrue();
    expect(state.isFullyUnlocked()).toBeTrue();
    expect(CALENDAR_DAYS[0].reward?.textKey).toBe('preview');
    state.markDayComplete(1);
    expect(state.isDayCompleted(1)).toBeTrue();
    expect(backend.player().days.length).toBe(1);
    await state.setDevMode(false);
    expect(state.getCompletedDays()).toEqual([2]);
    expect(CALENDAR_DAYS).toEqual([official]);
  });

  it('does not enable preview if the development-only asset is unavailable', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));
    await state.setDevMode(true);
    expect(state.devMode).toBeFalse();
    expect(state.previewError).toBeTrue();
    expect(CALENDAR_DAYS).toEqual([official]);
  });

  it('does not submit daily or extra preview completions to the backend', async () => {
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify({ days: preview })));
    await state.setDevMode(true);
    const host = TestBed.runInInjectionContext(() => new ChallengeHost());
    host.previewRun = true;
    host.dayConfig = CALENDAR_DAYS[0];
    await host.onChallengeComplete();
    expect(host.showFunFact).toBeTrue();
    expect(state.isDayCompleted(1)).toBeTrue();
    const extra = TestBed.runInInjectionContext(() => new ChallengeHost());
    extra.previewRun = true;
    extra.dayConfig = { day: 0, levelId: 'preview-extra' };
    await extra.onChallengeComplete();
    expect(backend.complete).not.toHaveBeenCalled();
    expect(backend.saveExtra).not.toHaveBeenCalled();
  });
});
