# GitHub Copilot Instructions

## Project Overview

This is a **Jambiz Advent Calendar** - a front-end-only Angular application featuring 24 days of interactive Christmas challenges for Jambiz colleagues. The app is bilingual (Swedish/English) with a dark Christmas theme.

## Project Plan Tracking

**IMPORTANT**: This project has a detailed implementation roadmap in `PROJECT_PLAN.md` at the root of the repository.

- **Always check** `PROJECT_PLAN.md` before starting new work to understand the current phase and pending tasks
- **Update the checklist** in `PROJECT_PLAN.md` after completing features or components
- Mark tasks as complete with `[x]` and add implementation notes when finishing a phase
- The plan is organized in phases (Phase 1-7) with detailed checklists for each component
- Keep the plan synchronized with actual implementation progress

## Tech Stack

- **Angular 20.3.0** - Standalone components architecture
- **TypeScript 5.9.2** - Strict mode enabled
- **Tailwind CSS v3** - Utility-first styling with custom design system
- **ngx-translate v17** - Internationalization (Swedish default, English option)
- **localStorage** - Client-side state persistence
- **SCSS** - Component-level styling when needed
- **Lucide Icons** - Icon library

## Architecture Guidelines

### Component Structure

- Use **standalone components** (no modules)
- Use **signals** for reactive state where appropriate
- Keep components focused and single-purpose
- Use dependency injection for services

### Data Flow

- State managed via `CalendarStateService` (localStorage-backed)
- Challenge completion tracked with `Set<number>` for completed days
- Language preference stored in localStorage
- No backend - purely client-side application

### File Organization

```
src/app/
├── models/          # TypeScript interfaces and types
├── config/          # Configuration arrays and constants
├── services/        # Injectable services
├── components/      # Feature components (calendar, challenges, etc.)
└── app.ts/html/scss # Root component
```

## Styling Standards

### Use Tailwind CSS First

- **Always prefer Tailwind utility classes** over custom CSS
- Use responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Leverage Tailwind's design system (spacing, colors, etc.)

### Global Styles (styles.scss)

Use the predefined component classes:

- **Buttons**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`
- **Inputs**: `.input`
- **Cards**: `.card`
- **Modals**: `.modal-overlay`, `.modal-content`

### CSS Variables (Design System)

Reference these color variables in Tailwind config:

- `--color-bg`: #06121f (Dark night blue)
- `--color-surface`: #102437 (Card background)
- `--color-accent-red`: #e63946 (Christmas red)
- `--color-accent-green`: #2a9d8f (Christmas green)
- `--color-gold`: #f4d35e (Gold accent)
- `--color-text`: #f8f9fa (Light text)
- `--color-text-muted`: #adb5bd (Muted text)

### Component SCSS

- Keep component-specific SCSS minimal
- Use `@apply` directive sparingly
- Prefer Tailwind utilities in templates

## Code Patterns

### TypeScript

```typescript
// Use interfaces for data models
export interface CalendarDayConfig {
  day: number;
  challengeType: ChallengeType;
  funFactKey: string;
}

// Use union types for enums
export type ChallengeType =
  | 'riddle'
  | 'hangman'
  | 'wordScramble'
  | 'wordSearch'
  | 'spotTheDifference'
  | 'rebus'
  | 'miniQuiz';

// Use signals for reactive state
export class MyComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);
}
```

### Templates

```html
<!-- Use Tailwind utilities -->
<div class="flex items-center gap-4 p-4 bg-surface rounded-lg">
  <!-- Use global button classes -->
  <button class="btn btn-primary" (click)="handleClick()">
    {{ 'key.translation' | translate }}
  </button>

  <!-- Conditional classes with Angular bindings -->
  <button class="btn" [class.btn-primary]="isActive" [class.btn-outline]="!isActive"></button>
</div>
```

### Services

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly STORAGE_KEY = 'my-key';

  // Use localStorage for persistence
  private loadFromStorage(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    // ...
  }
}
```

## Translation Guidelines

### Translation Keys Structure

```json
{
  "app": { "title": "", "subtitle": "", "language": {} },
  "calendar": { "dayLabel": "", "locked": "" },
  "challenges": { "riddle": {}, "hangman": {} },
  "funFacts": { "day1": "", "day2": "" },
  "ui": { "close": "", "continue": "", "reset": "" }
}
```

### Usage in Templates

```html
{{ 'app.title' | translate }} {{ 'calendar.dayLabel' | translate: {day: dayNumber} }}
```

## Challenge Types

The calendar supports these challenge types:

1. **riddle** - Text-based riddles with answer validation
2. **hangman** - Word guessing game
3. **wordScramble** - Unscramble letters to form words
4. **wordSearch** - Find words in a grid
5. **rebus** - Visual word puzzles
6. **memoryCard** - Match pairs of Christmas icons
7. **geometryDash** - Rhythm-based obstacle avoider (minigame)
8. **sokoban** - Box-pushing puzzle (minigame)
9. **climber** - Vertical climbing platformer (minigame)
10. **mazeRunner** - Navigate Christmas maze (minigame)

Each challenge emits a `challengeCompleted` event upon successful completion.

### Challenge Replay Requirements

**IMPORTANT**: All challenges must support replay functionality:

- Users can replay any challenge, even after completing it
- Replaying does NOT revert completion status (day stays marked as completed)
- When replaying a completed challenge:
  - The challenge resets to its initial state
  - Game stats (moves, time, score) are NOT preserved during replay
  - After completing the replay, new stats replace old ones in localStorage
  - "Show Fun Fact" button should always be available when challenge is completed
- Use `CalendarStateService.saveGameStats(day, stats)` to persist game statistics
- Load saved stats when `isCompleted === true` to display historical performance
- Include a "Reset" or "Play Again" button for replay functionality

## Best Practices

### Performance

- Use `OnPush` change detection where appropriate
- Lazy load challenge components dynamically
- Minimize bundle size with tree-shaking

### Accessibility

- Include `aria-label` on interactive elements
- Ensure keyboard navigation works
- Maintain color contrast ratios
- Use semantic HTML

### Responsive Design

- **Mobile-first approach** - Always start with mobile layout, then enhance for larger screens
- **Breakpoints**:
  - Mobile: < 640px (default, no prefix)
  - Tablet: 640px+ (`sm:`)
  - Desktop: 1024px+ (`lg:`)
  - Wide: 1280px+ (`xl:`)
- **Touch targets**: Minimum 44x44px on mobile devices
- **Calendar Grid**:
  - Mobile: 3 columns
  - Tablet (sm:): 4 columns
  - Desktop (lg:): 6 columns
- **Header**:
  - Mobile: Stacked logo and language switcher
  - Tablet+: Horizontal layout with space-between
- **Modals/Challenges**:
  - Mobile: Full-screen overlay
  - Tablet+: Centered modal with max-width
- **Typography**: Use responsive text sizes (text-sm sm:text-base lg:text-lg)
- **Spacing**: Adjust padding/margins for different screen sizes
- **Images**: Use object-fit and responsive sizing (h-12 sm:h-16 lg:h-20)
- **Test on real devices**: iOS, Android, tablets, and various desktop sizes

### Testing

- Write unit tests for services and components
- Test localStorage persistence
- Test language switching
- Test challenge completion flow

## Common Tasks

### Creating a New Component

```bash
ng generate component components/my-component --standalone
```

### Adding a New Challenge Type

1. Add type to `ChallengeType` union in `models/calendar.models.ts`
2. Create challenge component in `components/challenges/`
3. Add translation keys to `en.json` and `sv.json`
4. Update `ChallengeHostComponent` dynamic loading logic
5. Add challenge instances to `calendar-config.ts`

### Adding Translations

1. Edit `src/assets/i18n/en.json`
2. Edit `src/assets/i18n/sv.json` (keep structure identical)
3. Use keys in templates: `{{ 'your.key' | translate }}`

## File Naming Conventions

- Components: `my-component.ts`, `my-component.html`, `my-component.scss`
- Services: `my-service.service.ts`
- Models: `my-model.models.ts`
- Configs: `my-config.ts`
- Use kebab-case for file names
- Use PascalCase for class names

## Git Workflow

- Commit Phase completions separately
- Use descriptive commit messages
- Keep commits focused and atomic

## Development Server

```bash
npm start  # Runs on http://localhost:4200
```

## Important Notes

- **No backend** - this is a purely client-side application
- **Swedish is default language** - English is secondary
- **December 1-24 only** - calendar represents advent period
- **Fun facts** reveal after challenge completion
- **State persists** via localStorage across sessions

## Version-Based Data Reset

The calendar includes a version-based reset mechanism to clear user data when needed (e.g., clearing beta tester data before official launch).

### How It Works

1. A `CALENDAR_VERSION` constant is defined in `CalendarStateService`
2. On app startup, the stored version is compared to the current version
3. If they don't match, all advent calendar localStorage data is cleared
4. The new version is saved to localStorage

### When to Update the Version

- **Before official launch**: Change version to clear beta tester data
- **New advent season**: Change version for next year's calendar
- **Breaking data changes**: When localStorage structure changes incompatibly

### ⚠️ IMPORTANT: Do NOT Change During Active Season

**Once the calendar is released (December 2025), do NOT modify `CALENDAR_VERSION` unless absolutely necessary.**

Changing it will **reset ALL user progress** including:

- Completed days
- Game stats and high scores
- Dev mode settings

The current release version is `'2025-release'`. Only change this if you intentionally want to wipe everyone's data.

### How to Trigger a Reset

1. Open `src/app/services/calendar-state.service.ts`
2. Change the `CALENDAR_VERSION` constant to a new value
3. Add a comment to the Version History documenting the change
4. Deploy the updated app

```typescript
// Example: Bump version to reset all data
private readonly CALENDAR_VERSION = '2025-release-v2';
```

### Version History

Maintain version history in the service file:

```typescript
/**
 * Version History:
 * - "2025-release": Official December 2025 launch (resets all beta tester data)
 * - "2025-release-v2": Fixed critical bug, needed data reset
 */
```

## Secret Dev Tools

The app includes hidden developer tools for testing purposes. These are not visible to regular users.

### How to Toggle Dev Tools

Type **`devtools`** on your keyboard (anywhere on the page, not in an input field) to toggle dev tools visibility.

### Features Available in Dev Tools

- **Dev Mode Toggle**: Unlocks all calendar days regardless of date
- **Date Override**: Set a fake December day (1-31) for testing day-based logic
- **Mark All Complete**: Instantly mark all challenges as completed
- **Clear All Progress**: Reset all progress and completion states

### Important Notes

- Dev tools state is **session-only** (not persisted to localStorage)
- Refreshing the page hides dev tools again
- The keyboard sequence is ignored when typing in input fields or textareas
- The sequence auto-resets after 3 seconds of inactivity
