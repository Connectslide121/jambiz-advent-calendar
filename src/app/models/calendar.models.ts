export type ChallengeType =
  // Simple filler challenges
  | 'riddle'
  | 'hangman'
  | 'wordScramble'
  | 'wordSearch'
  | 'rebus'
  // Complex minigames (all mobile-friendly)
  | 'geometryDash'
  | 'sokoban'
  | 'climber'
  | 'memoryCard'
  | 'mazeRunner'
  | 'flappySleigh'
  | 'presentStacking'
  | 'giftCatcher'
  | 'slidingPuzzle'
  | 'skiSlope';

export type RewardType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'coupon'
  | 'snowGlobe'
  | 'magic8Ball'
  | 'popupCard';

export interface RewardConfig {
  type: RewardType;
  // For text rewards - translation key
  textKey?: string;
  // For image rewards
  imageUrl?: string;
  imageAlt?: string; // Translation key for alt text
  caption?: string; // Translation key for optional caption
  // For video rewards
  videoUrl?: string;
  videoType?: 'mp4' | 'webm' | 'youtube' | 'vimeo';
  videoPoster?: string; // Poster image URL
  videoCaption?: string; // Translation key for optional caption
  // For audio rewards
  audioUrl?: string;
  audioType?: 'mp3' | 'wav' | 'ogg';
  lyrics?: string; // Translation key for lyrics
  // For coupon rewards - silly redeemable vouchers (no persistence, just for fun)
  couponTitleKey?: string; // Translation key for coupon title
  couponDescriptionKey?: string; // Translation key for coupon description
  couponEmoji?: string; // Emoji to display on the coupon
  couponValidityKey?: string; // Translation key for validity text (e.g., "Valid until: End of holiday spirit")
  // For Magic 8-Ball
  answers?: string[]; // Array of translation keys for answers
  // Common optional properties
  title?: string; // Translation key for custom title (overrides default "Fun Fact")
}

export interface CalendarDayConfig {
  day: number;
  challengeType?: ChallengeType; // Optional for unpopulated days
  funFactKey?: string; // Legacy support for text-only rewards
  reward?: RewardConfig; // New flexible reward system
  challengeData?: any; // Type varies by challenge type
  levelId?: string; // Unique ID for extras levels (for stats persistence)
  gridPosition?: number; // Position in the shuffled grid (0-23), used for puzzle image reveal
}

export interface DayState {
  day: number;
  completed: boolean;
  completedAt?: Date;
}
