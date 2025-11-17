import { CalendarDayConfig } from '../models/calendar.models';

export const CALENDAR_DAYS: CalendarDayConfig[] = [
  {
    day: 1,
    challengeType: 'riddle',
    funFactKey: 'funFacts.day1',
    challengeData: {
      riddleKey: 'challenges.riddle.day1.question',
      answerKey: ['candle', 'ljus', 'stearinljus'],
      hintKey: 'challenges.riddle.day1.hint',
    },
  },
  { day: 2, challengeType: 'hangman', funFactKey: 'funFacts.day2' },
  {
    day: 3,
    challengeType: 'wordScramble',
    funFactKey: 'funFacts.day3',
    challengeData: {
      word: 'snowflake',
      wordSv: 'snöflinga',
      clueKey: 'challenges.wordScramble.day3.clue',
      hintKey: 'challenges.wordScramble.day3.hint',
    },
  },
  {
    day: 4,
    challengeType: 'miniQuiz',
    funFactKey: 'funFacts.day4',
    challengeData: {
      questionKey: 'challenges.miniQuiz.day4.question',
      options: [
        { textKey: 'challenges.miniQuiz.day4.option1', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day4.option2', isCorrect: true },
        { textKey: 'challenges.miniQuiz.day4.option3', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day4.option4', isCorrect: false },
      ],
    },
  },
  {
    day: 5,
    challengeType: 'riddle',
    funFactKey: 'funFacts.day5',
    challengeData: {
      riddleKey: 'challenges.riddle.day5.question',
      answerKey: ['christmas tree', 'julgran', 'gran'],
    },
  },
  { day: 6, challengeType: 'rebus', funFactKey: 'funFacts.day6' },
  { day: 7, challengeType: 'wordSearch', funFactKey: 'funFacts.day7' },
  { day: 8, challengeType: 'hangman', funFactKey: 'funFacts.day8' },
  {
    day: 9,
    challengeType: 'miniQuiz',
    funFactKey: 'funFacts.day9',
    challengeData: {
      questionKey: 'challenges.miniQuiz.day9.question',
      options: [
        { textKey: 'challenges.miniQuiz.day9.option1', isCorrect: true },
        { textKey: 'challenges.miniQuiz.day9.option2', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day9.option3', isCorrect: false },
      ],
    },
  },
  { day: 10, challengeType: 'spotTheDifference', funFactKey: 'funFacts.day10' },
  {
    day: 11,
    challengeType: 'riddle',
    funFactKey: 'funFacts.day11',
    challengeData: {
      riddleKey: 'challenges.riddle.day11.question',
      answerKey: ['frostbite', 'frostbett', 'köldskada'],
    },
  },
  {
    day: 12,
    challengeType: 'wordScramble',
    funFactKey: 'funFacts.day12',
    challengeData: {
      word: 'reindeer',
      wordSv: 'ren',
      clueKey: 'challenges.wordScramble.day12.clue',
    },
  },
  { day: 13, challengeType: 'rebus', funFactKey: 'funFacts.day13' },
  { day: 14, challengeType: 'hangman', funFactKey: 'funFacts.day14' },
  {
    day: 15,
    challengeType: 'miniQuiz',
    funFactKey: 'funFacts.day15',
    challengeData: {
      questionKey: 'challenges.miniQuiz.day15.question',
      options: [
        { textKey: 'challenges.miniQuiz.day15.option1', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day15.option2', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day15.option3', isCorrect: true },
      ],
    },
  },
  { day: 16, challengeType: 'wordSearch', funFactKey: 'funFacts.day16' },
  {
    day: 17,
    challengeType: 'riddle',
    funFactKey: 'funFacts.day17',
    challengeData: {
      riddleKey: 'challenges.riddle.day17.question',
      answerKey: ['icicle', 'istapp'],
      hintKey: 'challenges.riddle.day17.hint',
    },
  },
  { day: 18, challengeType: 'spotTheDifference', funFactKey: 'funFacts.day18' },
  {
    day: 19,
    challengeType: 'wordScramble',
    funFactKey: 'funFacts.day19',
    challengeData: {
      word: 'gingerbread',
      wordSv: 'pepparkaka',
      clueKey: 'challenges.wordScramble.day19.clue',
    },
  },
  { day: 20, challengeType: 'hangman', funFactKey: 'funFacts.day20' },
  { day: 21, challengeType: 'rebus', funFactKey: 'funFacts.day21' },
  {
    day: 22,
    challengeType: 'miniQuiz',
    funFactKey: 'funFacts.day22',
    challengeData: {
      questionKey: 'challenges.miniQuiz.day22.question',
      options: [
        { textKey: 'challenges.miniQuiz.day22.option1', isCorrect: true },
        { textKey: 'challenges.miniQuiz.day22.option2', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day22.option3', isCorrect: false },
        { textKey: 'challenges.miniQuiz.day22.option4', isCorrect: false },
      ],
    },
  },
  { day: 23, challengeType: 'wordSearch', funFactKey: 'funFacts.day23' },
  {
    day: 24,
    challengeType: 'riddle',
    funFactKey: 'funFacts.day24',
    challengeData: {
      riddleKey: 'challenges.riddle.day24.question',
      answerKey: ['santa claus', 'santa', 'jultomten', 'tomten'],
      hintKey: 'challenges.riddle.day24.hint',
    },
  },
];
