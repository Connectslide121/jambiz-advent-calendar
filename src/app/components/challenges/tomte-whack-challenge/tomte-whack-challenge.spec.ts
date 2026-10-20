import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { TomteWhackChallenge } from './tomte-whack-challenge';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

describe('Tomte keyboard numpad controls', () => {
  beforeEach(() => {
    spyOn(window, 'requestAnimationFrame').and.returnValue(0);
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: CalendarStateService, useValue: { getGameStats: () => null } },
        { provide: SoundService, useValue: {} },
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
});
