export type ChallengeType =
  | 'riddle'
  | 'hangman'
  | 'wordScramble'
  | 'wordSearch'
  | 'spotTheDifference'
  | 'rebus'
  | 'miniQuiz';

export interface CalendarDayConfig {
  day: number;
  challengeType: ChallengeType;
  funFactKey: string;
  challengeData?: any; // Type varies by challenge type
}

export interface DayState {
  day: number;
  completed: boolean;
  completedAt?: Date;
}
