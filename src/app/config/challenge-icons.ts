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
  busses: '🚌',
  climber: '🧗',
  mazeRunner: '🌀',
  flappySleigh: '🛷',
  presentStacking: '🎄',
  giftCatcher: '🎁',
  slidingPuzzle: '🖼️',
  skiSlope: '⛷️',
  treeLights: '💡',
  jingleBells: '🔔',
};

export const DEFAULT_CHALLENGE_ICON = '🎁';
