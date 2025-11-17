import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-fun-fact-reveal',
  imports: [CommonModule, TranslateModule],
  templateUrl: './fun-fact-reveal.html',
  styleUrl: './fun-fact-reveal.scss',
})
export class FunFactReveal {
  @Input() funFactKey!: string;
  @Output() continue = new EventEmitter<void>();

  onContinue(): void {
    this.continue.emit();
  }
}
