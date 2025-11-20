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
  | 'presentStacking';

export interface CalendarDayConfig {
  day: number;
  challengeType?: ChallengeType; // Optional for unpopulated days
  funFactKey: string;
  challengeData?: any; // Type varies by challenge type
  levelId?: string; // Unique ID for extras levels (for stats persistence)
}

export interface DayState {
  day: number;
  completed: boolean;
  completedAt?: Date;
}
