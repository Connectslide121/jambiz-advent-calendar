import { fakeAsync, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { TomteWhackChallenge } from './tomte-whack-challenge';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

describe('Tomte controls and hit feedback', () => {
  let sound: jasmine.SpyObj<SoundService>;
  beforeEach(() => {
    sound = jasmine.createSpyObj('SoundService', ['bonk', 'jingle', 'crunch', 'bleat', 'thud', 'fanfare', 'bell']);
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: CalendarStateService, useValue: { getGameStats: () => null } },
        { provide: SoundService, useValue: sound },
      ],
    });
  });

  it('renders numpad labels and targets the corresponding mounds with both digit key sets', () => {
    const fixture = TestBed.createComponent(TomteWhackChallenge);
    fixture.detectChanges();
    const game = fixture.componentInstance;
    expect(Array.from(fixture.nativeElement.querySelectorAll('.key') as NodeListOf<HTMLElement>, el => el.textContent?.trim()))
      .toEqual(['7', '8', '9', '4', '5', '6', '1', '2', '3']);
    const whack = spyOn(game, 'whack');
    game.phase = 'playing';
    const holes = [6, 7, 8, 3, 4, 5, 0, 1, 2];
    for (let n = 1; n <= 9; n++) {
      for (const code of [`Numpad${n}`, `Digit${n}`]) {
        const event = new KeyboardEvent('keydown', { key: String(n), code, cancelable: true });
        window.dispatchEvent(event);
        expect(whack.calls.mostRecent().args[0]).toBe(holes[n - 1]);
        expect(event.defaultPrevented).toBeTrue();
      }
    }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', code: 'Numpad1' }));
    expect(whack.calls.mostRecent().args[0]).toBe(6);
    fixture.destroy();
    whack.calls.reset();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '7', code: 'Numpad7' }));
    expect(whack).not.toHaveBeenCalled();
  });

  it('keeps the bottom-left numpad alignment on larger grids and ignores typing in inputs', () => {
    const fixture = TestBed.createComponent(TomteWhackChallenge);
    fixture.componentInstance.config = { rows: 4, cols: 4 };
    fixture.detectChanges();
    const game = fixture.componentInstance;
    expect(game.holes.map(h => game.getHoleKey(h.id))).toEqual([
      null, null, null, null, 7, 8, 9, null, 4, 5, 6, null, 1, 2, 3, null,
    ]);
    const whack = spyOn(game, 'whack');
    game.phase = 'playing';
    const input = document.createElement('input');
    fixture.nativeElement.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '7', code: 'Numpad7', bubbles: true }));
    expect(whack).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('plays distinct sounds for all four target types and ignores repeated hits', fakeAsync(() => {
    const fixture = TestBed.createComponent(TomteWhackChallenge);
    fixture.detectChanges();
    const game = fixture.componentInstance;
    game.phase = 'playing';
    const kinds = ['tomte', 'golden', 'coal', 'goat'] as const;
    kinds.forEach((kind, i) => {
      game.holes[i].kind = kind;
      game.holes[i].up = true;
      game.whack(i);
      game.whack(i); // Holding/tapping an already-hit target must not repeat effects.
    });
    expect(sound.bonk).toHaveBeenCalledTimes(1);
    expect(sound.jingle).toHaveBeenCalledTimes(1);
    expect(sound.crunch).toHaveBeenCalledTimes(1);
    expect(sound.bleat).toHaveBeenCalledTimes(1);
    expect(sound.thud).not.toHaveBeenCalled();
    fixture.destroy();
  }));

  it('does not layer the generic penalty sound over a hazard hit in endless mode', fakeAsync(() => {
    const fixture = TestBed.createComponent(TomteWhackChallenge);
    fixture.componentInstance.config = { endless: true };
    fixture.detectChanges();
    const game = fixture.componentInstance;
    game.phase = 'playing';
    game.holes[0].kind = 'coal';
    game.holes[0].up = true;
    game.whack(0);
    expect(game.lives).toBe(2);
    expect(sound.crunch).toHaveBeenCalledTimes(1);
    expect(sound.thud).not.toHaveBeenCalled();
    fixture.destroy();
  }));

});
