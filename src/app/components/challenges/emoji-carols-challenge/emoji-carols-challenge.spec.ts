import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService, TranslationObject } from '@ngx-translate/core';
import { EmojiCarolsChallenge } from './emoji-carols-challenge';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

interface Translations extends TranslationObject {
  challenges: { emojiCarols: { sets: Record<string, { answer: string; explanation: string }[]> } };
}

describe('Emoji riddle explanations', () => {
  const translations: Record<string, Translations> = {};
  beforeAll(async () => {
    for (const lang of ['en', 'sv']) {
      const response = await fetch(`/assets/i18n/${lang}.json`);
      expect(response.ok).toBeTrue();
      translations[lang] = await response.json() as Translations;
    }
  });
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: CalendarStateService, useValue: { getGameStats: () => null } },
        { provide: SoundService, useValue: jasmine.createSpyObj('SoundService', ['bell', 'thud']) },
      ],
    });
  });

  it('provides an explanation for all 84 riddles across both languages', () => {
    for (const lang of ['en', 'sv']) {
      const sets = translations[lang].challenges.emojiCarols.sets;
      expect(Object.keys(sets).length).toBe(7);
      for (const questions of Object.values(sets)) {
        expect(questions.length).toBe(6);
        for (const q of questions) expect(q.explanation?.length).withContext(q.answer).toBeGreaterThan(20);
      }
    }
  });

  for (const lang of ['en', 'sv']) {
    it(`reveals the Last Christmas explanation after answering in ${lang}`, () => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation(lang, translations[lang]);
      translate.use(lang);
      const fixture = TestBed.createComponent(EmojiCarolsChallenge);
      fixture.detectChanges();
      const game = fixture.componentInstance;
      game.index = game.rounds.findIndex(q => q.answer === 'Last Christmas');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.explanation')).toBeNull();
      const q = game.current!;
      game.choose(q.options.findIndex(option => lang === 'en' ? option !== q.answer : option === q.answer));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.explanation').textContent).toBe(q.explanation);
      expect(fixture.nativeElement.querySelector('.fact').textContent).toBe(q.fact);
      fixture.nativeElement.style.width = '342px';
      // Check the resting layout, after the card/emoji entrance animations.
      (fixture.nativeElement as HTMLElement).getAnimations({ subtree: true }).forEach(animation => animation.cancel());
      const card = fixture.nativeElement.querySelector('.riddle') as HTMLElement;
      const explanation = fixture.nativeElement.querySelector('.explanation') as HTMLElement;
      const cardBounds = card.getBoundingClientRect();
      const explanationBounds = explanation.getBoundingClientRect();
      expect(explanationBounds.left).toBeGreaterThanOrEqual(cardBounds.left);
      expect(explanationBounds.right).toBeLessThanOrEqual(cardBounds.right);
      expect(fixture.nativeElement.scrollWidth).toBeLessThanOrEqual(fixture.nativeElement.clientWidth);
      fixture.destroy();
    });
  }
});
