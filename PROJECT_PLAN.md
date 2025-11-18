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
        │   ├── Simple Challenges (Filler):
        │   │   ├── RiddleChallengeComponent
        │   │   ├── HangmanChallengeComponent
        │   │   ├── WordScrambleChallengeComponent
        │   │   ├── WordSearchChallengeComponent
        │   │   ├── RebusChallengeComponent
        │   │   └── MiniQuizChallengeComponent
        │   └── Complex Minigames (Mobile-Friendly):
        │       ├── GeometryDashChallengeComponent (rhythm-based obstacle course)
        │       ├── SokobanChallengeComponent (push boxes to targets)
        │       ├── ClimberChallengeComponent (climb to the top)
        │       ├── MemoryCardChallengeComponent (advanced Christmas-themed memory)
        │       └── MazeRunnerChallengeComponent (navigate Christmas maze)
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
  // Simple filler challenges
  | 'riddle'
  | 'hangman'
  | 'wordScramble'
  | 'wordSearch'
  | 'rebus'
  | 'miniQuiz'
  // Complex minigames (all mobile-friendly)
  | 'geometryDash'
  | 'sokoban'
  | 'climber'
  | 'memoryCard'
  | 'mazeRunner';

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

### Phase 2: Core Components ✅ COMPLETED
- [x] Implement AppComponent with header and layout
- [x] Create language switcher (single toggle button showing opposite language)
- [x] Add Jambiz logo with landscape orientation (h-16 w-32)
- [x] Add animated snowfall effect (100 snowflakes across entire page)
- [x] Convert all styling to Tailwind CSS utilities
- [x] Implement CalendarComponent with responsive grid (3/4/6 columns)
- [x] Implement day tiles with completion indicators (Lucide Check icon)
- [x] Implement ChallengeHostComponent with modal overlay
- [x] Implement fun fact display within ChallengeHost
- [x] Add modal logic with close/complete event handling
- [x] Integrate Lucide icons (Check, X)
- [x] Optimize mobile responsiveness
- [x] Set Jambiz logo as favicon

**Implementation Notes:**
- Calendar uses 3 columns on mobile, 4 on tablet (sm:), 6 on desktop (lg:)
- Day tiles have aspect-ratio, hover effects, and completion checkmarks
- ChallengeHost modal is full-screen on mobile, centered on desktop
- Snowflakes use fixed positioning with z-0 to appear behind content
- State persists via CalendarStateService with localStorage
- Fun facts display after challenge completion (demo mode currently)

### Phase 3: Challenge Components - Batch 1 ✅ COMPLETED
- [x] RiddleChallengeComponent (text input, simple validation)
- [x] MiniQuizChallengeComponent (multiple choice)
- [x] WordScrambleChallengeComponent (drag & drop or text input)

**Implementation Notes:**
- Created reusable challenge components with @Output() completed event
- Implemented dynamic component loading in ChallengeHost using ViewContainerRef
- Added translation keys for all challenge content (riddles, quiz questions, word scramble clues)
- Each challenge has proper validation, error handling, and responsive design
- Challenge data is stored in calendar-config.ts for easy content management
- Added hint functionality to riddle and word scramble challenges
- Quiz component supports 3-4 options with instant feedback and retry capability

### Phase 4: Challenge Components - Batch 2 ✅ COMPLETED
- [x] HangmanChallengeComponent (letter selection, visual hangman)
- [x] WordSearchChallengeComponent (grid with word highlighting)
- [x] RebusChallengeComponent (image + text input)

**Implementation Notes:**
- Created HangmanChallenge with SVG visual (6 wrong guess stages), Swedish alphabet support (Å, Ä, Ö), and language-aware word selection
- Created WordSearchChallenge with 2D grid array, mouse drag selection, 8-direction word finding, and visual feedback for found words
- Created RebusChallenge with emoji display via translation keys, text input, multi-answer validation, and hint support
- All three components support isCompleted input for replay mode with pre-filled answers
- Updated ChallengeHost to dynamically load all 6 challenge types
- Added complete translation keys for all new challenges in both English and Swedish
- Updated calendar-config.ts with sample data for days 2, 6, 7, 8, 13, 14, 16, 20, 21, 23
- All challenges use language variants (word/wordSv for hangman, grid/gridSv and words/wordsSv for word search)

### Phase 5: Complex Minigames - Foundation ✅ COMPLETED
- [x] Create shared game utilities service (collision detection, physics helpers)
- [x] Set up game loop infrastructure (requestAnimationFrame wrapper)
- [x] Create sprite manager service for shared assets
- [x] Set up sprite directory structure (player, obstacles, collectibles)
- [x] Create base game component with common features (pause, restart, timer)
- [x] Add keyboard input service for arrow keys, WASD, spacebar
- [x] **Add mobile touch controls** (virtual joystick, buttons)
- [x] Create responsive canvas sizing helper
- [x] Test mobile touch events and gestures

**Implementation Notes:**
- Created SpriteService for efficient sprite loading and caching with preload support
- Created GameService with game loop management, collision detection (rect/circle), physics helpers (gravity, friction, lerp), and mobile detection utilities
- Created KeyboardService for tracking pressed keys with helper methods for directional input and axis values
- Created TouchControlsComponent with virtual joystick (drag-based), jump button, and optional action button
- Touch controls auto-hide on desktop (lg: breakpoint), optimized for mobile touch with proper event handling
- All services use dependency injection (providedIn: 'root')
- Touch controls emit directionChange, jump, and action events for games to consume
- Ready for minigame implementation - all foundation infrastructure complete

### Phase 6: Complex Minigames - Batch 1 🎮
- [ ] **GeometryDashChallengeComponent** - Rhythm-based obstacle avoider
  - Auto-scrolling level with obstacles
  - Jump mechanic (spacebar/click/tap)
  - Collision detection with restart
  - Christmas-themed obstacles (candy canes, snowflakes)
  - **Mobile:** Tap anywhere to jump
  - Use shared player sprite
  - Beat level by reaching the end
  
- [ ] **SokobanChallengeComponent** - Box-pushing puzzle
  - Grid-based movement (arrow keys/WASD)
  - **Mobile:** Swipe gestures or virtual D-pad
  - Push gift boxes onto target spots
  - Undo move functionality
  - Multiple levels (easy to hard)
  - Win when all boxes on targets
  - Sprite-based rendering

### Phase 7: Complex Minigames - Batch 2 🎮
- [ ] **ClimberChallengeComponent** - Vertical climber
  - Jump between platforms to climb up
  - **Mobile:** Virtual left/right/jump buttons
  - Moving platforms, ice physics
  - Collectible ornaments (optional)
  - Reach the star at the top to win
  - Use shared player sprite
  - Christmas-themed platform graphics
  
- [ ] **MemoryCardChallengeComponent** - Advanced memory game
  - 4x4 or 6x6 grid of cards
  - **Mobile:** Touch-optimized card flipping
  - Christmas-themed icons/images
  - Flip two cards to match
  - Timer and move counter
  - Special cards with power-ups (peek, hint)
  - Responsive card sizing

### Phase 8: Complex Minigames - Batch 3 🎮
- [ ] **MazeRunnerChallengeComponent** - Navigate Christmas maze
  - Top-down view maze navigation
  - **Mobile:** Swipe gestures or virtual joystick
  - Arrow keys or WASD movement (desktop)
  - Collect 3 stars scattered in maze
  - Optional timer for speed challenge
  - Use shared player sprite
  - Christmas decorations as obstacles/walls
  - Touch-friendly navigation

### Phase 9: Content & Polish
- [ ] Distribute 24 challenges (19 simple filler + 5 complex minigames)
- [ ] Create optimal challenge difficulty curve
- [ ] Write 24 fun facts (Swedish & English)
- [ ] Complete all translations for minigames
- [ ] Add sound effects (optional, toggle-able)
- [ ] Fine-tune game difficulty and balance
- [ ] **Test all games on mobile devices** (iOS, Android)
- [ ] **Optimize touch controls** for each game
- [ ] Animations and transitions
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

### Phase 10: Testing & Deployment
- [ ] Test all 5 minigames on different devices
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] **Mobile responsive testing** (touch controls for games)
- [ ] **Test on various screen sizes** (phone, tablet, desktop)
- [ ] Performance optimization (game loop efficiency, sprite loading)
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

#### AppComponent ✅ COMPLETED
- [x] Header with app title (translated)
- [x] Language switcher (single toggle button showing opposite language code)
- [x] Main content area with CalendarComponent
- [x] Dark Christmas theme background
- [x] 100 animated snowflakes with staggered delays
- [x] Jambiz logo (landscape h-16 w-32) with favicon
- [x] Fully Tailwind-based styling

#### CalendarComponent ✅ COMPLETED
- [x] Import CALENDAR_DAYS config
- [x] Inject CalendarStateService
- [x] Create 24-day grid with Tailwind (grid-cols-3 sm:grid-cols-4 lg:grid-cols-6)
- [x] Render day tiles inline (no separate component needed)
- [x] Handle day selection (onDaySelected)
- [x] Show/hide ChallengeHostComponent modal
- [x] Pass selected day config to challenge host
- [x] Responsive layout (mobile: 3 cols, tablet: 4 cols, desktop: 6 cols)
- [x] Completion indicators with Lucide Check icon
- [x] Hover effects on day tiles

**Note:** DayTileComponent was not created as a separate component - day tiles are rendered inline within CalendarComponent template for simplicity.

#### ChallengeHostComponent ✅ COMPLETED
- [x] @Input() dayConfig: CalendarDayConfig
- [x] @Output() close
- [x] @Output() challengeCompleted
- [x] Modal overlay with responsive sizing (full-screen mobile, max-w-2xl desktop)
- [x] Close button with Lucide X icon
- [x] Challenge content area (currently demo placeholder)
- [x] Fun fact display after challenge completion
- [x] Click-outside-to-close functionality
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

**Simple Filler Challenges (Quick to implement, 5-10 min to solve):**

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

#### WordSearchChallengeComponent ✅ COMPLETED
- [x] Generate/display letter grid
- [x] List of words to find
- [x] Click/drag to select letters
- [x] Highlight found words
- [x] Complete when all words found
- [x] Touch support for mobile devices

#### RebusChallengeComponent ✅ COMPLETED
- [x] Display rebus images/symbols
- [x] Text input for answer
- [x] Submit button
- [x] Example: "🐝 + 🍃" = "Believe" (Bee + Leaf)

#### MiniQuizChallengeComponent ✅ COMPLETED
- [x] Display question (translated)
- [x] Render 3-4 answer options
- [x] Radio buttons or clickable cards
- [x] Check answer on selection
- [x] Show correct/incorrect feedback

---

## 🎮 Complex Minigame Specifications

### Shared Game Infrastructure

**SpriteService** - Manage shared game assets:
```typescript
@Injectable({ providedIn: 'root' })
export class SpriteService {
  // Sprite asset management
  private sprites = new Map<string, HTMLImageElement>();
  
  loadSprite(name: string, path: string): Promise<HTMLImageElement>;
  getSprite(name: string): HTMLImageElement | null;
  preloadCommonSprites(): Promise<void>;
  
  // Common sprites:
  // - player.png (shared character sprite)
  // - obstacle.png (generic obstacle)
  // - collectible.png (stars, ornaments)
  // - platform.png (platform tiles)
  // - box.png (for Sokoban)
}
```

**GameService** - Reusable game utilities:
```typescript
@Injectable({ providedIn: 'root' })
export class GameService {
  // Game loop management
  startGameLoop(callback: (deltaTime: number) => void): number;
  stopGameLoop(loopId: number): void;
  
  // Collision detection
  checkRectCollision(rect1, rect2): boolean;
  checkCircleCollision(circle1, circle2): boolean;
  
  // Physics helpers
  applyGravity(velocity, gravity, deltaTime): number;
  applyFriction(velocity, friction): number;
  
  // Mobile detection
  isMobileDevice(): boolean;
  isTouchDevice(): boolean;
  
  // Canvas helpers
  getResponsiveCanvasSize(container: HTMLElement): {width, height};
  scaleCanvasForRetina(canvas: HTMLCanvasElement): void;
}
```

**KeyboardService** - Handle keyboard input:
```typescript
@Injectable({ providedIn: 'root' })
export class KeyboardService {
  keysPressed: Set<string>;
  onKeyDown(key: string): void;
  onKeyUp(key: string): void;
  isPressed(key: string): boolean;
  clearAll(): void;
}
```

**TouchControlsComponent** - Reusable mobile controls:
```typescript
@Component({
  selector: 'app-touch-controls',
  // Virtual joystick, buttons, swipe detection
})
export class TouchControlsComponent {
  @Output() directionChange = new EventEmitter<{x, y}>();
  @Output() jump = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
  
  // Renders on-screen controls for mobile
  // Hidden on desktop (CSS media queries)
}
```

**BaseGameComponent** - Common game features:
- Canvas rendering setup with responsive sizing
- Pause/resume functionality
- Restart game logic
- Timer display
- Completion handling
- **Mobile touch controls integration**
- **Auto-detect device type** and show appropriate controls
- FPS counter (debug mode)

### Sprite Asset Structure

```
src/assets/sprites/
├── player.png          # Shared player character (already added)
├── obstacle.png        # Generic obstacle
├── platform.png        # Platform tile
├── collectible.png     # Star/ornament
├── box.png            # Sokoban box
├── target.png         # Sokoban target
├── wall.png           # Maze wall
└── christmas/
    ├── candy-cane.png
    ├── snowflake.png
    ├── tree.png
    └── gift.png
```

### Mobile-First Design Principles

**Touch Controls:**
- Virtual joystick for directional movement
- Large tap areas (min 44x44px)
- Swipe gestures for natural interactions
- Visual feedback on touch (highlight, ripple)

**Responsive Canvas:**
- Scale to container while maintaining aspect ratio
- Support both portrait and landscape
- Retina display optimization
- Max size constraints for performance

**Performance:**
- Limit particle effects on mobile
- Reduce sprite complexity on slower devices
- Target 60 FPS on modern phones, 30 FPS acceptable fallback
- Lazy load sprites only when needed

---

### 1. GeometryDash Challenge 🎮

**Concept:** Auto-scrolling obstacle avoider (simplified Geometry Dash)

**Gameplay:**
- Player character (shared sprite) moves right automatically
- Press SPACE, click, or **tap screen** to jump
- Avoid obstacles (candy canes, trees, ice spikes)
- Collect optional stars for bonus points
- Reach the finish line to win

**Technical Implementation:**
- Canvas-based rendering (responsive sizing)
- Fixed player X position, world scrolls left
- Gravity + jump physics
- Obstacle array with positions and types
- Collision detection (rectangle-based)
- Christmas theme: snowy background, festive obstacles
- **Mobile:** Full-screen tap to jump, no extra controls needed

**Config:**
```typescript
interface GeometryDashConfig {
  levelLength: number;        // Distance to finish
  obstacles: Obstacle[];      // Pre-defined obstacle positions
  scrollSpeed: number;        // Auto-scroll speed
  jumpForce: number;          // Jump velocity
  gravity: number;            // Gravity strength
}
```

**Difficulty:** Medium - Requires timing and quick reflexes
**Mobile Support:** ✅ Excellent - Simple tap controls

---

### 2. Sokoban Challenge 🎮

**Concept:** Classic box-pushing puzzle game

**Gameplay:**
- Grid-based puzzle (8x8 or 10x10)
- Push gift boxes onto target spots (X marks)
- Arrow keys/WASD (desktop) or **swipe gestures** (mobile)
- Can only push (not pull) boxes
- Can't push multiple boxes at once
- Undo button to reverse moves
- Win when all boxes on targets

**Technical Implementation:**
- 2D grid state management
- Arrow key / WASD movement (desktop)
- **Mobile:** Swipe detection or virtual D-pad
- Push logic (check adjacent cells)
- Undo stack (move history)
- Sprite-based rendering (box.png, target.png, player.png)
- CSS Grid or Canvas rendering
- Christmas theme: gift boxes, snowflake targets

**Config:**
```typescript
interface SokobanConfig {
  grid: number[][];          // 0=empty, 1=wall, 2=box, 3=target, 4=player
  width: number;
  height: number;
  minimumMoves?: number;     // Optional par score
}
```

**Difficulty:** Medium-Hard - Requires planning and spatial thinking
**Mobile Support:** ✅ Good - Swipe gestures feel natural

---

### 3. Climber Challenge 🎮

**Concept:** Vertical climbing game

**Gameplay:**
- Jump between platforms to climb upward
- Arrow keys to move left/right, SPACE to jump (desktop)
- **Mobile:** Virtual left/right/jump buttons overlay
- Some platforms move horizontally
- Ice platforms (slippery physics)
- Collectible ornaments (optional)
- Reach star at the top to win
- Fall off bottom = restart

**Technical Implementation:**
- Canvas rendering with camera following player
- Climber physics (gravity, jump, horizontal movement)
- Platform collision detection
- Moving platform logic
- Christmas theme: snowy platforms, festive background
- **Mobile:** Touch buttons (left, right, jump) in bottom corners
- Use shared player sprite

**Config:**
```typescript
interface ClimberConfig {
  platforms: Platform[];     // Position, width, type (static/moving/ice)
  playerStart: {x, y};
  goalPosition: {x, y};
  collectibles?: {x, y}[];
  worldHeight: number;
}
```

**Difficulty:** Medium - Classic climbing controls
**Mobile Support:** ✅ Good - Virtual buttons work well

---

### 4. Memory Card Challenge 🎮

**Concept:** Advanced Christmas memory matching game

**Gameplay:**
- Grid of face-down cards (4x4 or 6x6)
- **Tap/click to flip** two cards
- Match pairs of Christmas icons
- Timed challenge or move counter
- Special power-up cards (peek, hint, freeze timer)
- Win by matching all pairs

**Technical Implementation:**
- Card grid state (flipped, matched, type)
- Flip animation (CSS transform)
- Match validation logic
- Timer and move counter
- Power-up system
- Christmas theme: ornaments, snowflakes, trees, gifts
- **Mobile:** Touch-optimized card sizing (larger tap areas)
- DOM-based (no canvas needed)

**Config:**
```typescript
interface MemoryCardConfig {
  gridSize: number;          // 4 for 4x4, 6 for 6x6
  cardTypes: string[];       // Icon names or sprite references
  timeLimit?: number;        // Optional time limit
  powerUpsEnabled: boolean;
}
```

**Difficulty:** Easy-Medium - Accessible but engaging
**Mobile Support:** ✅ Excellent - Natural touch interaction

---

### 5. Maze Runner Challenge 🎮

**Gameplay:**
- Control Santa's sleigh with arrow keys
- Collect presents to grow longer
- Avoid hitting walls and yourself
- Snow-covered grid theme
- Win by collecting X presents (e.g., 10)
- Optional: speed increases with each gift

**Technical Implementation:**
- Grid-based movement (tick-based updates)
- Snake body as array of positions
- Food spawn logic
- Collision detection (self, walls)
- CSS Grid or Canvas rendering
- Christmas theme: sleigh head, present gifts, icy grid

**Config:**
```typescript
interface SnakeConfig {
  gridWidth: number;
  gridHeight: number;
  startingLength: number;
  targetScore: number;       // Gifts to collect
  speedIncrease: boolean;    // Speed up over time
  tickSpeed: number;         // Initial game speed (ms)
}
```

**Difficulty:** Easy-Medium - Classic, familiar gameplay

---

### 5. Memory Card Challenge 🎮

**Concept:** Advanced Christmas memory matching game

**Gameplay:**
- Grid of face-down cards (4x4 or 6x6)
- Click to flip two cards
- Match pairs of Christmas icons
- Timed challenge or move counter
- Special power-up cards (peek, hint, freeze timer)
- Win by matching all pairs

**Technical Implementation:**
- Card grid state (flipped, matched, type)
- Flip animation (CSS transform)
- Match validation logic
- Timer and move counter
- Power-up system
- Christmas theme: ornaments, snowflakes, trees, gifts

**Config:**
```typescript
interface MemoryCardConfig {
  gridSize: number;          // 4 for 4x4, 6 for 6x6
  cardTypes: string[];       // Icon names
  timeLimit?: number;        // Optional time limit
  powerUpsEnabled: boolean;
}
```

**Difficulty:** Easy-Medium - Accessible but engaging
**Mobile Support:** ✅ Excellent - Natural touch interaction

---

### 5. Maze Runner Challenge 🎮

**Concept:** Navigate Christmas maze and collect stars

**Gameplay:**
- Top-down maze view
- Arrow keys / WASD to move (desktop)
- **Mobile:** Swipe gestures or virtual joystick
- Collect 3 stars scattered in maze
- Optional: Timer for speed challenge
- Optional: Patrolling obstacles to avoid
- Christmas decorations as walls/obstacles

**Technical Implementation:**
- 2D grid-based maze
- Player movement with collision
- Star collection tracking
- Pathfinding for enemies (optional)
- Canvas or CSS Grid rendering
- Christmas theme: candy cane walls, snowy paths
- **Mobile:** Swipe detection or on-screen D-pad
- Use shared player sprite

**Config:**
```typescript
interface MazeConfig {
  maze: number[][];          // 0=path, 1=wall
  playerStart: {x, y};
  stars: {x, y}[];           // Star positions
  enemies?: {x, y, patrol}[]; // Optional
  timeLimit?: number;
}
```

**Difficulty:** Easy-Medium - Navigation and exploration
**Mobile Support:** ✅ Good - Swipe controls intuitive

---

## 🎯 5-Game Distribution Across 24 Days

**Recommended Mix:**

**Config:**
```typescript
interface MazeConfig {
  maze: number[][];          // 0=path, 1=wall
  playerStart: {x, y};
  stars: {x, y}[];           // Star positions
  enemies?: {x, y, patrol}[]; // Optional
  timeLimit?: number;
}
```

**Difficulty:** Easy-Medium - Navigation and exploration
**Mobile Support:** ✅ Good - Swipe controls intuitive

---

## 🎯 5-Game Distribution Across 24 Days

**Recommended Mix:**
- **19 simple filler challenges** - Quick puzzles (riddles, hangman, word games, quizzes)
- **5 complex minigames** - Spread throughout for variety and excitement

**Example Distribution:**
- Day 1: Riddle (easy start)
- Day 2: Word Scramble
- Day 3: Mini Quiz
- Day 4: **Memory Cards** 🎮 (first minigame - accessible)
- Day 5: Hangman
- Day 6: Rebus
- Day 7: Word Search
- Day 8: **Maze Runner** 🎮 (exploration)
- Day 9: Riddle
- Day 10: Mini Quiz
- Day 11: Word Scramble
- Day 12: **Sokoban** 🎮 (puzzle challenge)
- Day 13: Hangman
- Day 14: Rebus
- Day 15: Word Search
- Day 16: **Climber** 🎮 (action builds)
- Day 17: Riddle
- Day 18: Mini Quiz
- Day 19: Word Scramble
- Day 20: Hangman
- Day 21: **Geometry Dash** 🎮 (fast-paced finale)
- Day 22: Rebus
- Day 23: Word Search
- Day 24: Mini Quiz or special message

---

## 🎨 Game Design Guidelines

### Visual Consistency
- All games use Christmas color palette (red, green, gold, white, dark blue)
- **Shared sprite system** for common elements (player.png, etc.)
- Consistent UI elements (pause button, restart, timer)
- Smooth animations and transitions
- Festive particles and effects

### Controls - **Mobile-First Design**
- **Desktop:** Keyboard (arrows, WASD, space) + Mouse
- **Mobile:** Touch controls with on-screen buttons, swipe gestures
- Always show control instructions (adapt to device)
- Pause with ESC, P key, or tap pause button
- **Large touch targets** (min 44x44px)
- **Visual feedback** on all interactions

### Difficulty Balancing
- Each game should be beatable in 2-5 minutes
- Allow retries without penalty
- Optional "skip" after 3 failed attempts (still get fun fact)
- Progressive difficulty through the month
- **Mobile-optimized difficulty** (slightly easier on touch devices)

### Performance
- Target 60 FPS for all games on desktop
- Target 30-60 FPS on mobile devices
- Optimize canvas rendering
- Limit particle effects on mobile (detect device capability)
- Efficient collision detection
- **Lazy load sprites** only when needed
- **Responsive canvas sizing** (adapt to screen)

### Accessibility
- Color-blind friendly visuals
- Keyboard-only playable (desktop)
- **Touch-only playable (mobile)**
- Clear visual feedback
- Adjustable game speed (optional)
- Screen reader friendly UI text

---

## 🛠️ Implementation Priority

**Start with foundation:**
1. **SpriteService** - Load and manage shared sprites
2. **GameService** utilities
3. **KeyboardService**
4. **TouchControlsComponent** - Reusable mobile controls
5. **BaseGameComponent**

**Then build games in this order (easiest to hardest):**
1. **Memory Cards** - DOM-based, no physics, good mobile test
2. **Maze Runner** - Grid movement, sprite practice
3. **Sokoban** - Grid logic, state management
4. **Geometry Dash** - Physics, auto-scroller
5. **Climber** - Most complex, combines all concepts

---

## 🎨 Game Design Guidelines

### Visual Consistency
- All games use Christmas color palette (red, green, gold, white, dark blue)
- Consistent UI elements (pause button, restart, timer)
- Smooth animations and transitions
- Festive particles and effects

### Controls
- **Desktop:** Keyboard (arrows, WASD, space) + Mouse
- **Mobile:** Touch controls with on-screen buttons
- Always show control instructions
- Pause with ESC or P key

### Difficulty Balancing
- Each game should be beatable in 2-5 minutes
- Allow retries without penalty
- Optional "skip" after 3 failed attempts (still get fun fact)
- Progressive difficulty through the month

### Performance
- Target 60 FPS for all games
- Optimize canvas rendering
- Limit particle effects on mobile
- Efficient collision detection

### Accessibility
- Color-blind friendly visuals
- Keyboard-only playable
- Clear visual feedback
- Adjustable game speed (optional)

---

## 🛠️ Implementation Priority

**Start with foundation:**
1. GameService utilities
2. KeyboardService
3. BaseGameComponent

**Then build games in this order:**
1. **Snake** - Simplest, good for testing game loop
2. **Memory Cards** - No physics, DOM-based
3. **Maze Runner** - Grid movement practice
4. **Brick Breaker** - Physics practice
5. **Platformer** - Combines physics + collision
6. **Geometry Dash** - Auto-scroller mechanics
7. **Sokoban** - Complex state management
8. **Tower Defense** - Most complex, build last

---

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
  { day: 2, challengeType: 'wordScramble', funFactKey: 'funFacts.day2' },
  { day: 3, challengeType: 'miniQuiz', funFactKey: 'funFacts.day3' },
  { day: 4, challengeType: 'memoryCard', funFactKey: 'funFacts.day4' },
  { day: 5, challengeType: 'hangman', funFactKey: 'funFacts.day5' },
  { day: 6, challengeType: 'rebus', funFactKey: 'funFacts.day6' },
  { day: 7, challengeType: 'wordSearch', funFactKey: 'funFacts.day7' },
  { day: 8, challengeType: 'mazeRunner', funFactKey: 'funFacts.day8' },
  { day: 9, challengeType: 'riddle', funFactKey: 'funFacts.day9' },
  { day: 10, challengeType: 'miniQuiz', funFactKey: 'funFacts.day10' },
  { day: 11, challengeType: 'wordScramble', funFactKey: 'funFacts.day11' },
  { day: 12, challengeType: 'sokoban', funFactKey: 'funFacts.day12' },
  { day: 13, challengeType: 'hangman', funFactKey: 'funFacts.day13' },
  { day: 14, challengeType: 'rebus', funFactKey: 'funFacts.day14' },
  { day: 15, challengeType: 'wordSearch', funFactKey: 'funFacts.day15' },
  { day: 16, challengeType: 'climber', funFactKey: 'funFacts.day16' },
  { day: 17, challengeType: 'riddle', funFactKey: 'funFacts.day17' },
  { day: 18, challengeType: 'miniQuiz', funFactKey: 'funFacts.day18' },
  { day: 19, challengeType: 'wordScramble', funFactKey: 'funFacts.day19' },
  { day: 20, challengeType: 'hangman', funFactKey: 'funFacts.day20' },
  { day: 21, challengeType: 'geometryDash', funFactKey: 'funFacts.day21' },
  { day: 22, challengeType: 'rebus', funFactKey: 'funFacts.day22' },
  { day: 23, challengeType: 'wordSearch', funFactKey: 'funFacts.day23' },
  { day: 24, challengeType: 'miniQuiz', funFactKey: 'funFacts.day24' }, // Special finale message
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

### Detailed Responsive Requirements

**Calendar Grid Layout:**
- Mobile (< 640px): `grid-cols-3` - 3 columns for compact display
- Tablet (640px+): `sm:grid-cols-4` - 4 columns for better use of space
- Desktop (1024px+): `lg:grid-cols-6` - 6 columns for optimal viewing
- Gap: `gap-3 sm:gap-4 lg:gap-6` - Responsive spacing between tiles

**Day Tiles:**
- Size: Scale proportionally with grid
- Text: `text-base sm:text-lg lg:text-xl` for day numbers
- Padding: `p-4 sm:p-6 lg:p-8` - More padding on larger screens
- Touch target: Minimum 44x44px on mobile

**Header:**
- Layout: Stacked on mobile (`flex-col`), horizontal on tablet+ (`sm:flex-row`)
- Logo: `h-12 w-12 sm:h-16 sm:w-16` - Smaller on mobile
- Title: `text-2xl sm:text-3xl lg:text-4xl` - Responsive typography
- Language buttons: Fixed width (`w-24`) to prevent layout shift

**Challenge Modals:**
- Mobile: Full-screen (`w-full h-full`), no rounded corners
- Tablet+: Centered modal (`max-w-2xl lg:max-w-4xl`), rounded corners
- Padding: `p-4 sm:p-6 lg:p-8`
- Close button: Top-right, minimum 44x44px touch target

**Typography Scale:**
- Headings: `text-xl sm:text-2xl lg:text-3xl`
- Body: `text-sm sm:text-base lg:text-lg`
- Small text: `text-xs sm:text-sm`

**Spacing System:**
- Container padding: `px-4 sm:px-6 lg:px-8`
- Vertical spacing: `py-4 sm:py-6 lg:py-8`
- Gaps: `gap-2 sm:gap-3 lg:gap-4`

**Interactive Elements:**
- Buttons: Larger on mobile for touch (`py-3 px-4 sm:py-2 sm:px-3`)
- Input fields: Full width on mobile, constrained on desktop
- Form elements: Stack on mobile, inline on desktop where appropriate

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

**Minigame Themes:**
- **Memory Cards:** Match team members, office locations, or product icons
- **Maze Runner:** Navigate through "Jambiz HQ" themed maze
- **Sokoban:** Organize "project deliverables" puzzle
- **Climber:** Climb "career ladder" or "project timeline"
- **Geometry Dash:** Obstacle course representing company journey

---

## 🔧 Development Tips

### Component Generation Commands
```bash
# Simple challenges (already created)
ng g c components/challenges/riddle-challenge
ng g c components/challenges/hangman-challenge
ng g c components/challenges/word-scramble-challenge
ng g c components/challenges/word-search-challenge
ng g c components/challenges/rebus-challenge
ng g c components/challenges/mini-quiz-challenge

# Complex minigames
ng g c components/challenges/memory-card-challenge
ng g c components/challenges/maze-runner-challenge
ng g c components/challenges/sokoban-challenge
ng g c components/challenges/climber-challenge
ng g c components/challenges/geometry-dash-challenge

# Shared services
ng g s services/sprite
ng g s services/game
ng g s services/keyboard

# Shared component
ng g c components/shared/touch-controls
```

### Development Workflow
1. Build shared game infrastructure first (GameService, KeyboardService)
2. Start with simplest minigame (Snake) to test game loop
3. Build minigames in order of complexity
4. Test each game thoroughly before moving to next
5. Add real Jambiz-themed content and fun facts
6. Polish animations and transitions
7. Optimize performance

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

- [x] Snow animation background (already implemented!)
- [ ] Sound effects for games (toggle-able)
- [ ] Background music (Christmas theme, mute option)
- [ ] Share completion on social media
- [ ] Leaderboard for minigame scores (requires backend)
- [ ] Daily unlock (only show today's challenge)
- [ ] Easter eggs in certain challenges
- [ ] Achievements/badges system
- [ ] Game stats tracking (best times, high scores)
- [ ] Download certificate when all 24 completed
- [ ] Confetti animation on challenge completion

---

## 📚 Resources & Documentation

- [Angular Documentation](https://angular.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [ngx-translate GitHub](https://github.com/ngx-translate/core)
- [Lucide Icons](https://lucide.dev/)
- [CSS Variables Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [HTML Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [Game Loop Pattern](https://gameprogrammingpatterns.com/game-loop.html)

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

### Why Canvas for minigames?
- Better performance for animations and game loops
- Easier collision detection and physics
- Smoother 60 FPS rendering
- Fallback to DOM for simpler games (Memory Cards, Sokoban)

### Why ngx-translate instead of Angular i18n?
- Runtime language switching (no separate builds)
- Easier to add/edit translations
- Better for small apps with limited languages

---
