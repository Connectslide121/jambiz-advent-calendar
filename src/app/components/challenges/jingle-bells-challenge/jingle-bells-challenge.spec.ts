import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { JingleBellsChallenge } from './jingle-bells-challenge';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

describe('Step-by-step Christmas melody', () => {
  let game: JingleBellsChallenge;
  let sound: jasmine.SpyObj<SoundService>;
  let state: jasmine.SpyObj<CalendarStateService>;
  const melody = [0, 3, 3, 4, 3, 2, 1, 1];
  const beats = [1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1];
  function finishListening(): void {
    tick(500 + game.sequence.reduce((total, _, i) => total + beats[i % beats.length] * 500, 0));
    expect(game.phase).toBe('playing');
  }
  function repeatRound(): void {
    for (const id of [...game.sequence]) game.ring(game.bells[id]);
  }
  beforeEach(() => {
    sound = jasmine.createSpyObj('SoundService', ['note', 'thud', 'fanfare']);
    state = jasmine.createSpyObj('CalendarStateService', ['getGameStats', 'saveGameStats']);
    TestBed.configureTestingModule({ providers: [
      { provide: SoundService, useValue: sound }, { provide: CalendarStateService, useValue: state },
    ] });
    game = TestBed.runInInjectionContext(() => new JingleBellsChallenge());
    game.config = { targetLength: 8, startSpeed: 500 };
    game.day = 2;
    game.ngOnInit();
  });
  afterEach(() => game.ngOnDestroy());

  it('starts with one note and waits for the player before adding exactly one note per round', fakeAsync(() => {
    const completed = spyOn(game.completed, 'emit');
    game.start();
    expect(game.targetLength).toBe(8);
    expect(game.sequence).toEqual([0]);
    for (let round = 1; round <= 8; round++) {
      const expected = Array.from({ length: round }, (_, i) => melody[i % melody.length]);
      expect(game.sequence).toEqual(expected);
      expect(game.roundsCleared).toBe(round - 1);
      sound.note.calls.reset();
      finishListening();
      expect(sound.note.calls.allArgs().map(args => args[0])).toEqual(expected.map(id => game.bells[id].note));
      tick(10000); // Waiting alone must never advance the sequence.
      expect(game.sequence).toEqual(expected);
      expect(game.phase).toBe('playing');
      repeatRound();
      if (round < 8) {
        expect(game.phase).toBe('listening');
        expect(game.sequence.length).toBe(round);
        tick(800);
        expect(game.sequence.length).toBe(round + 1);
      }
    }
    expect(game.phase).toBe('won');
    expect(game.roundsCleared).toBe(8);
    expect(state.saveGameStats).toHaveBeenCalledWith(2, { bestRound: 8 });
    sound.note.calls.reset();
    tick(499);
    expect(sound.note).not.toHaveBeenCalled();
    tick(1);
    expect(sound.note.calls.mostRecent().args[0]).toBe(440); // Next note, not the opening G.
    tick(1500);
    expect(completed).not.toHaveBeenCalled();
    tick(15000);
    expect(sound.note.calls.allArgs().map(args => args[0])).toEqual([
      440, 587.33, 587.33, 659.25, 587.33, 523.25, 493.88, 392, 392,
      659.25, 659.25, 698.46, 659.25, 587.33, 523.25, 440, 392, 392,
      440, 587.33, 493.88, 523.25,
    ]);
    expect(completed).toHaveBeenCalledTimes(1);
    game.ngOnDestroy();
  }));

  it('preserves the carol rhythm and uses five distinct pitches in eight notes', fakeAsync(() => {
    game.start();
    for (let round = 1; round <= 7; round++) {
      finishListening();
      repeatRound();
      tick(800);
    }
    expect(game.sequence).toEqual(melody);
    expect(new Set(game.sequence).size).toBe(5);
    sound.note.calls.reset();
    tick(500); // G pickup.
    tick(500); // C quarter.
    tick(500); // C eighth.
    expect(sound.note.calls.allArgs().map(args => args[0])).toEqual([392, 523.25, 523.25]);
    tick(249);
    expect(sound.note.calls.count()).toBe(3);
    tick(1); // D eighth.
    expect(sound.note.calls.mostRecent().args[0]).toBe(587.33);
    tick(1750);
    expect(game.phase).toBe('playing');
    game.ngOnDestroy();
  }));

  it('cancels the song continuation and pending completion when leaving the game', fakeAsync(() => {
    const completed = spyOn(game.completed, 'emit');
    game.start();
    for (let round = 1; round <= 8; round++) {
      finishListening();
      repeatRound();
      if (round < 8) tick(800);
    }
    tick(500);
    game.ngOnDestroy();
    sound.note.calls.reset();
    tick(20000);
    expect(sound.note).not.toHaveBeenCalled();
    expect(completed).not.toHaveBeenCalled();
  }));

  it('keeps day 2 at eight notes even with an older cloud configuration', () => {
    game.config = { targetLength: 11 };
    game.ngOnInit();
    expect(game.targetLength).toBe(8);
    game.day = undefined;
    game.ngOnInit();
    expect(game.targetLength).toBe(11); // Extras can still use longer sequences.
  });

  it('retries the current round after a mistake, then resets to one note on restart', fakeAsync(() => {
    game.start();
    finishListening();
    repeatRound();
    tick(800);
    finishListening();
    expect(game.sequence).toEqual([0, 3]);
    game.ring(game.bells[1]);
    expect(game.phase).toBe('oops');
    tick(1100);
    finishListening();
    expect(game.sequence).toEqual([0, 3]);
    expect(game.roundsCleared).toBe(1);
    repeatRound();
    tick(800);
    expect(game.sequence).toEqual([0, 3, 3]);
    game.start();
    expect(game.sequence).toEqual([0]);
    expect(game.roundsCleared).toBe(0);
    game.ngOnDestroy();
  }));

  it('keeps random sequences and one-mistake losses for endless mode', fakeAsync(() => {
    game.config = { endless: true, startSpeed: 500 };
    game.ngOnInit();
    spyOn(Math, 'random').and.returnValue(0.8);
    game.start();
    expect(game.sequence).toEqual([4]);
    tick(1000);
    game.ring(game.bells[0]);
    expect(game.phase).toBe('over');
    game.ngOnDestroy();
  }));
});
