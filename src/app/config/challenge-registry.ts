import { Type } from '@angular/core';
import { ChallengeType } from '../models/calendar.models';

/**
 * Lazy loaders for every game, so each one is only downloaded when its door is opened.
 * Every game shares the same contract: inputs config / isCompleted / day / levelId,
 * output completed.
 */
export const CHALLENGE_LOADERS: Record<ChallengeType, () => Promise<Type<unknown>>> = {
  juldle: () =>
    import('../components/challenges/juldle-challenge/juldle-challenge').then(
      (m) => m.JuldleChallenge
    ),
  emojiCarols: () =>
    import('../components/challenges/emoji-carols-challenge/emoji-carols-challenge').then(
      (m) => m.EmojiCarolsChallenge
    ),
  iceSlide: () =>
    import('../components/challenges/ice-slide-challenge/ice-slide-challenge').then(
      (m) => m.IceSlideChallenge
    ),
  nonogram: () =>
    import('../components/challenges/nonogram-challenge/nonogram-challenge').then(
      (m) => m.NonogramChallenge
    ),
  lightPath: () =>
    import('../components/challenges/light-path-challenge/light-path-challenge').then(
      (m) => m.LightPathChallenge
    ),
  giftMatch: () =>
    import('../components/challenges/gift-match-challenge/gift-match-challenge').then(
      (m) => m.GiftMatchChallenge
    ),
  treeLights: () =>
    import('../components/challenges/tree-lights-challenge/tree-lights-challenge').then(
      (m) => m.TreeLightsChallenge
    ),
  jingleBells: () =>
    import('../components/challenges/jingle-bells-challenge/jingle-bells-challenge').then(
      (m) => m.JingleBellsChallenge
    ),
  snowballToss: () =>
    import('../components/challenges/snowball-toss-challenge/snowball-toss-challenge').then(
      (m) => m.SnowballTossChallenge
    ),
  chimneyDrop: () =>
    import('../components/challenges/chimney-drop-challenge/chimney-drop-challenge').then(
      (m) => m.ChimneyDropChallenge
    ),
  snowmanStack: () =>
    import('../components/challenges/snowman-stack-challenge/snowman-stack-challenge').then(
      (m) => m.SnowmanStackChallenge
    ),
  tomteWhack: () =>
    import('../components/challenges/tomte-whack-challenge/tomte-whack-challenge').then(
      (m) => m.TomteWhackChallenge
    ),
  spotDifference: () =>
    import('../components/challenges/spot-difference-challenge/spot-difference-challenge').then(
      (m) => m.SpotDifferenceChallenge
    ),
  toySorter: () =>
    import('../components/challenges/toy-sorter-challenge/toy-sorter-challenge').then(
      (m) => m.ToySorterChallenge
    ),
};
