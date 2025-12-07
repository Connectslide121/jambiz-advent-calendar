import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule, Info } from 'lucide-angular';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  @Output() start = new EventEmitter<void>();
  @Output() showInfo = new EventEmitter<void>();

  readonly Info = Info;

  onStart(): void {
    this.start.emit();
  }

  onShowInfo(): void {
    this.showInfo.emit();
  }
}
