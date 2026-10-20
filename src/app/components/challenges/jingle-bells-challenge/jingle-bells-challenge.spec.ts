import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { JingleBellsChallenge } from './jingle-bells-challenge';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

describe('Jingle Bells melody', () => {
  let game: JingleBellsChallenge;
  let sound: jasmine.SpyObj<SoundService>;
  let state: jasmine.SpyObj<CalendarStateService>;
  beforeEach(() => {
    sound = jasmine.createSpyObj('SoundService', ['note', 'thud', 'fanfare']);
    state = jasmine.createSpyObj('CalendarStateService', ['getGameStats', 'saveGameStats']);
    TestBed.configureTestingModule({ providers: [
      { provide: SoundService, useValue: sound }, { provide: CalendarStateService, useValue: state },
    ] });
    game = TestBed.runInInjectionContext(() => new JingleBellsChallenge());
    game.config = { targetLength: 6, startSpeed: 500 }; // Legacy Day 2 configuration.
    game.day = 2;
    game.ngOnInit();
  });
  afterEach(() => game.ngOnDestroy());

  it('plays the full recognisable phrase with held notes and dotted rhythm', fakeAsync(() => {
    game.start();
    expect(game.sequence).toEqual([2, 2, 2, 2, 2, 2, 2, 3, 0, 1, 2]);
    expect(game.targetLength).toBe(11);
    expect(game.roundsCleared).toBe(0);
    tick(500); // First E.
    expect(sound.note.calls.count()).toBe(1);
    tick(1000); // E, then the longer third E.
    expect(sound.note.calls.count()).toBe(3);
    tick(999);
    expect(sound.note.calls.count()).toBe(3);
    tick(1); // Next phrase starts after the held note.
    expect(sound.note.calls.count()).toBe(4);
    tick(6000);
    expect(game.phase).toBe('playing');
    expect(sound.note.calls.allArgs().map(args => args[0])).toEqual([
      659.25, 659.25, 659.25, 659.25, 659.25, 659.25, 659.25, 783.99, 523.25, 587.33, 659.25,
    ]);
    game.ngOnDestroy();
  }));

  it('can be completed by repeating the tune, without requiring rhythmic input', fakeAsync(() => {
    const completed = spyOn(game.completed, 'emit');
    game.start();
    tick(8500);
    for (const id of game.sequence) game.ring(game.bells[id]);
    expect(game.phase).toBe('won');
    expect(game.roundsCleared).toBe(11);
    expect(state.saveGameStats).toHaveBeenCalledWith(2, { bestRound: 11 });
    tick(2000);
    expect(completed).toHaveBeenCalledTimes(1);
    game.ngOnDestroy();
  }));

  it('replays the same tune after a mistake and on restart', fakeAsync(() => {
    game.start();
    const phrase = [...game.sequence];
    tick(8500);
    game.ring(game.bells[0]);
    expect(game.phase).toBe('oops');
    tick(9600);
    expect(game.phase).toBe('playing');
    expect(game.sequence).toEqual(phrase);
    game.start();
    expect(game.sequence).toEqual(phrase);
    game.ngOnDestroy();
  }));

  it('keeps random Simon sequences and one-mistake losses for endless mode', fakeAsync(() => {
    game.config = { endless: true, startSpeed: 500 };
    game.ngOnInit();
    spyOn(Math, 'random').and.returnValue(0.8);
    game.start();
    expect(game.sequence).toEqual([3]);
    tick(1000);
    game.ring(game.bells[0]);
    expect(game.phase).toBe('over');
    game.ngOnDestroy();
  }));
});
