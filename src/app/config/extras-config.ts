import { ChallengeType } from '../models/calendar.models';

export interface ExtraLevel {
  id: string;
  nameKey: string;
  descriptionKey: string;
  challengeType: ChallengeType;
  challengeData: any;
}

export interface ExtraGameSection {
  type: string;
  levels: ExtraLevel[];
}

export const EXTRA_LEVELS: ExtraGameSection[] = [
  // Riddle Extras
  {
    type: 'riddle',
    levels: [
      {
        id: 'extra-riddle-1',
        nameKey: 'extras.games.riddle.levels.extra-riddle-1.name',
        descriptionKey: 'extras.games.riddle.levels.extra-riddle-1.description',
        challengeType: 'riddle',
        challengeData: {
          riddleKey: 'extras.games.riddle.extra-riddle-1.question',
          answerKey: ['gift', 'present', 'paket', 'julklapp'],
          hintKey: 'extras.games.riddle.extra-riddle-1.hint',
        },
      },
      {
        id: 'extra-riddle-2',
        nameKey: 'extras.games.riddle.levels.extra-riddle-2.name',
        descriptionKey: 'extras.games.riddle.levels.extra-riddle-2.description',
        challengeType: 'riddle',
        challengeData: {
          riddleKey: 'extras.games.riddle.extra-riddle-2.question',
          answerKey: ['chimney', 'skorsten'],
          hintKey: 'extras.games.riddle.extra-riddle-2.hint',
        },
      },
      {
        id: 'extra-riddle-3',
        nameKey: 'extras.games.riddle.levels.extra-riddle-3.name',
        descriptionKey: 'extras.games.riddle.levels.extra-riddle-3.description',
        challengeType: 'riddle',
        challengeData: {
          riddleKey: 'extras.games.riddle.extra-riddle-3.question',
          answerKey: ['sleigh bells', 'bells', 'bjällror', 'klockor'],
          hintKey: 'extras.games.riddle.extra-riddle-3.hint',
        },
      },
    ],
  },

  // Hangman Extras
  {
    type: 'hangman',
    levels: [
      {
        id: 'extra-hangman-1',
        nameKey: 'extras.games.hangman.levels.extra-hangman-1.name',
        descriptionKey: 'extras.games.hangman.levels.extra-hangman-1.description',
        challengeType: 'hangman',
        challengeData: {
          word: 'ornament',
          wordSv: 'julgransprydnad',
          clueKey: 'extras.games.hangman.extra-hangman-1.clue',
          hintKey: 'extras.games.hangman.extra-hangman-1.hint',
        },
      },
      {
        id: 'extra-hangman-2',
        nameKey: 'extras.games.hangman.levels.extra-hangman-2.name',
        descriptionKey: 'extras.games.hangman.levels.extra-hangman-2.description',
        challengeType: 'hangman',
        challengeData: {
          word: 'tinsel',
          wordSv: 'glitter',
          clueKey: 'extras.games.hangman.extra-hangman-2.clue',
          hintKey: 'extras.games.hangman.extra-hangman-2.hint',
        },
      },
      {
        id: 'extra-hangman-3',
        nameKey: 'extras.games.hangman.levels.extra-hangman-3.name',
        descriptionKey: 'extras.games.hangman.levels.extra-hangman-3.description',
        challengeType: 'hangman',
        challengeData: {
          word: 'wreath',
          wordSv: 'krans',
          clueKey: 'extras.games.hangman.extra-hangman-3.clue',
          hintKey: 'extras.games.hangman.extra-hangman-3.hint',
        },
      },
    ],
  },

  // Word Scramble Extras
  {
    type: 'wordScramble',
    levels: [
      {
        id: 'extra-scramble-1',
        nameKey: 'extras.games.wordScramble.levels.extra-scramble-1.name',
        descriptionKey: 'extras.games.wordScramble.levels.extra-scramble-1.description',
        challengeType: 'wordScramble',
        challengeData: {
          word: 'fireplace',
          wordSv: 'eldstad',
          clueKey: 'extras.games.wordScramble.extra-scramble-1.clue',
          hintKey: 'extras.games.wordScramble.extra-scramble-1.hint',
        },
      },
      {
        id: 'extra-scramble-2',
        nameKey: 'extras.games.wordScramble.levels.extra-scramble-2.name',
        descriptionKey: 'extras.games.wordScramble.levels.extra-scramble-2.description',
        challengeType: 'wordScramble',
        challengeData: {
          word: 'evergreen',
          wordSv: 'vintergrönt',
          clueKey: 'extras.games.wordScramble.extra-scramble-2.clue',
          hintKey: 'extras.games.wordScramble.extra-scramble-2.hint',
        },
      },
      {
        id: 'extra-scramble-3',
        nameKey: 'extras.games.wordScramble.levels.extra-scramble-3.name',
        descriptionKey: 'extras.games.wordScramble.levels.extra-scramble-3.description',
        challengeType: 'wordScramble',
        challengeData: {
          word: 'garland',
          wordSv: 'girlang',
          clueKey: 'extras.games.wordScramble.extra-scramble-3.clue',
          hintKey: 'extras.games.wordScramble.extra-scramble-3.hint',
        },
      },
    ],
  },

  // Memory Card Extras
  {
    type: 'memoryCard',
    levels: [
      {
        id: 'extra-memory-1',
        nameKey: 'extras.games.memoryCard.levels.extra-memory-1.name',
        descriptionKey: 'extras.games.memoryCard.levels.extra-memory-1.description',
        challengeType: 'memoryCard',
        challengeData: {
          gridSize: 4,
          icons: ['🎅', '⛄', '🎄', '🎁', '⭐', '🔔', '🕯️', '🦌'],
        },
      },
      {
        id: 'extra-memory-2',
        nameKey: 'extras.games.memoryCard.levels.extra-memory-2.name',
        descriptionKey: 'extras.games.memoryCard.levels.extra-memory-2.description',
        challengeType: 'memoryCard',
        challengeData: {
          gridSize: 6,
          icons: [
            '🎅',
            '⛄',
            '🎄',
            '🎁',
            '⭐',
            '🔔',
            '🕯️',
            '🦌',
            '❄️',
            '🎀',
            '🧦',
            '🍪',
            '🥛',
            '🎶',
            '🌟',
            '🎊',
            '🛷',
            '🧤',
          ],
        },
      },
      {
        id: 'extra-memory-3',
        nameKey: 'extras.games.memoryCard.levels.extra-memory-3.name',
        descriptionKey: 'extras.games.memoryCard.levels.extra-memory-3.description',
        challengeType: 'memoryCard',
        challengeData: {
          gridSize: 8,
          icons: [
            '🎅',
            '⛄',
            '🎄',
            '🎁',
            '⭐',
            '🔔',
            '🕯️',
            '🦌',
            '❄️',
            '🎀',
            '🧦',
            '🍪',
            '🥛',
            '🎶',
            '🌟',
            '🎊',
            '🛷',
            '🧤',
            '🎺',
            '🍬',
            '🎹',
            '☃️',
            '🌨️',
            '⛷️',
            '🏂',
            '🎿',
            '🧣',
            '🎩',
            '🕎',
            '🎗️',
            '🎐',
            '🎑',
          ],
        },
      },
    ],
  },

  // Geometry Dash Extras
  {
    type: 'geometryDash',
    levels: [
      {
        id: 'extra-dash-1',
        nameKey: 'extras.games.geometryDash.levels.extra-dash-1.name',
        descriptionKey: 'extras.games.geometryDash.levels.extra-dash-1.description',
        challengeType: 'geometryDash',
        challengeData: {
          levelLength: 1800,
          scrollSpeed: 200,
          jumpForce: 800,
          gravity: 2000,
          obstacles: [
            { x: 300, width: 40, height: 80, type: 'candy' },
            { x: 600, width: 80, height: 0, type: 'pit' },
            { x: 900, width: 40, height: 90, type: 'candy' },
            { x: 1200, width: 100, height: 60, type: 'platform' },
            { x: 1500, width: 40, height: 85, type: 'candy' },
          ],
        },
      },
      {
        id: 'extra-dash-2',
        nameKey: 'extras.games.geometryDash.levels.extra-dash-2.name',
        descriptionKey: 'extras.games.geometryDash.levels.extra-dash-2.description',
        challengeType: 'geometryDash',
        challengeData: {
          levelLength: 4000,
          scrollSpeed: 280,
          jumpForce: 800,
          gravity: 2000,
          obstacles: [
            { x: 350, width: 40, height: 85, type: 'candy' },
            { x: 600, width: 40, height: 95, type: 'candy' },
            { x: 850, width: 40, height: 110, type: 'ceilingCandy' },
            { x: 1100, width: 110, height: 0, type: 'pit' },
            { x: 1400, width: 40, height: 90, type: 'candy' },
            { x: 1650, width: 130, height: 60, type: 'platform' },
            { x: 1950, width: 40, height: 125, type: 'ceilingCandy' },
            { x: 2200, width: 40, height: 85, type: 'candy' },
            { x: 2450, width: 40, height: 100, type: 'candy' },
            { x: 2700, width: 130, height: 0, type: 'pit' },
            { x: 3000, width: 40, height: 130, type: 'ceilingCandy' },
            { x: 3250, width: 40, height: 95, type: 'candy' },
            { x: 3500, width: 120, height: 65, type: 'platform' },
            { x: 3750, width: 40, height: 100, type: 'candy' },
          ],
        },
      },
      {
        id: 'extra-dash-3',
        nameKey: 'extras.games.geometryDash.levels.extra-dash-3.name',
        descriptionKey: 'extras.games.geometryDash.levels.extra-dash-3.description',
        challengeType: 'geometryDash',
        challengeData: {
          levelLength: 5000,
          scrollSpeed: 320,
          jumpForce: 800,
          gravity: 2000,
          obstacles: [
            { x: 300, width: 40, height: 80, type: 'candy' },
            { x: 500, width: 40, height: 90, type: 'candy' },
            { x: 750, width: 40, height: 120, type: 'ceilingCandy' },
            { x: 1000, width: 100, height: 0, type: 'pit' },
            { x: 1300, width: 40, height: 85, type: 'candy' },
            { x: 1600, width: 140, height: 60, type: 'platform' },
            { x: 2000, width: 40, height: 130, type: 'ceilingCandy' },
            { x: 2300, width: 40, height: 90, type: 'candy' },
            { x: 2500, width: 40, height: 85, type: 'candy' },
            { x: 2800, width: 120, height: 0, type: 'pit' },
            { x: 3200, width: 40, height: 140, type: 'ceilingCandy' },
            { x: 3500, width: 40, height: 95, type: 'candy' },
            { x: 3800, width: 160, height: 65, type: 'platform' },
            { x: 4100, width: 40, height: 100, type: 'candy' },
            { x: 4400, width: 40, height: 150, type: 'ceilingCandy' },
            { x: 4600, width: 40, height: 90, type: 'candy' },
            { x: 4800, width: 100, height: 0, type: 'pit' },
          ],
        },
      },
    ],
  },

  // Rebus Extras
  {
    type: 'rebus',
    levels: [
      {
        id: 'extra-rebus-1',
        nameKey: 'extras.games.rebus.levels.extra-rebus-1.name',
        descriptionKey: 'extras.games.rebus.levels.extra-rebus-1.description',
        challengeType: 'rebus',
        challengeData: {
          rebusKey: 'extras.games.rebus.extra-rebus-1.puzzle',
          answerKey: ['santa claus', 'santa', 'jultomten', 'tomten'],
          hintKey: 'extras.games.rebus.extra-rebus-1.hint',
        },
      },
      {
        id: 'extra-rebus-2',
        nameKey: 'extras.games.rebus.levels.extra-rebus-2.name',
        descriptionKey: 'extras.games.rebus.levels.extra-rebus-2.description',
        challengeType: 'rebus',
        challengeData: {
          rebusKey: 'extras.games.rebus.extra-rebus-2.puzzle',
          answerKey: ['north pole', 'nordpolen'],
          hintKey: 'extras.games.rebus.extra-rebus-2.hint',
        },
      },
      {
        id: 'extra-rebus-3',
        nameKey: 'extras.games.rebus.levels.extra-rebus-3.name',
        descriptionKey: 'extras.games.rebus.levels.extra-rebus-3.description',
        challengeType: 'rebus',
        challengeData: {
          rebusKey: 'extras.games.rebus.extra-rebus-3.puzzle',
          answerKey: ['candy cane', 'polkagris'],
          hintKey: 'extras.games.rebus.extra-rebus-3.hint',
        },
      },
    ],
  },

  // Word Search Extras
  {
    type: 'wordSearch',
    levels: [
      {
        id: 'extra-wordsearch-1',
        nameKey: 'extras.games.wordSearch.levels.extra-wordsearch-1.name',
        descriptionKey: 'extras.games.wordSearch.levels.extra-wordsearch-1.description',
        challengeType: 'wordSearch',
        challengeData: {
          grid: [
            ['G', 'I', 'F', 'T', 'X', 'M', 'Q', 'Z', 'K', 'P'],
            ['V', 'B', 'N', 'W', 'Y', 'L', 'T', 'F', 'J', 'X'],
            ['J', 'H', 'Y', 'M', 'K', 'P', 'V', 'B', 'O', 'W'],
            ['Q', 'W', 'Z', 'X', 'L', 'T', 'Y', 'N', 'Y', 'K'],
            ['S', 'R', 'O', 'A', 'P', 'S', 'N', 'O', 'W', 'X'],
            ['E', 'L', 'F', 'Z', 'Q', 'W', 'M', 'K', 'Y', 'L'],
            ['S', 'T', 'A', 'S', 'T', 'A', 'R', 'P', 'X', 'T'],
          ],
          gridSv: [
            ['G', 'Å', 'V', 'A', 'X', 'M', 'Q', 'Z', 'K', 'P'],
            ['V', 'B', 'N', 'W', 'Y', 'L', 'T', 'F', 'D', 'X'],
            ['G', 'L', 'Ä', 'D', 'J', 'E', 'K', 'P', 'V', 'B'],
            ['Q', 'W', 'Z', 'X', 'L', 'T', 'Y', 'N', 'M', 'K'],
            ['S', 'N', 'Ö', 'P', 'F', 'D', 'V', 'B', 'X', 'M'],
            ['T', 'O', 'M', 'T', 'E', 'Q', 'W', 'M', 'K', 'Y'],
            ['S', 'T', 'J', 'Ä', 'R', 'N', 'A', 'V', 'B', 'L'],
          ],
          words: ['GIFT', 'JOY', 'SNOW', 'STAR', 'ELF'],
          wordsSv: ['GÅVA', 'GLÄDJE', 'SNÖ', 'STJÄRNA', 'TOMTE'],
        },
      },
      {
        id: 'extra-wordsearch-2',
        nameKey: 'extras.games.wordSearch.levels.extra-wordsearch-2.name',
        descriptionKey: 'extras.games.wordSearch.levels.extra-wordsearch-2.description',
        challengeType: 'wordSearch',
        challengeData: {
          grid: [
            ['P', 'H', 'E', 'S', 'A', 'R', 'C', 'X', 'P', 'Q', 'Z'],
            ['K', 'V', 'B', 'N', 'W', 'Y', 'H', 'T', 'R', 'D', 'P'],
            ['S', 'A', 'T', 'I', 'A', 'M', 'I', 'P', 'E', 'B', 'W'],
            ['Q', 'W', 'Z', 'S', 'A', 'N', 'M', 'A', 'S', 'K', 'V'],
            ['K', 'A', 'X', 'N', 'D', 'E', 'N', 'R', 'E', 'D', 'B'],
            ['R', 'E', 'I', 'N', 'D', 'E', 'E', 'R', 'N', 'D', 'B'],
            ['X', 'M', 'K', 'P', 'V', 'B', 'Y', 'Q', 'T', 'Y', 'L'],
            ['S', 'L', 'E', 'I', 'G', 'H', 'Z', 'M', 'T', 'T', 'X'],
            ['T', 'F', 'D', 'V', 'S', 'A', 'N', 'T', 'A', 'Q', 'Y'],
            ['C', 'H', 'I', 'M', 'N', 'E', 'Y', 'K', 'L', 'M', 'Z'],
            ['V', 'B', 'N', 'H', 'O', 'L', 'L', 'Y', 'P', 'T', 'F'],
          ],
          gridSv: [
            ['P', 'R', 'E', 'S', 'E', 'N', 'T', 'X', 'M', 'Q', 'Z'],
            ['K', 'V', 'B', 'N', 'W', 'Y', 'L', 'T', 'F', 'D', 'P'],
            ['T', 'O', 'M', 'T', 'E', 'N', 'M', 'K', 'P', 'V', 'B'],
            ['Q', 'W', 'Z', 'X', 'L', 'T', 'Y', 'N', 'M', 'K', 'V'],
            ['R', 'E', 'N', 'A', 'R', 'F', 'D', 'V', 'B', 'X', 'M'],
            ['X', 'M', 'K', 'P', 'V', 'B', 'N', 'Q', 'W', 'Y', 'L'],
            ['S', 'L', 'Ä', 'D', 'E', 'Z', 'M', 'K', 'T', 'X', 'P'],
            ['T', 'F', 'D', 'V', 'B', 'N', 'P', 'W', 'X', 'Q', 'Y'],
            ['S', 'K', 'O', 'R', 'S', 'T', 'E', 'N', 'L', 'M', 'Z'],
            ['K', 'R', 'I', 'S', 'T', 'O', 'R', 'N', 'V', 'B', 'F'],
          ],
          words: ['PRESENT', 'SANTA', 'REINDEER', 'SLEIGH', 'CHIMNEY', 'HOLLY'],
          wordsSv: ['PRESENT', 'TOMTEN', 'RENAR', 'SLÄDE', 'SKORSTEN', 'KRISTORN'],
        },
      },
      {
        id: 'extra-wordsearch-3',
        nameKey: 'extras.games.wordSearch.levels.extra-wordsearch-3.name',
        descriptionKey: 'extras.games.wordSearch.levels.extra-wordsearch-3.description',
        challengeType: 'wordSearch',
        challengeData: {
          grid: [
            ['X', 'Q', 'M', 'I', 'S', 'T', 'L', 'E', 'T', 'O', 'E', 'Z'],
            ['K', 'P', 'V', 'B', 'N', 'W', 'Y', 'L', 'T', 'F', 'D', 'M'],
            ['G', 'I', 'N', 'G', 'E', 'R', 'B', 'R', 'E', 'A', 'D', 'P'],
            ['W', 'Q', 'Z', 'X', 'M', 'E', 'V', 'B', 'N', 'Y', 'L', 'T'],
            ['W', 'R', 'E', 'A', 'T', 'A', 'F', 'D', 'P', 'W', 'X', 'Q'],
            ['V', 'B', 'N', 'M', 'K', 'T', 'L', 'Y', 'T', 'Z', 'F', 'D'],
            ['O', 'X', 'C', 'A', 'M', 'H', 'M', 'U', 'W', 'Q', 'V', 'B'],
            ['O', 'R', 'N', 'A', 'M', 'E', 'N', 'T', 'W', 'Q', 'V', 'B'],
            ['X', 'M', 'K', 'P', 'G', 'A', 'R', 'L', 'A', 'N', 'D', 'D'],
            ['Z', 'M', 'E', 'V', 'E', 'R', 'G', 'R', 'E', 'E', 'N', 'K'],
            ['V', 'B', 'N', 'L', 'Y', 'T', 'F', 'Q', 'W', 'X', 'P', 'V'],
            ['T', 'I', 'N', 'S', 'E', 'L', 'Y', 'B', 'N', 'M', 'K', 'F'],
          ],
          gridSv: [
            ['M', 'I', 'S', 'T', 'E', 'L', 'X', 'Q', 'Z', 'M', 'K', 'P'],
            ['K', 'P', 'V', 'B', 'N', 'W', 'Y', 'L', 'T', 'F', 'D', 'M'],
            ['P', 'E', 'P', 'P', 'A', 'R', 'K', 'A', 'K', 'A', 'V', 'B'],
            ['W', 'Q', 'Z', 'X', 'M', 'K', 'V', 'B', 'N', 'Y', 'L', 'T'],
            ['K', 'R', 'A', 'N', 'S', 'F', 'D', 'P', 'W', 'X', 'Q', 'M'],
            ['V', 'B', 'N', 'M', 'K', 'P', 'L', 'Y', 'T', 'Z', 'F', 'D'],
            ['P', 'R', 'Y', 'D', 'N', 'A', 'D', 'W', 'Q', 'V', 'B', 'N'],
            ['X', 'M', 'K', 'P', 'V', 'B', 'N', 'L', 'Y', 'T', 'F', 'D'],
            ['B', 'A', 'R', 'R', 'T', 'R', 'Ä', 'D', 'Z', 'M', 'K', 'P'],
            ['G', 'I', 'R', 'L', 'A', 'N', 'G', 'Q', 'W', 'X', 'P', 'V'],
            ['G', 'L', 'I', 'T', 'T', 'E', 'R', 'B', 'N', 'M', 'K', 'F'],
          ],
          words: [
            'MISTLETOE',
            'GINGERBREAD',
            'WREATH',
            'ORNAMENT',
            'EVERGREEN',
            'GARLAND',
            'TINSEL',
          ],
          wordsSv: ['MISTEL', 'PEPPARKAKA', 'KRANS', 'PRYDNAD', 'BARRTRÄD', 'GIRLANG', 'GLITTER'],
        },
      },
    ],
  },
];
