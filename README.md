# 🎄 Jambiz Advent Calendar

An interactive Christmas advent calendar web application featuring 24 daily challenges, fun facts, and engaging minigames for Jambiz colleagues. Built with Angular and designed to bring holiday cheer with a mix of puzzles and games!

![Angular](https://img.shields.io/badge/Angular-20.3.0-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## 🌌 2026 Edition – "Nordic Christmas Night"

> The 2025 calendar is archived on the [`advent-2025`](../../tree/advent-2025) branch.

- **Living winter scene** – twinkling star canvas with shooting stars, animated aurora borealis, a moon (click it 🎅), parallax hills with pines and a cabin with flickering windows and chimney smoke, and depth-layered snow that drifts with the mouse. It pauses while a game is open so games keep the full frame budget.
- **String lights** – a swaying garland of twinkling bulbs across the top. Tap a bulb to ring it.
- **3D advent doors** – six hand-painted door designs that peek open on hover, swing open on click with a sparkle burst, shiver when locked, and stay ajar once completed to reveal the puzzle piece. Today's door glows and knocks.
- **Progress tree** – lights one ornament per completed day, from the bottom branches up to the star.
- **Synthesized sounds** – Web Audio bells and chimes (no audio files). Off by default, toggle in the header.
- **New games** – 💡 *Tree Lights* (lights-out on a Christmas tree, always solvable, exact hints) on day 20 and 🔔 *Bell Choir* (Simon-says with singing bells) on day 2.
- **Design system** – tokens in `src/styles.scss` (Fraunces + Nunito, cranberry / pine / candle-gold on midnight). All existing games inherit it through `.btn`, `.card`, `.input` and `.modal-*`.
- Storage version is `2026-dev`; bump `CALENDAR_VERSION` to `2026-release` on launch to wipe beta progress.
- Rewards and the puzzle image (`assets/Calendar_puzzle.png`) are still last year's placeholders.

## ✨ Features

### 🎮 Diverse Challenge Types
- **Simple Puzzles:** Riddles, Hangman, Word Scramble, Word Search, Rebus, Mini Quiz, Sliding Puzzle
- **Complex Minigames:** 
  - 🎯 Geometry Dash (rhythm-based obstacle avoider)
  - 📦 Sokoban (box-pushing puzzles)
  - 🧗 Climber (vertical platform jumper)
  - 🎴 Memory Cards (Christmas-themed matching)
  - 🌀 Maze Runner (navigate procedural mazes)
  - 🛷 Flappy Sleigh (Flappy Bird style)
  - 🎁 Gift Catcher (catch falling presents)
  - 🏗️ Present Stacking (physics-based stacking)
  - ⛷️ Ski Slope (downhill skiing avoider)

### 🎁 Extra Challenges
- **Bonus Levels:** Additional challenges beyond the 24 advent days
- **Endless Modes:** Infinite survival variants for Climber, Flappy Sleigh, and Geometry Dash
- **High Score Tracking:** Best scores persist across sessions using localStorage

### 🌍 Internationalization
- **Bilingual Support:** Full Swedish and English translations
- **Language Toggle:** Seamless switching between languages
- **Default Language:** Swedish (SV)

### 📱 Mobile-Optimized
- **Responsive Design:** Works perfectly on phones, tablets, and desktops
- **Touch Controls:** Virtual joystick, D-pad, and buttons for mobile gaming
- **Swipe Gestures:** Natural touch interactions for compatible games
- **Adaptive Layout:** 3/4/6 column grid adjusts to screen size

### 🎨 Design System
- **Dark Christmas Theme:** Rich blue, red, green, and gold color palette
- **Tailwind CSS:** Utility-first styling with custom design tokens
- **Smooth Animations:** Snow effects, card flips, transitions
- **Lucide Icons:** Modern, scalable iconography

### 💾 State Management
- **Progress Tracking:** Mark days as completed
- **Stats Persistence:** Save game statistics (moves, time, scores)
- **Replay Functionality:** Replay completed challenges without losing progress
- **localStorage:** Client-side state with no backend required
- **Version-Based Reset:** Automatic data reset when new version is deployed (clears beta tester data)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Connectslide121/jambiz-advent-calendar.git
   cd jambiz-advent-calendar
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200/`

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Angular 20.3.0** | Framework with standalone components |
| **TypeScript 5.9.2** | Type-safe development |
| **Tailwind CSS 3.4** | Utility-first styling |
| **ngx-translate 17** | Internationalization |
| **Lucide Icons** | SVG icon library |
| **SCSS** | Component-level styling |

## 📁 Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── calendar/              # Main calendar grid
│   │   ├── challenge-host/        # Modal for challenges
│   │   ├── extras-modal/          # Extra challenges menu
│   │   ├── fun-fact-reveal/       # Fun fact display
│   │   ├── touch-controls/        # Mobile game controls
│   │   └── challenges/            # Individual challenge components
│   │       ├── climber-challenge/
│   │       ├── flappy-sleigh-challenge/
│   │       ├── geometry-dash-challenge/
│   │       ├── gift-catcher-challenge/
│   │       ├── hangman-challenge/
│   │       ├── maze-runner-challenge/
│   │       ├── memory-card-challenge/
│   │       ├── mini-quiz-challenge/
│   │       ├── present-stacking-challenge/
│   │       ├── rebus-challenge/
│   │       ├── riddle-challenge/
│   │       ├── ski-slope-challenge/
│   │       ├── sliding-puzzle-challenge/
│   │       ├── sokoban-challenge/
│   │       ├── word-scramble-challenge/
│   │       └── word-search-challenge/
│   ├── config/
│   │   ├── calendar-config.ts     # 24 days configuration
│   │   └── extras-config.ts       # Extra levels configuration
│   ├── models/
│   │   └── calendar.models.ts     # TypeScript interfaces
│   ├── services/
│   │   ├── calendar-state.service.ts  # State management
│   │   ├── game.service.ts            # Game loop & utilities
│   │   ├── keyboard.service.ts        # Keyboard input
│   │   └── sprite.service.ts          # Sprite loading
│   └── app.ts                     # Root component
├── assets/
│   ├── i18n/                      # Translation files
│   │   ├── en.json
│   │   └── sv.json
│   └── sprites/                   # Game sprites
└── styles.scss                    # Global styles
```

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy

# Run tests
npm test

# Lint code
npm run lint
```

### Adding New Challenges

1. Generate component:
   ```bash
   ng generate component components/challenges/my-challenge --standalone
   ```

2. Add to `calendar-config.ts` or `extras-config.ts`

3. Update translations in `assets/i18n/en.json` and `assets/i18n/sv.json`

4. Import in `challenge-host.ts`

## 🌐 Deployment

The app is deployed to GitHub Pages at: `https://connectslide121.github.io/jambiz-advent-calendar/`

To deploy:
```bash
npm run deploy
```

## 📝 Configuration

### Calendar Days
Edit `src/app/config/calendar-config.ts` to customize the 24 advent challenges.

### Extra Levels
Edit `src/app/config/extras-config.ts` to add bonus challenges.

### Translations
Update `src/assets/i18n/en.json` and `src/assets/i18n/sv.json` for text content.

### Design System
Modify CSS variables in `src/styles.scss` for theming:

```scss
:root {
  --color-bg: #06121f;           // Dark night blue
  --color-surface: #102437;      // Card background
  --color-accent-red: #e63946;   // Christmas red
  --color-accent-green: #2a9d8f; // Christmas green
  --color-gold: #f4d35e;         // Gold accent
  --color-text: #f8f9fa;         // Light text
  --color-text-muted: #adb5bd;   // Muted text
}
```

### Version-Based Data Reset

The app includes a version-based reset mechanism to clear all user data when needed (e.g., clearing beta tester data before official launch).

**How it works:**
1. A `CALENDAR_VERSION` constant is defined in `CalendarStateService`
2. On app startup, the stored version is compared to the current version
3. If they don't match, all localStorage data is cleared automatically
4. The new version is saved

**To trigger a reset:**
1. Open `src/app/services/calendar-state.service.ts`
2. Change the `CALENDAR_VERSION` constant to a new value
3. Deploy the updated app

```typescript
// Example: Bump version to reset all data
private readonly CALENDAR_VERSION = '2025-release-v2';
```

### Secret Dev Tools

The app includes hidden developer tools for testing. Type **`devtools`** on your keyboard (not in an input field) to toggle visibility.

**Available tools:**
- Dev Mode Toggle (unlock all days)
- Date Override (fake December day)
- Mark All Complete
- Clear All Progress

> **Note:** Dev tools state is session-only and resets on page refresh.

## 🎯 Game Controls

### Desktop
- **Arrow Keys / WASD:** Movement
- **Space:** Jump / Flap / Action
- **Mouse:** Click to interact
- **ESC:** Pause (where applicable)

### Mobile
- **Tap:** Jump / Select
- **Swipe:** Directional movement (maze, Sokoban)
- **Virtual D-Pad:** 4-directional controls
- **Virtual Joystick:** Smooth directional input
- **Action Buttons:** Jump, interact

## 🤝 Contributing

This is an internal Jambiz project. For contributions:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Credits

**Developed for Jambiz AB**

- **Framework:** Angular Team
- **Design:** Tailwind CSS
- **Icons:** Lucide Icons
- **Translations:** ngx-translate

## 🐛 Known Issues

- Best score persistence requires levelId support (✅ Fixed in v1.1.0)
- Mobile touch controls may need calibration on some devices
- Safari iOS may require user interaction before audio (if added)

## 🔮 Future Enhancements

- [ ] Sound effects and background music (toggle-able)
- [ ] Daily unlock mechanism (one challenge per day) 
- [ ] Final event, last day unlock all daily rewards + extras menu
- [ ] More mini-games
- [ ] More endless mode variants
- [ ] Achievement badges
- [ ] Confetti animations on completion
- [ ] Final reward

---

**Happy Holidays! 🎅🎄🎁**
