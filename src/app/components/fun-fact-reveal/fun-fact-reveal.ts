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

    // Prepare video URL if needed
    if (this.rewardType === 'video' && this.effectiveReward?.videoUrl) {
      this.prepareVideoUrl();
    }
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
