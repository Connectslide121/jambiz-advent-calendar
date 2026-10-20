import { Component, EventEmitter, OnDestroy, OnInit, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Info } from 'lucide-angular';
import { CalendarStateService } from '../../services/calendar-state.service';

type Phase = 'before' | 'advent' | 'christmas';

interface Countdown {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage implements OnInit, OnDestroy {
  @Input() signIn = false;
  @Input() error = '';
  @Output() start = new EventEmitter<void>();
  @Output() showInfo = new EventEmitter<void>();

  readonly Info = Info;
  readonly year = 2026;

  private state = inject(CalendarStateService);
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly phase = signal<Phase>('before');
  readonly today = signal(0);
  readonly countdown = signal<Countdown>({ days: '00', hours: '00', minutes: '00', seconds: '00' });

  ngOnInit(): void {
    this.update();
    this.timer = setInterval(() => this.update(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  onStart(): void {
    this.start.emit();
  }

  onShowInfo(): void {
    this.showInfo.emit();
  }

  private update(): void {
    const decemberDay = this.state.getEffectiveDecemberDay();
    if (decemberDay >= 25 || this.state.isChristmasDay()) {
      this.phase.set('christmas');
      return;
    }
    if (decemberDay >= 1) {
      this.phase.set('advent');
      this.today.set(decemberDay);
      return;
    }

    this.phase.set('before');
    const now = new Date();
    // January-November counts down to December 1st of this year
    const target = new Date('2026-12-01T00:00:00+01:00');
    const diff = Math.max(0, target.getTime() - now.getTime());
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.countdown.set({
      days: pad(Math.floor(diff / 86400000)),
      hours: pad(Math.floor((diff % 86400000) / 3600000)),
      minutes: pad(Math.floor((diff % 3600000) / 60000)),
      seconds: pad(Math.floor((diff % 60000) / 1000)),
    });
  }
}
