# Jambiz Advent Calendar - Project Plan

## 📋 Project Overview

A front-end-only Angular Christmas advent calendar web app with 24 daily challenges and fun facts for colleagues.

**Tech Stack:**
- Framework: Angular (latest)
- Language: TypeScript
- Styling: Tailwind CSS + SCSS
- i18n: ngx-translate (Swedish & English)
- Icons: Lucide icons
- State: localStorage (no backend)

---

## 🏗️ Architecture

### Component Hierarchy

```
AppComponent (root)
├── HeaderComponent (with language switcher)
└── CalendarComponent
    ├── DayTileComponent × 24
    └── ChallengeHostComponent (modal/panel)
        ├── [Dynamic Challenge Component]
        │   ├── RiddleChallengeComponent
        │   ├── HangmanChallengeComponent
        │   ├── WordScrambleChallengeComponent
        │   ├── WordSearchChallengeComponent
        │   ├── SpotTheDifferenceChallengeComponent
        │   ├── RebusChallengeComponent
        │   └── MiniQuizChallengeComponent
        └── FunFactRevealComponent
```

### Directory Structure

```
src/
├── app/
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── calendar.component.ts
│   │   │   ├── calendar.component.html
│   │   │   └── calendar.component.scss
│   │   ├── day-tile/
│   │   │   ├── day-tile.component.ts
│   │   │   ├── day-tile.component.html
│   │   │   └── day-tile.component.scss
│   │   ├── challenge-host/
│   │   │   ├── challenge-host.component.ts
│   │   │   ├── challenge-host.component.html
│   │   │   └── challenge-host.component.scss
│   │   ├── fun-fact-reveal/
│   │   │   ├── fun-fact-reveal.component.ts
│   │   │   ├── fun-fact-reveal.component.html
│   │   │   └── fun-fact-reveal.component.scss
│   │   └── challenges/
│   │       ├── riddle-challenge/
│   │       ├── hangman-challenge/
│   │       ├── word-scramble-challenge/
│   │       ├── word-search-challenge/
│   │       ├── spot-the-difference-challenge/
│   │       ├── rebus-challenge/
│   │       └── mini-quiz-challenge/
│   ├── config/
│   │   └── calendar-config.ts
│   ├── services/
│   │   └── calendar-state.service.ts
│   ├── models/
│   │   └── calendar.models.ts
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.component.scss
│   └── app.module.ts
├── assets/
│   ├── i18n/
│   │   ├── en.json
│   │   └── sv.json
│   └── images/
│       └── (challenge-specific images)
├── styles.scss
└── index.html
```

### Data Models

```typescript
// calendar.models.ts
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
```

### State Management

**CalendarStateService:**
- Track completed days
- Persist to localStorage
- Provide observables for state changes
- Methods: `markDayComplete()`, `isDayCompleted()`, `getCompletedDays()`

---

## 🎨 Design System

### Color Palette (CSS Variables in styles.scss)

```scss
:root {
  /* Colors */
  --color-bg: #06121f;           // Dark night blue
  --color-surface: #102437;      // Card background
  --color-accent-red: #e63946;   // Christmas red
  --color-accent-green: #2a9d8f; // Christmas green
  --color-gold: #f4d35e;         // Gold accent
  --color-text: #f8f9fa;         // Light text
  --color-text-muted: #adb5bd;   // Muted text

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
```

### Global Component Styles

Create reusable styles for buttons, forms, and inputs in `styles.scss`:

```scss
/* Base button styles */
.btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2;
  
  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}

.btn-primary {
  @apply bg-accent-red text-white hover:bg-opacity-90;
  @apply focus:ring-accent-red;
}

.btn-secondary {
  @apply bg-accent-green text-white hover:bg-opacity-90;
  @apply focus:ring-accent-green;
}

.btn-outline {
  @apply border-2 border-gold text-gold hover:bg-gold hover:text-bg;
  @apply focus:ring-gold;
}

/* Form inputs */
.input {
  @apply w-full px-4 py-2 rounded-lg;
  @apply bg-surface border border-gray-600 text-text;
  @apply focus:outline-none focus:ring-2 focus:ring-accent-red focus:border-transparent;
  @apply placeholder:text-gray-400;
  
  &:disabled {
    @apply opacity-50 cursor-not-allowed;
  }
}

/* Cards */
.card {
  @apply bg-surface rounded-xl p-6 shadow-lg;
  @apply border border-gray-700;
}

/* Modal overlay */
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center;
  @apply z-50 p-4;
}

.modal-content {
  @apply bg-surface rounded-2xl p-6 max-w-2xl w-full;
  @apply shadow-2xl border border-gray-700;
  @apply max-h-[90vh] overflow-y-auto;
}
```

### Tailwind Configuration

Extend Tailwind to use CSS variables for consistent theming:

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'accent-red': 'var(--color-accent-red)',
        'accent-green': 'var(--color-accent-green)',
        gold: 'var(--color-gold)',
        text: 'var(--color-text)',
      },
    },
  },
  plugins: [],
};
```

---

## 🗺️ Implementation Roadmap

### Phase 1: Project Setup & Core Infrastructure ✅ COMPLETED
- [x] Create Angular project structure
- [x] Install dependencies (Tailwind CSS, ngx-translate, Lucide icons)
- [x] Configure Tailwind CSS
- [x] Set up SCSS design system with CSS variables
- [x] Create global styles for buttons, forms, and inputs
- [x] Configure ngx-translate
- [x] Create translation files (en.json, sv.json)
- [x] Create data models and calendar configuration
- [x] Set up CalendarStateService

### Phase 2: Core Components
- [ ] Implement AppComponent with header and layout
- [ ] Create language switcher
- [ ] Implement CalendarComponent with grid layout
- [ ] Implement DayTileComponent
- [ ] Implement ChallengeHostComponent with dynamic loading
- [ ] Implement FunFactRevealComponent
- [ ] Add basic routing/modal logic for challenges

### Phase 3: Challenge Components - Batch 1
- [ ] RiddleChallengeComponent (text input, simple validation)
- [ ] MiniQuizChallengeComponent (multiple choice)
- [ ] WordScrambleChallengeComponent (drag & drop or text input)

### Phase 4: Challenge Components - Batch 2
- [ ] HangmanChallengeComponent (letter selection, visual hangman)
- [ ] WordSearchChallengeComponent (grid with word highlighting)
- [ ] RebusChallengeComponent (image + text input)

### Phase 5: Challenge Components - Batch 3
- [ ] SpotTheDifferenceChallengeComponent (clickable image areas)

### Phase 6: Content & Polish
- [ ] Create 24 challenge instances with real content
- [ ] Write 24 fun facts (Swedish & English)
- [ ] Complete all translations
- [ ] Add Lucide icons throughout
- [ ] Animations and transitions
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

### Phase 7: Testing & Deployment
- [ ] Cross-browser testing
- [ ] Mobile responsive testing
- [ ] localStorage edge cases
- [ ] Build production bundle
- [ ] Deploy to hosting (GitHub Pages, Netlify, etc.)

---

## ✅ Detailed Implementation Checklist

### Setup Tasks ✅ ALL COMPLETED
- [x] Run `ng new jambiz-advent-calendar --routing=false --style=scss`
- [x] Install Tailwind: `npm install -D tailwindcss postcss autoprefixer`
- [x] Run `npx tailwindcss init`
- [x] Install ngx-translate: `npm install @ngx-translate/core @ngx-translate/http-loader`
- [x] Install Lucide: `npm install lucide-angular`
- [x] Configure `tailwind.config.js`
- [x] Update `styles.scss` with design system
- [x] Import Tailwind directives in `styles.scss`

### Configuration Files

#### tailwind.config.js
```javascript
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'accent-red': 'var(--color-accent-red)',
        'accent-green': 'var(--color-accent-green)',
        gold: 'var(--color-gold)',
        text: 'var(--color-text)',
      },
    },
  },
  plugins: [],
}
```

#### app.module.ts - ngx-translate setup
```typescript
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  imports: [
    HttpClientModule,
    TranslateModule.forRoot({
      defaultLanguage: 'sv',
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ]
})
```

### Component Checklist

#### AppComponent
- [ ] Header with app title (translated)
- [ ] Language switcher (sv/en toggle)
- [ ] Main content area with CalendarComponent
- [ ] Background gradient/styling
- [ ] Lucide icons in header

#### CalendarComponent
- [ ] Import CALENDAR_DAYS config
- [ ] Inject CalendarStateService
- [ ] Create 24-day grid (CSS Grid or Tailwind grid)
- [ ] Render DayTileComponent for each day
- [ ] Handle day selection
- [ ] Show/hide ChallengeHostComponent
- [ ] Pass selected day config to challenge host
- [ ] Responsive layout (mobile: 4 cols, tablet: 6 cols, desktop: 6 cols)

#### DayTileComponent
- [ ] @Input() dayNumber
- [ ] @Input() completed
- [ ] @Output() daySelected
- [ ] Card styling (rounded, hover effects)
- [ ] Completed indicator (checkmark icon)
- [ ] Day number display
- [ ] Click handler
- [ ] Disabled state for future days (optional)

#### ChallengeHostComponent
- [ ] @Input() dayConfig: CalendarDayConfig
- [ ] @Output() close
- [ ] Dynamic component loading (ngComponentOutlet or ComponentFactoryResolver)
- [ ] Map challengeType to component class
- [ ] Handle (completed) event from challenge
- [ ] Show FunFactRevealComponent after completion
- [ ] Close button
- [ ] Modal/overlay styling

#### FunFactRevealComponent
- [ ] @Input() funFactKey: string
- [ ] Display translated fun fact
- [ ] Celebratory styling/animation
- [ ] Close/continue button

### Challenge Components Checklist

Each challenge component needs:
- [ ] @Output() completed = new EventEmitter<void>()
- [ ] Title/instructions (translated)
- [ ] Input method (text input, buttons, etc.)
- [ ] Validation logic
- [ ] Success state
- [ ] Emit completed event when solved
- [ ] Reset functionality

#### RiddleChallengeComponent
- [ ] Display riddle text (translated)
- [ ] Text input for answer
- [ ] Case-insensitive answer checking
- [ ] Submit button
- [ ] Success message
- [ ] Example: "I'm tall when I'm young, short when I'm old. What am I?" (Answer: "candle")

#### HangmanChallengeComponent
- [ ] Word to guess (from config)
- [ ] Letter buttons (A-Z)
- [ ] Display blanks/revealed letters
- [ ] Wrong guess counter
- [ ] Visual hangman representation (optional, or just counter)
- [ ] Win/lose conditions

#### WordScrambleChallengeComponent
- [ ] Display scrambled word
- [ ] Text input for answer
- [ ] Hint button (optional)
- [ ] Check answer (case-insensitive)

#### WordSearchChallengeComponent
- [ ] Generate/display letter grid
- [ ] List of words to find
- [ ] Click/drag to select letters
- [ ] Highlight found words
- [ ] Complete when all words found

#### SpotTheDifferenceChallengeComponent
- [ ] Display two images side-by-side
- [ ] Clickable difference areas
- [ ] Mark found differences
- [ ] Counter (e.g., "3 of 5 found")
- [ ] Complete when all found

#### RebusChallengeComponent
- [ ] Display rebus images/symbols
- [ ] Text input for answer
- [ ] Submit button
- [ ] Example: "🐝 + 🍃" = "Believe" (Bee + Leaf)

#### MiniQuizChallengeComponent
- [ ] Display question (translated)
- [ ] Render 3-4 answer options
- [ ] Radio buttons or clickable cards
- [ ] Check answer on selection
- [ ] Show correct/incorrect feedback

### Service Implementation

#### CalendarStateService
```typescript
@Injectable({ providedIn: 'root' })
export class CalendarStateService {
  private readonly STORAGE_KEY = 'jambiz-advent-completed-days';
  
  // Methods to implement:
  - getCompletedDays(): number[]
  - isDayCompleted(day: number): boolean
  - markDayComplete(day: number): void
  - clearAllProgress(): void (for testing)
  - Private: loadFromStorage()
  - Private: saveToStorage()
}
```

### Translation Keys Structure

#### en.json
```json
{
  "app": {
    "title": "Jambiz Christmas Advent Calendar",
    "subtitle": "One tiny challenge a day, one fun fact as a reward",
    "language": {
      "en": "English",
      "sv": "Swedish"
    }
  },
  "calendar": {
    "dayLabel": "Day {{day}}",
    "completed": "Completed",
    "locked": "Locked"
  },
  "challenges": {
    "riddle": {
      "title": "Riddle Challenge",
      "instruction": "Solve the riddle!",
      "placeholder": "Your answer...",
      "submit": "Submit",
      "correct": "Correct! Well done!",
      "incorrect": "Try again!"
    },
    "hangman": { /* ... */ },
    "wordScramble": { /* ... */ },
    // ... etc
  },
  "funFacts": {
    "day1": "Placeholder fun fact for day 1.",
    "day2": "Placeholder fun fact for day 2.",
    // ... up to day24
  },
  "ui": {
    "close": "Close",
    "continue": "Continue",
    "reset": "Reset"
  }
}
```

#### sv.json
```json
{
  "app": {
    "title": "Jambiz julkalender",
    "subtitle": "En liten utmaning om dagen, en rolig Jambiz-faktabit som belöning",
    "language": {
      "en": "Engelska",
      "sv": "Svenska"
    }
  },
  "calendar": {
    "dayLabel": "Dag {{day}}",
    "completed": "Klar",
    "locked": "Låst"
  },
  // ... mirror structure of en.json
}
```

### Calendar Configuration

#### calendar-config.ts
```typescript
export const CALENDAR_DAYS: CalendarDayConfig[] = [
  { day: 1, challengeType: 'riddle', funFactKey: 'funFacts.day1' },
  { day: 2, challengeType: 'hangman', funFactKey: 'funFacts.day2' },
  { day: 3, challengeType: 'wordScramble', funFactKey: 'funFacts.day3' },
  { day: 4, challengeType: 'miniQuiz', funFactKey: 'funFacts.day4' },
  { day: 5, challengeType: 'riddle', funFactKey: 'funFacts.day5' },
  { day: 6, challengeType: 'rebus', funFactKey: 'funFacts.day6' },
  { day: 7, challengeType: 'wordSearch', funFactKey: 'funFacts.day7' },
  { day: 8, challengeType: 'hangman', funFactKey: 'funFacts.day8' },
  { day: 9, challengeType: 'miniQuiz', funFactKey: 'funFacts.day9' },
  { day: 10, challengeType: 'spotTheDifference', funFactKey: 'funFacts.day10' },
  { day: 11, challengeType: 'riddle', funFactKey: 'funFacts.day11' },
  { day: 12, challengeType: 'wordScramble', funFactKey: 'funFacts.day12' },
  { day: 13, challengeType: 'rebus', funFactKey: 'funFacts.day13' },
  { day: 14, challengeType: 'hangman', funFactKey: 'funFacts.day14' },
  { day: 15, challengeType: 'miniQuiz', funFactKey: 'funFacts.day15' },
  { day: 16, challengeType: 'wordSearch', funFactKey: 'funFacts.day16' },
  { day: 17, challengeType: 'riddle', funFactKey: 'funFacts.day17' },
  { day: 18, challengeType: 'spotTheDifference', funFactKey: 'funFacts.day18' },
  { day: 19, challengeType: 'wordScramble', funFactKey: 'funFacts.day19' },
  { day: 20, challengeType: 'hangman', funFactKey: 'funFacts.day20' },
  { day: 21, challengeType: 'rebus', funFactKey: 'funFacts.day21' },
  { day: 22, challengeType: 'miniQuiz', funFactKey: 'funFacts.day22' },
  { day: 23, challengeType: 'wordSearch', funFactKey: 'funFacts.day23' },
  { day: 24, challengeType: 'riddle', funFactKey: 'funFacts.day24' },
];
```

---

## 🎯 Key Features & Functionality

### Language Switching
- Toggle button in header (flag icons or text)
- Use TranslateService.use('en' | 'sv')
- Persist preference in localStorage
- All text (challenges, UI, fun facts) should be translated

### Day Completion Tracking
- Store completed days in localStorage as JSON array
- Show visual indicator on completed days (checkmark icon)
- Prevent re-opening challenges (optional: allow replay)
- Progress counter in header (optional: "12/24 completed")

### Challenge Modal/Panel
- Overlay with semi-transparent background
- Centered modal on desktop, full-screen on mobile
- Close button (X icon)
- Smooth open/close animations
- Click outside to close (optional)

### Responsive Design
- Mobile: 3-4 columns, full-screen challenges
- Tablet: 4-6 columns
- Desktop: 6 columns, modal-style challenges
- Touch-friendly buttons and inputs

### Accessibility
- Semantic HTML (button, nav, main, article)
- ARIA labels for icons and interactive elements
- Keyboard navigation support
- Focus management (trap focus in modal)
- Screen reader friendly

---

## 🚀 Deployment Strategy

### Build
```bash
ng build --configuration production
```

### Hosting Options
1. **GitHub Pages** (free, simple)
   - Push to gh-pages branch
   - Enable in repo settings
   
2. **Netlify** (free, drag & drop)
   - Deploy dist folder
   - Auto HTTPS
   
3. **Azure Static Web Apps** (free tier available)
   - CI/CD integration
   - Custom domains

### Pre-deployment Checklist
- [ ] All translations complete
- [ ] All 24 challenges tested
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS, Android)
- [ ] Accessibility audit
- [ ] Performance optimization (lazy loading, image optimization)
- [ ] Error handling (missing translations, localStorage disabled)

---

## 📝 Content Strategy

### Fun Facts Ideas
- Jambiz company history milestones
- Team member achievements
- Office traditions
- Product/project highlights
- Industry insights
- Christmas trivia related to the company

### Challenge Content Ideas
- **Riddles:** Company-related or general Christmas riddles
- **Hangman:** Jambiz product names, team values, tech stack
- **Word Scramble:** Department names, project codenames
- **Quizzes:** Company trivia, tech knowledge, Christmas facts
- **Rebus:** Office locations, team mottos
- **Word Search:** Technologies used, team member names (with permission)
- **Spot the Difference:** Office photos, product screenshots

---

## 🔧 Development Tips

### Component Generation Commands
```bash
ng g c components/calendar
ng g c components/day-tile
ng g c components/challenge-host
ng g c components/fun-fact-reveal
ng g c components/challenges/riddle-challenge
ng g c components/challenges/hangman-challenge
# ... etc
ng g s services/calendar-state
```

### Development Workflow
1. Start with basic layout and navigation
2. Implement one challenge type completely (e.g., riddle)
3. Test the full flow: select day → complete challenge → see fun fact → close
4. Expand to other challenge types
5. Add real content iteratively
6. Polish and refine

### Testing Locally
- Use `ng serve` for hot reload
- Test localStorage in incognito mode
- Use browser DevTools to clear localStorage for testing
- Add a debug button to reset all progress (remove before deployment)

---

## 📊 Success Metrics (Optional)

If you add analytics later:
- Daily active users during December
- Average challenges completed per user
- Most/least popular challenge types
- Language preference distribution
- Peak usage times

---

## 🎄 Nice-to-Have Enhancements (Future)

- [ ] Sound effects (toggle-able)
- [ ] Snow animation background
- [ ] Share completion on social media
- [ ] Leaderboard (requires backend)
- [ ] Daily unlock (only show today's challenge)
- [ ] Easter eggs in certain challenges
- [ ] Dark/light mode toggle (already dark by default)
- [ ] Print-friendly version
- [ ] Download certificate when all 24 completed

---

## 📚 Resources & Documentation

- [Angular Documentation](https://angular.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [ngx-translate GitHub](https://github.com/ngx-translate/core)
- [Lucide Icons](https://lucide.dev/)
- [CSS Variables Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

---

## 📌 Notes & Decisions

### Why no state management library?
- Simple app with minimal state (just completed days)
- localStorage is sufficient
- Reduces bundle size and complexity

### Why front-end only?
- Easy deployment (static hosting)
- No server costs
- Instant load times
- Perfect for a fun internal tool

### Why ngx-translate instead of Angular i18n?
- Runtime language switching (no separate builds)
- Easier to add/edit translations
- Better for small apps with limited languages

---

**Last Updated:** 2025-11-17  
**Project Start:** 2025-11-17  
**Target Launch:** December 1, 2025

## Phase 1 Status: ✅ COMPLETE

**Completion Date:** November 17, 2025

**Notes:**
- Initial setup used Tailwind CSS v4 which had compatibility issues with Angular
- Downgraded to Tailwind CSS v3 for better Angular compatibility
- All core infrastructure files created and verified
- Development server running successfully at http://localhost:4200/
- No compilation errors
- Ready to proceed to Phase 2: Core Components

