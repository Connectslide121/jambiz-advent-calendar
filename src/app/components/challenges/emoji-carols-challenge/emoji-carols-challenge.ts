import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { LucideAngularModule, Check, X, ArrowRight } from 'lucide-angular';
import { CalendarStateService } from '../../../services/calendar-state.service';
import { SoundService } from '../../../services/sound.service';

export interface EmojiCarolsConfig {
  set?: string; // Question set key under challenges.emojiCarols.sets ('a'...'e'). Default 'a'
  rounds?: number; // Questions per run. Default 6
  passScore?: number; // Correct answers needed to win. Default 4
}

/** One riddle as it lives in the translation files */
type Kind = 'song' | 'movie' | 'food';
const KINDS: Kind[] = ['song', 'movie', 'food'];
const KIND_ICONS: Record<Kind, string> = { song: '🎵', movie: '🎬', food: '🍽️' };

interface RawQuestion {
  kind: Kind;
  emoji: string; // space separated so multi-codepoint emoji stay intact
  answer: string;
  wrong: string[];
  explanation: string;
  fact: string;
}

interface Round {
  kind: Kind;
  emoji: string[];
  answer: string;
  options: string[];
  explanation: string;
  fact: string;
}

interface Confetti {
  id: number;
  x: number;
  delay: number;
  dur: number;
  color: string;
  rot: number;
  drift: number;
}

type Phase = 'loading' | 'playing' | 'won' | 'failed';

const CONFETTI_COLORS = ['#e0475b', '#f7c873', '#3aae8a', '#cfe6ff', '#ff9f43', '#5cf2b3'];

/**
 * Emoji Carols - guess famous Christmas songs and movies from emoji riddles.
 * A run is a handful of rounds with four options each; reach the pass score to win.
 * Questions live in the translation files so each language can use the titles people know.
 */
@Component({
  selector: 'app-emoji-carols-challenge',
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './emoji-carols-challenge.html',
  styleUrl: './emoji-carols-challenge.scss',
})
export class EmojiCarolsChallenge implements OnInit, OnDestroy {
  @Input() config: EmojiCarolsConfig = {};
  @Input() isCompleted = false;
  @Input() day?: number;
  @Input() levelId?: string;
  @Output() completed = new EventEmitter<void>();

  readonly Check = Check;
  readonly X = X;
  readonly ArrowRight = ArrowRight;
  readonly letters = ['A', 'B', 'C', 'D'];
  readonly kindIcons = KIND_ICONS;

  private stateService = inject(CalendarStateService);
  private sound = inject(SoundService);
  private translate = inject(TranslateService);
  private host = inject(ElementRef<HTMLElement>);

  phase: Phase = 'loading';
  rounds: Round[] = [];
  index = 0;
  score = 0;
  chosen: number | null = null;
  results: (boolean | null)[] = [];
  reaction = '';
  passScore = 4;
  roundCount = 6;
  bestScore: number | null = null;
  confetti: Confetti[] = [];
  /** Bumped every round so the card re-runs its entrance animation */
  cardKey = 0;

  private pool: RawQuestion[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private subs: Subscription[] = [];

  get current(): Round | null {
    return this.rounds[this.index] ?? null;
  }

  get answered(): boolean {
    return this.chosen !== null;
  }

  get isLast(): boolean {
    return this.index >= this.rounds.length - 1;
  }

  get lastCorrect(): boolean {
    return this.results[this.index] === true;
  }

  ngOnInit(): void {
    this.roundCount = Math.max(3, Math.min(10, Math.round(this.config?.rounds ?? 6)));
    const key = this.day ?? this.levelId;
    const stats = key ? this.stateService.getGameStats(key) : null;
    this.bestScore = stats?.bestScore ?? null;
    this.load();
    this.subs.push(
      this.translate.onLangChange.subscribe(() => {
        if (this.phase !== 'won') this.load();
      }),
    );
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
    this.subs.forEach((s) => s.unsubscribe());
  }

  private load(): void {
    const set = (this.config?.set ?? 'a').toString();
    this.subs.push(
      this.translate.get(`challenges.emojiCarols.sets.${set}`).subscribe((data: unknown) => {
        let pool = Array.isArray(data) ? (data as RawQuestion[]) : [];
        if (!pool.length) {
          const fallback = this.translate.instant('challenges.emojiCarols.sets.a');
          pool = Array.isArray(fallback) ? fallback : [];
        }
        this.pool = pool.filter((q) => q && q.answer && Array.isArray(q.wrong));
        this.newRun();
      }),
    );
  }

  /** Fresh run: new question order and freshly shuffled options */
  newRun(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const picked = shuffle(this.pool).slice(0, this.roundCount);
    this.rounds = picked.map((q) => ({
      kind: KINDS.includes(q.kind) ? q.kind : 'song',
      emoji: q.emoji.split(/\s+/).filter(Boolean),
      answer: q.answer,
      options: shuffle([q.answer, ...q.wrong.slice(0, 3)]),
      explanation: q.explanation,
      fact: q.fact,
    }));
    this.passScore = Math.max(1, Math.min(this.rounds.length, Math.round(this.config?.passScore ?? 4)));
    this.results = this.rounds.map(() => null);
    this.index = 0;
    this.score = 0;
    this.chosen = null;
    this.reaction = '';
    this.confetti = [];
    this.cardKey++;
    this.phase = this.rounds.length ? 'playing' : 'loading';
  }

  choose(i: number): void {
    const round = this.current;
    if (this.phase !== 'playing' || this.answered || !round || i >= round.options.length) return;
    this.chosen = i;
    const right = round.options[i] === round.answer;
    this.results[this.index] = right;
    const lines = this.translate.instant(right ? 'challenges.emojiCarols.cheers' : 'challenges.emojiCarols.jeers');
    this.reaction = Array.isArray(lines) ? lines[Math.floor(Math.random() * lines.length)] : '';
    if (right) {
      this.score++;
      this.sound.bell(1046.5, 0.16);
      this.sound.bell(1318.51, 0.14, 0.09);
      this.sound.bell(1567.98, 0.12, 0.18);
    } else {
      this.sound.thud();
    }
  }

  next(): void {
    if (this.phase !== 'playing' || !this.answered) return;
    if (this.isLast) {
      this.finish();
      return;
    }
    this.index++;
    this.chosen = null;
    this.reaction = '';
    this.cardKey++;
    this.sound.bell(880, 0.06);
  }

  retry(): void {
    this.newRun();
  }

  showReward(): void {
    this.completed.emit();
  }

  isCorrectOption(option: string): boolean {
    return option === this.current?.answer;
  }

  private finish(): void {
    const key = this.day ?? this.levelId;
    this.bestScore = this.bestScore === null ? this.score : Math.max(this.bestScore, this.score);
    if (this.score >= this.passScore) {
      this.phase = 'won';
      this.sound.fanfare();
      this.confetti = Array.from({ length: 60 }, (_, id) => ({
        id,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        color: CONFETTI_COLORS[id % CONFETTI_COLORS.length],
        rot: (Math.random() - 0.5) * 900,
        drift: (Math.random() - 0.5) * 120,
      }));
      if (key) this.stateService.saveGameStats(key, { bestScore: this.bestScore });
      const t = setTimeout(() => this.completed.emit(), 2200);
      this.timers.push(t);
    } else {
      this.phase = 'failed';
      this.sound.thud();
      if (key) this.stateService.saveGameStats(key, { bestScore: this.bestScore });
    }
  }

  private ownsTarget(target: HTMLElement | null): boolean {
    return !!target && (this.host.nativeElement as HTMLElement).contains(target);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
    if (this.phase !== 'playing') return;
    const k = e.key.toLowerCase();
    const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
    if (idx >= 0 && !this.answered) {
      e.preventDefault();
      this.choose(idx);
    } else if ((k === 'enter' || k === ' ') && this.answered && !(tag === 'BUTTON' && this.ownsTarget(target))) {
      e.preventDefault();
      this.next();
    }
  }
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
