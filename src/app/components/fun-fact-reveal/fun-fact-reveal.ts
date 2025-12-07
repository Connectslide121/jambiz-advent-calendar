import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RewardConfig, RewardType } from '../../models/calendar.models';

@Component({
  selector: 'app-fun-fact-reveal',
  imports: [CommonModule, TranslateModule],
  templateUrl: './fun-fact-reveal.html',
  styleUrl: './fun-fact-reveal.scss',
})
export class FunFactReveal implements OnInit {
  // Legacy support - simple text key
  @Input() funFactKey?: string;
  // New reward config for flexible reward types
  @Input() reward?: RewardConfig;
  @Output() continue = new EventEmitter<void>();

  rewardType: RewardType = 'text';
  effectiveReward?: RewardConfig;
  safeVideoUrl?: SafeResourceUrl;

  // Snow Globe State
  snowflakes: Array<{
    id: number;
    left: number;
    top: number;
    size: number;
    speed: number;
    delay: number;
    chaosX: number;
    chaosY: number;
  }> = [];
  isShakingSnowGlobe = false;
  isSnowFalling = false;
  private snowSpawnerInterval: any = null;
  private snowIdCounter = 0;

  // Magic 8-Ball State
  isShaking8Ball = false;
  eightBallAnswer: string | null = null;
  showEightBallAnswer = false;

  // Pop-up Card State
  isCardOpen = false;
  isCardAnimating = false;

  // Fortune Cookie State
  isCookieCracked = false;
  isCookieCracking = false;
  fortuneMessage: string | null = null;

  // Ice Breaker State
  currentTopic: string | null = null;
  isSpinningTopic = false;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Determine the effective reward configuration
    if (this.reward) {
      this.effectiveReward = this.reward;
      this.rewardType = this.reward.type;
    } else if (this.funFactKey) {
      // Legacy support: convert funFactKey to text reward
      this.effectiveReward = {
        type: 'text',
        textKey: this.funFactKey,
      };
      this.rewardType = 'text';
    }

    // Initialize specific rewards
    if (this.rewardType === 'snowGlobe') {
      this.initSnowGlobe();
    }

    // Initialize ice breaker with a random topic
    if (this.rewardType === 'iceBreaker') {
      this.pickRandomTopic();
    }

    // Prepare video URL if needed
    if (this.rewardType === 'video' && this.effectiveReward?.videoUrl) {
      this.prepareVideoUrl();
    }
  }

  // Snow Globe Logic
  private initSnowGlobe(): void {
    this.snowflakes = [];
    // Start with snow settled at the bottom
    for (let i = 0; i < 80; i++) {
      this.snowflakes.push({
        id: this.snowIdCounter++,
        left: Math.random() * 100,
        top: 70 + Math.random() * 25,
        size: 2 + Math.random() * 4,
        speed: 4 + Math.random() * 6,
        delay: 0,
        chaosX: (Math.random() - 0.5) * 150,
        chaosY: (Math.random() - 0.5) * 150,
      });
    }
  }

  private spawnSnowflake(): void {
    const flake = {
      id: this.snowIdCounter++,
      left: Math.random() * 100,
      top: -5 - Math.random() * 10,
      size: 2 + Math.random() * 4,
      speed: 5 + Math.random() * 5,
      delay: 0,
      chaosX: 0,
      chaosY: 0,
    };
    this.snowflakes.push(flake);

    // Remove flake after it falls
    setTimeout(() => {
      const index = this.snowflakes.findIndex((f) => f.id === flake.id);
      if (index > -1) {
        this.snowflakes.splice(index, 1);
      }
    }, flake.speed * 1000 + 1000);
  }

  private startSnowSpawner(): void {
    if (this.snowSpawnerInterval) return;

    // Spawn snow continuously
    this.snowSpawnerInterval = setInterval(() => {
      // Spawn 2-4 flakes at a time
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        this.spawnSnowflake();
      }
    }, 100);
  }

  private stopSnowSpawner(): void {
    if (this.snowSpawnerInterval) {
      clearInterval(this.snowSpawnerInterval);
      this.snowSpawnerInterval = null;
    }
  }

  shakeSnowGlobe(): void {
    if (this.isShakingSnowGlobe) return;

    // Stop any existing spawner during shake
    this.stopSnowSpawner();

    this.isShakingSnowGlobe = true;
    this.isSnowFalling = false;

    // Shake phase - snow goes crazy
    setTimeout(() => {
      this.isShakingSnowGlobe = false;
      this.isSnowFalling = true;

      // Scatter existing snow to random positions for falling
      this.snowflakes = this.snowflakes.map((flake) => ({
        ...flake,
        top: Math.random() * 50,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));

      // Start spawning new snow - it will continue indefinitely
      this.startSnowSpawner();
    }, 600);
  }

  // Magic 8-Ball Logic
  shake8Ball(): void {
    if (this.isShaking8Ball) return;

    this.isShaking8Ball = true;
    this.showEightBallAnswer = false;

    setTimeout(() => {
      this.isShaking8Ball = false;
      this.showEightBallAnswer = true;
      this.pickRandomAnswer();
    }, 1000);
  }

  private pickRandomAnswer(): void {
    const answers = this.effectiveReward?.answers || [
      'rewards.magic8Ball.answers.yes',
      'rewards.magic8Ball.answers.no',
      'rewards.magic8Ball.answers.maybe',
    ];
    const randomIndex = Math.floor(Math.random() * answers.length);
    this.eightBallAnswer = answers[randomIndex];
  }

  // Pop-up Card Logic
  toggleCard(): void {
    if (this.isCardAnimating) return;

    this.isCardAnimating = true;
    this.isCardOpen = !this.isCardOpen;

    // Reset animating state after animation completes
    setTimeout(() => {
      this.isCardAnimating = false;
    }, 800);
  }

  // Fortune Cookie Logic
  crackCookie(): void {
    if (this.isCookieCracking || this.isCookieCracked) return;

    this.isCookieCracking = true;

    setTimeout(() => {
      this.isCookieCracking = false;
      this.isCookieCracked = true;
      this.pickRandomFortune();
    }, 600);
  }

  private pickRandomFortune(): void {
    const fortunes = this.effectiveReward?.fortunes || [
      'rewards.fortuneCookie.fortunes.fortune1',
      'rewards.fortuneCookie.fortunes.fortune2',
      'rewards.fortuneCookie.fortunes.fortune3',
    ];
    const randomIndex = Math.floor(Math.random() * fortunes.length);
    this.fortuneMessage = fortunes[randomIndex];
  }

  resetCookie(): void {
    this.isCookieCracked = false;
    this.fortuneMessage = null;
  }

  // Ice Breaker Logic
  spinForTopic(): void {
    if (this.isSpinningTopic) return;

    this.isSpinningTopic = true;

    setTimeout(() => {
      this.isSpinningTopic = false;
      this.pickRandomTopic();
    }, 600);
  }

  private pickRandomTopic(): void {
    const topics = this.effectiveReward?.topics || ['rewards.iceBreaker.topics.topic1'];
    const randomIndex = Math.floor(Math.random() * topics.length);
    this.currentTopic = topics[randomIndex];
  }

  private prepareVideoUrl(): void {
    if (!this.effectiveReward?.videoUrl) return;

    const url = this.effectiveReward.videoUrl;
    const videoType = this.effectiveReward.videoType;

    if (videoType === 'youtube') {
      // Convert YouTube URLs to embed format
      const videoId = this.extractYouTubeId(url);
      if (videoId) {
        this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`
        );
      }
    } else if (videoType === 'vimeo') {
      // Convert Vimeo URLs to embed format
      const videoId = this.extractVimeoId(url);
      if (videoId) {
        this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://player.vimeo.com/video/${videoId}`
        );
      }
    } else {
      // Direct video URLs (mp4, webm)
      this.safeVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
  }

  private extractYouTubeId(url: string): string | null {
    // Supports various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/,
      /^([\w-]{11})$/, // Just the ID
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  private extractVimeoId(url: string): string | null {
    // Supports various Vimeo URL formats
    const pattern = /(?:vimeo\.com\/)([\d]+)/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  }

  isEmbeddedVideo(): boolean {
    return (
      this.effectiveReward?.videoType === 'youtube' || this.effectiveReward?.videoType === 'vimeo'
    );
  }

  onContinue(): void {
    this.continue.emit();
  }
}
