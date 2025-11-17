import { Component, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

interface Snowflake {
  left: number;
  animationDuration: number;
  startY: number;
  fontSize: number;
  opacity: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, TranslateModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  currentLanguage: string;
  snowflakes: Snowflake[] = [];

  constructor(private translate: TranslateService) {
    // Initialize language from localStorage or default to Swedish
    const savedLang = localStorage.getItem('language') || 'sv';
    this.currentLanguage = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    this.generateSnowflakes();
  }

  switchLanguage(lang: string): void {
    this.currentLanguage = lang;
    this.translate.use(lang);
    localStorage.setItem('language', lang);
  }

  private generateSnowflakes(): void {
    const count = 30;
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        left: Math.random() * 100,
        animationDuration: 10 + Math.random() * 20,
        startY: -(Math.random() * 150),
        fontSize: 10 + Math.random() * 20,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }
  }
}
