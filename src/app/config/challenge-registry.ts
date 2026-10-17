import { Type } from '@angular/core';
import { ChallengeType } from '../models/calendar.models';
import { RiddleChallenge } from '../components/challenges/riddle-challenge/riddle-challenge';
import { WordScrambleChallenge } from '../components/challenges/word-scramble-challenge/word-scramble-challenge';
import { HangmanChallenge } from '../components/challenges/hangman-challenge/hangman-challenge';
import { WordSearchChallenge } from '../components/challenges/word-search-challenge/word-search-challenge';
import { RebusChallenge } from '../components/challenges/rebus-challenge/rebus-challenge';
import { MemoryCardChallenge } from '../components/challenges/memory-card-challenge/memory-card-challenge';
import { GeometryDashChallenge } from '../components/challenges/geometry-dash-challenge/geometry-dash-challenge';
import { SokobanChallengeComponent } from '../components/challenges/sokoban-challenge/sokoban-challenge';
import { FlappySleighChallenge } from '../components/challenges/flappy-sleigh-challenge/flappy-sleigh-challenge';
import ClimberChallengeComponent from '../components/challenges/climber-challenge/climber-challenge';
import { MazeRunnerChallengeComponent } from '../components/challenges/maze-runner-challenge/maze-runner-challenge';
import { PresentStackingChallenge } from '../components/challenges/present-stacking-challenge/present-stacking-challenge';
import { GiftCatcherChallenge } from '../components/challenges/gift-catcher-challenge/gift-catcher-challenge';
import { SlidingPuzzleChallenge } from '../components/challenges/sliding-puzzle-challenge/sliding-puzzle-challenge';
import { SkiSlopeChallenge } from '../components/challenges/ski-slope-challenge/ski-slope-challenge';
import { BussesChallenge } from '../components/challenges/busses-challenge/busses-challenge';
import { TreeLightsChallenge } from '../components/challenges/tree-lights-challenge/tree-lights-challenge';
import { JingleBellsChallenge } from '../components/challenges/jingle-bells-challenge/jingle-bells-challenge';

/**
 * Maps each challenge type to its component.
 * Interim version: the 2025 games are being replaced by the new 2026 lineup.
 */
export const CHALLENGE_COMPONENTS: Record<ChallengeType, Type<unknown>> = {
  riddle: RiddleChallenge,
  wordScramble: WordScrambleChallenge,
  hangman: HangmanChallenge,
  wordSearch: WordSearchChallenge,
  rebus: RebusChallenge,
  memoryCard: MemoryCardChallenge,
  geometryDash: GeometryDashChallenge,
  sokoban: SokobanChallengeComponent,
  flappySleigh: FlappySleighChallenge,
  climber: ClimberChallengeComponent,
  mazeRunner: MazeRunnerChallengeComponent,
  presentStacking: PresentStackingChallenge,
  giftCatcher: GiftCatcherChallenge,
  slidingPuzzle: SlidingPuzzleChallenge,
  skiSlope: SkiSlopeChallenge,
  busses: BussesChallenge,
  treeLights: TreeLightsChallenge,
  jingleBells: JingleBellsChallenge,
};
