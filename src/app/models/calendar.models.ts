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
}

export interface DayState {
  day: number;
  completed: boolean;
  completedAt?: Date;
}
