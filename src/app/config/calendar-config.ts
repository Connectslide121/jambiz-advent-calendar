import { CalendarDayConfig } from '../models/calendar.models';

// Grid position mapping for shuffled calendar layout
// The days are arranged in a visually interesting pattern for the puzzle image reveal
// Grid is 6 columns x 4 rows = 24 positions (0-23)
// Position layout:
//  0  1  2  3  4  5
//  6  7  8  9 10 11
// 12 13 14 15 16 17
// 18 19 20 21 22 23

export const CALENDAR_DAYS: CalendarDayConfig[] = [
  {
    day: 1,
    gridPosition: 7, // Center area
    challengeType: 'riddle',
    reward: {
      type: 'video',
      videoUrl: 'rewards/day1.mp4',
      videoType: 'mp4',
      title: 'challenges.success.videoLabel',
    },
    challengeData: {
      riddleKey: 'challenges.riddle.day1.question',
      answerKey: ['candle', 'ljus', 'stearinljus'],
      hintKey: 'challenges.riddle.day1.hint',
    },
  },
  {
    day: 2,
    gridPosition: 18, // Bottom left
    challengeType: 'hangman',
    funFactKey: 'funFacts.day2',
    challengeData: {
      word: 'mistletoe',
      wordSv: 'mistel',
      clueKey: 'challenges.hangman.day2.clue',
      hintKey: 'challenges.hangman.day2.hint',
    },
  },
  {
    day: 3,
    gridPosition: 3, // Top center-right
    challengeType: 'wordScramble',
    reward: {
      type: 'audio',
      audioUrl: 'rewards/day3.mp3',
      audioType: 'mp3',
      title: 'rewards.day3.title',
      lyrics: 'rewards.day3.lyrics',
    },
    challengeData: {
      word: 'snowflake',
      wordSv: 'snöflinga',
      clueKey: 'challenges.wordScramble.day3.clue',
      hintKey: 'challenges.wordScramble.day3.hint',
    },
  },
  {
    day: 4,
    gridPosition: 14, // Bottom center
    challengeType: 'memoryCard',
    reward: {
      type: 'coupon',
      title: 'rewards.coupon.title',
      couponEmoji: '🧊',
      couponTitleKey: 'rewards.coupon.day4.title',
      couponDescriptionKey: 'rewards.coupon.day4.description',
      couponValidityKey: 'rewards.coupon.day4.validity',
    },
    challengeData: {
      gridSize: 4,
      icons: ['🎅', '⛄', '🎄', '🎁', '⭐', '🔔', '🕯️', '🦌'],
    },
  },
  {
    day: 5,
    gridPosition: 22, // Bottom right area
    challengeType: 'flappySleigh',
    funFactKey: 'funFacts.day5',
    challengeData: {
      levelLength: 3200,
      scrollSpeed: 200,
      flapForce: 350,
      gravity: 800,
      gapSize: 150,
      obstacleFrequency: 320,
    },
  },
  {
    day: 6,
    gridPosition: 1, // Top left area
    challengeType: 'rebus',
    funFactKey: 'funFacts.day6',
    challengeData: {
      rebusKey: 'challenges.rebus.day6.puzzle',
      answerKey: ['snowman', 'snögubbe'],
      hintKey: 'challenges.rebus.day6.hint',
    },
  },
  {
    day: 7,
    gridPosition: 11, // Middle right
    challengeType: 'wordSearch',
    funFactKey: 'funFacts.day7',
    challengeData: {
      grid: [
        ['S', 'N', 'O', 'W', 'B', 'A', 'L', 'L', 'X', 'M'],
        ['T', 'Q', 'P', 'W', 'Z', 'K', 'M', 'V', 'B', 'P'],
        ['A', 'L', 'I', 'G', 'H', 'T', 'S', 'Y', 'N', 'R'],
        ['R', 'M', 'X', 'Q', 'F', 'W', 'P', 'L', 'D', 'T'],
        ['Z', 'F', 'R', 'O', 'S', 'T', 'K', 'R', 'V', 'S'],
        ['K', 'V', 'B', 'N', 'M', 'Q', 'W', 'X', 'Y', 'F'],
        ['G', 'I', 'F', 'T', 'S', 'Z', 'L', 'P', 'T', 'T'],
      ],
      gridSv: [
        ['S', 'N', 'Ö', 'B', 'O', 'L', 'L', 'T', 'X', 'K'],
        ['T', 'Q', 'P', 'W', 'Z', 'K', 'M', 'O', 'V', 'R'],
        ['J', 'L', 'J', 'U', 'S', 'M', 'Q', 'M', 'B', 'W'],
        ['Ä', 'P', 'X', 'F', 'W', 'Y', 'N', 'T', 'L', 'Y'],
        ['R', 'Z', 'K', 'V', 'B', 'P', 'M', 'E', 'D', 'B'],
        ['N', 'M', 'Q', 'W', 'X', 'L', 'T', 'N', 'V', 'N'],
        ['A', 'G', 'Å', 'V', 'O', 'R', 'K', 'P', 'X', 'M'],
      ],
      words: ['SNOWBALL', 'LIGHTS', 'FROST', 'GIFTS', 'STAR'],
      wordsSv: ['SNÖBOLL', 'LJUS', 'TOMTEN', 'GÅVOR', 'STJÄRNA'],
    },
  },
  {
    day: 8,
    gridPosition: 20, // Bottom center
    challengeType: 'sokoban',
    funFactKey: 'funFacts.day8',
    challengeData: {
      // prettier-ignore
      level: [
        [[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],["W"],["W"],["W"],["W"],["W"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],["W"],[" "],[" "],[" "],["W"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],["W"],["B"],[" "],[" "],["W"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],["W"],["W"],["W"],[" "],[" "],["B"],["W"],["W"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],["W"],[" "],[" "],["B"],[" "],["B"],[" "],["W"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [["W"],["W"],["W"],[" "],["W"],[" "],["W"],["W"],[" "],["W"],[" "],[" "],[" "],["W"],["W"],["W"],["W"],["W"],["W"]],
        [["W"],[" "],[" "],[" "],["W"],[" "],["W"],["W"],[" "],["W"],["W"],["W"],["W"],["W"],[" "],[" "],["G"],["G"],["W"]],
        [["W"],[" "],["B"],[" "],[" "],["B"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],["G"],["G"],["W"]],
        [["W"],["W"],["W"],["W"],["W"],[" "],["W"],["W"],["W"],[" "],["W"],["P"],["W"],["W"],[" "],[" "],["G"],["G"],["W"]],
        [[" "],[" "],[" "],[" "],["W"],[" "],[" "],[" "],[" "],[" "],["W"],["W"],["W"],["W"],["W"],["W"],["W"],["W"],["W"]],
        [[" "],[" "],[" "],[" "],["W"],["W"],["W"],["W"],["W"],["W"],["W"],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
        [[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "],[" "]],
      ],
    },
  },
  {
    day: 9,
    gridPosition: 5, // Top right
    challengeType: 'geometryDash',
    challengeData: {
      difficulty: 'easy',
    },
    reward: {
      type: 'video',
      videoUrl: 'rewards/day19.mp4',
      videoType: 'mp4',
      title: 'challenges.success.videoLabel',
    },
  },
  {
    day: 10,
    gridPosition: 12, // Middle left
    challengeType: 'giftCatcher',
    funFactKey: 'funFacts.day10',
    challengeData: {
      targetScore: 15,
      spawnRate: 1000,
      speed: 3,
    },
  },
  {
    day: 11,
    gridPosition: 16, // Bottom center-right
    challengeType: 'hangman',
    reward: {
      type: 'coupon',
      title: 'rewards.coupon.title',
      couponEmoji: '🗣️',
      couponTitleKey: 'rewards.coupon.day11.title',
      couponDescriptionKey: 'rewards.coupon.day11.description',
    },
    challengeData: {
      word: 'stocking',
      wordSv: 'julstrumpa',
      clueKey: 'challenges.hangman.day8.clue',
      hintKey: 'challenges.hangman.day8.hint',
    },
  },
  {
    day: 12,
    gridPosition: 0, // Top left corner
    challengeType: 'wordScramble',
    funFactKey: 'funFacts.day12',
    challengeData: {
      word: 'reindeer',
      wordSv: 'ren',
      clueKey: 'challenges.wordScramble.day12.clue',
      hintKey: 'challenges.wordScramble.day12.hint',
    },
  },
  {
    day: 13,
    gridPosition: 9, // Center
    challengeType: 'rebus',
    funFactKey: 'funFacts.day13',
    challengeData: {
      rebusKey: 'challenges.rebus.day13.puzzle',
      answerKey: ['christmas', 'jul'],
      hintKey: 'challenges.rebus.day13.hint',
    },
  },
  {
    day: 14,
    gridPosition: 23, // Bottom right corner
    challengeType: 'riddle',
    reward: {
      type: 'snowGlobe',
      title: 'rewards.snowGlobe.title',
    },
    challengeData: {
      riddleKey: 'challenges.riddle.day17.question',
      answerKey: ['icicle', 'istapp'],
      hintKey: 'challenges.riddle.day17.hint',
    },
  },
  {
    day: 15,
    gridPosition: 4, // Top center-right
    challengeType: 'climber',
    funFactKey: 'funFacts.day15',
  },
  {
    day: 16,
    gridPosition: 19, // Bottom left-center
    challengeType: 'hangman',
    reward: {
      type: 'coupon',
      title: 'rewards.coupon.title',
      couponEmoji: '🃏',
      couponTitleKey: 'rewards.coupon.day16.title',
      couponDescriptionKey: 'rewards.coupon.day16.description',
    },
    challengeData: {
      word: 'sleigh',
      wordSv: 'släde',
      clueKey: 'challenges.hangman.day14.clue',
      hintKey: 'challenges.hangman.day14.hint',
    },
  },
  {
    day: 17,
    gridPosition: 10, // Middle center
    challengeType: 'wordSearch',
    funFactKey: 'funFacts.day17',
    challengeData: {
      grid: [
        ['C', 'A', 'N', 'D', 'Y', 'C', 'A', 'N', 'E', 'W'],
        ['Q', 'M', 'X', 'Z', 'K', 'P', 'V', 'B', 'L', 'L'],
        ['O', 'R', 'N', 'A', 'M', 'E', 'N', 'T', 'F', 'F'],
        ['W', 'T', 'Y', 'L', 'Q', 'Z', 'M', 'K', 'V', 'M'],
        ['R', 'E', 'I', 'N', 'D', 'E', 'E', 'R', 'B', 'P'],
        ['E', 'X', 'W', 'P', 'M', 'K', 'T', 'Q', 'N', 'R'],
        ['A', 'C', 'A', 'R', 'O', 'L', 'S', 'V', 'Y', 'T'],
        ['T', 'Z', 'L', 'M', 'N', 'P', 'R', 'W', 'X', 'K'],
        ['H', 'Q', 'V', 'B', 'F', 'D', 'K', 'Y', 'L', 'S'],
      ],
      gridSv: [
        ['P', 'O', 'L', 'K', 'A', 'G', 'R', 'I', 'S', 'M'],
        ['Q', 'M', 'X', 'Z', 'K', 'P', 'V', 'B', 'T', 'X'],
        ['K', 'R', 'A', 'N', 'S', 'W', 'Y', 'L', 'A', 'W'],
        ['L', 'T', 'Y', 'L', 'Q', 'Z', 'M', 'K', 'V', 'Q'],
        ['R', 'E', 'N', 'A', 'R', 'F', 'D', 'W', 'B', 'Z'],
        ['M', 'P', 'V', 'B', 'N', 'X', 'Q', 'Y', 'L', 'K'],
        ['J', 'U', 'L', 'S', 'Å', 'N', 'G', 'E', 'R', 'T'],
        ['P', 'Z', 'K', 'M', 'W', 'Q', 'V', 'X', 'L', 'N'],
        ['N', 'Ö', 'T', 'T', 'E', 'R', 'K', 'Y', 'B', 'M'],
      ],
      words: ['CANDYCANE', 'REINDEER', 'ORNAMENT', 'WREATH', 'CAROLS'],
      wordsSv: ['POLKAGRIS', 'RENAR', 'KRANS', 'JUL', 'JULSÅNGER', 'NÖTTER'],
    },
  },
  {
    day: 18,
    gridPosition: 6, // Middle left
    challengeType: 'mazeRunner',
    reward: {
      type: 'audio',
      audioUrl: 'rewards/day18.mp3',
      audioType: 'mp3',
      title: 'rewards.day18.title',
      lyrics: 'rewards.day18.lyrics',
    },
    challengeData: {
      rows: 21,
      cols: 21,
      collectibleCount: 5,
    },
  },
  {
    day: 19,
    gridPosition: 15, // Bottom center
    challengeType: 'wordScramble',
    funFactKey: 'funFacts.day9',
    challengeData: {
      word: 'gingerbread',
      wordSv: 'pepparkaka',
      clueKey: 'challenges.wordScramble.day19.clue',
      hintKey: 'challenges.wordScramble.day19.hint',
    },
  },
  {
    day: 20,
    gridPosition: 2, // Top center
    challengeType: 'hangman',
    funFactKey: 'funFacts.day20',
    challengeData: {
      word: 'nutcracker',
      wordSv: 'nötknäppare',
      clueKey: 'challenges.hangman.day20.clue',
      hintKey: 'challenges.hangman.day20.hint',
    },
  },
  {
    day: 21,
    gridPosition: 17, // Bottom right-center
    challengeType: 'rebus',
    reward: {
      type: 'magic8Ball',
      title: 'rewards.magic8Ball.title',
      answers: [
        'rewards.magic8Ball.answers.yes',
        'rewards.magic8Ball.answers.no',
        'rewards.magic8Ball.answers.maybe',
        'rewards.magic8Ball.answers.askAgain',
        'rewards.magic8Ball.answers.definitely',
        'rewards.magic8Ball.answers.unlikely',
        'rewards.magic8Ball.answers.santaSaysYes',
        'rewards.magic8Ball.answers.elfSaysNo',
      ],
    },
    challengeData: {
      rebusKey: 'challenges.rebus.day21.puzzle',
      answerKey: ['winter', 'vinter'],
      hintKey: 'challenges.rebus.day21.hint',
    },
  },
  {
    day: 22,
    gridPosition: 13, // Middle center-left
    challengeType: 'geometryDash',
    challengeData: {
      difficulty: 'medium',
    },
    funFactKey: 'funFacts.day22',
  },
  {
    day: 23,
    gridPosition: 8, // Middle center
    challengeType: 'wordSearch',
    funFactKey: 'funFacts.day23',
    challengeData: {
      grid: [
        ['B', 'E', 'L', 'L', 'S', 'X', 'Q', 'Z', 'M', 'L'],
        ['M', 'K', 'P', 'V', 'N', 'W', 'Y', 'L', 'T', 'P'],
        ['C', 'O', 'O', 'K', 'I', 'E', 'S', 'F', 'B', 'E'],
        ['H', 'Q', 'Z', 'M', 'R', 'K', 'V', 'W', 'X', 'A'],
        ['O', 'W', 'P', 'L', 'A', 'T', 'Y', 'N', 'Q', 'C'],
        ['L', 'X', 'M', 'I', 'R', 'A', 'C', 'L', 'E', 'E'],
        ['L', 'A', 'N', 'G', 'E', 'L', 'Z', 'P', 'W', 'L'],
        ['Y', 'Q', 'V', 'B', 'L', 'M', 'K', 'T', 'Y', 'K'],
        ['S', 'N', 'O', 'W', 'F', 'X', 'P', 'W', 'Z', 'T'],
      ],
      gridSv: [
        ['K', 'L', 'O', 'C', 'K', 'O', 'R', 'X', 'Q', 'G'],
        ['M', 'P', 'V', 'B', 'N', 'W', 'Y', 'L', 'T', 'E'],
        ['K', 'A', 'K', 'O', 'R', 'Z', 'M', 'F', 'K', 'L'],
        ['F', 'Q', 'W', 'P', 'I', 'X', 'V', 'B', 'Y', 'L'],
        ['R', 'M', 'K', 'U', 'N', 'D', 'E', 'R', 'Q', 'A'],
        ['I', 'X', 'V', 'B', 'P', 'M', 'Z', 'F', 'D', 'N'],
        ['D', 'Ä', 'N', 'G', 'E', 'L', 'K', 'Y', 'W', 'G'],
        ['W', 'Q', 'Z', 'M', 'V', 'B', 'N', 'P', 'X', 'E'],
        ['M', 'U', 'R', 'G', 'R', 'Ö', 'N', 'A', 'L', 'L'],
      ],
      words: ['BELLS', 'ANGEL', 'COOKIES', 'HOLLY', 'MIRACLE', 'PEACE', 'SNOW'],
      wordsSv: ['KLOCKOR', 'ÄNGEL', 'KAKOR', 'MURGRÖNA', 'UNDER', 'FRID', 'SNÖ'],
    },
  },
  {
    day: 24,
    gridPosition: 21, // Bottom center-right
    challengeType: 'presentStacking',
    reward: {
      type: 'video',
      videoUrl: 'rewards/day24.mp4',
      videoType: 'mp4',
      title: 'challenges.success.videoLabel',
    },
    challengeData: {
      targetHeight: 300,
      maxPresents: 12,
    },
  },
];
