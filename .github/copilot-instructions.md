# GitHub Copilot Instructions

## Project Overview

This is a **Jambiz Advent Calendar** - a front-end-only Angular application featuring 24 days of interactive Christmas challenges for Jambiz colleagues. The app is bilingual (Swedish/English) with a dark Christmas theme.

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
5. **spotTheDifference** - Image comparison
6. **rebus** - Visual word puzzles
7. **miniQuiz** - Multiple choice questions

Each challenge emits a `challengeCompleted` event upon successful completion.

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

- Mobile-first approach
- Test breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Ensure touch targets are minimum 44x44px

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
