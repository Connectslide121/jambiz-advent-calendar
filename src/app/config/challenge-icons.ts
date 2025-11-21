import { ChallengeType } from '../models/calendar.models';

export const CHALLENGE_ICONS: Record<ChallengeType, string> = {
  riddle: '🤔',
  hangman: '🔤',
  wordScramble: '🔀',
  wordSearch: '🔍',
  rebus: '🧩',
  memoryCard: '🃏',
  geometryDash: '🎅',
  sokoban: '🚚',
  climber: '🧗',
  mazeRunner: '🌀',
  flappySleigh: '🛷',
  presentStacking: '🎄',
  giftCatcher: '🎁',
};

export const DEFAULT_CHALLENGE_ICON = '🎁';
