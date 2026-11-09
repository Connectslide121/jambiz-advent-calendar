export type ChallengeType =
  | 'juldle'
  | 'emojiCarols'
  | 'iceSlide'
  | 'nonogram'
  | 'lightPath'
  | 'giftMatch'
  | 'treeLights'
  | 'jingleBells'
  | 'snowballToss'
  | 'chimneyDrop'
  | 'snowmanStack'
  | 'tomteWhack'
  | 'spotDifference'
  | 'toySorter'
  | 'cryptogram'
  | 'giftPacking'
  | 'rooftopRunner'
  | 'christmasDetective'
  | 'cookieDecorator'
  | 'carolConductor'
  | 'snowGlobeJigsaw'
  | 'chimneySweeper'
  | 'gingerbreadBridge'
  | 'christmasEveEscape';

export type RewardType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'coupon'
  | 'snowGlobe'
  | 'magic8Ball'
  | 'popupCard'
  | 'fortuneCookie'
  | 'iceBreaker';

// How a text reward is laid out. 'plain' (the default) is a single paragraph, such as a fun fact.
export type TextRewardFormat = 'plain' | 'letter' | 'recipe' | 'jokes' | 'bingo';

export interface RewardConfig {
  type: RewardType;
  // For text rewards - translation key (the body; for recipes, jokes and bingo an optional intro).
  // Line breaks in the translation are kept; a blank line starts a new paragraph.
  textKey?: string;
  textFormat?: TextRewardFormat;
  signatureKey?: string; // Letter: sign-off under the body
  ingredients?: string[]; // Recipe: translation keys, one per ingredient
  steps?: string[]; // Recipe: translation keys, one per step (numbered)
  items?: string[]; // Jokes: one key per joke, setup and punchline split by a line break. Bingo: 9 squares
  // Shared by the interactive rewards: replaces the type's fixed instruction under the reward
  instructionKey?: string;
  // For image rewards
  imageUrl?: string;
  imageAlt?: string; // Translation key for alt text
  caption?: string; // Translation key for optional caption
  downloadable?: boolean; // If true, show download button for the image
  downloadFileName?: string; // Custom filename for download (without extension)
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
  // For Fortune Cookie
  fortunes?: string[]; // Array of translation keys for fortune messages
  // For Snow Globe
  wishes?: string[]; // Translation keys; shaking shows one at random under the globe
  // For Pop-up Card (each falls back to the shared rewards.popupCard.* text)
  cardCoverKey?: string; // On the closed cover
  cardMessageKey?: string; // Inside the lid
  cardGreetingKey?: string; // Along the bottom edge
  // For Ice Breaker
  topics?: string[]; // Array of translation keys for ice breaker topics
  iceBreakerTitleKey?: string; // Translation key for ice breaker title
  iceBreakerInstructionKey?: string; // Translation key for instruction
  iceBreakerEmoji?: string; // Replaces the 🧊 on the card
  iceBreakerButtonKey?: string; // Replaces "New topic"
  iceBreakerValidityKey?: string; // Replaces the small print under the button
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
