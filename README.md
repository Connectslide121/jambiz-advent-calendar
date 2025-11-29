# 🎄 Jambiz Advent Calendar

An interactive Christmas advent calendar web application featuring 24 daily challenges, fun facts, and engaging minigames for Jambiz colleagues. Built with Angular and designed to bring holiday cheer with a mix of puzzles and games!

![Angular](https://img.shields.io/badge/Angular-20.3.0-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🎮 Diverse Challenge Types
- **Simple Puzzles:** Riddles, Hangman, Word Scramble, Word Search, Rebus
- **Complex Minigames:** 
  - 🎯 Geometry Dash (rhythm-based obstacle avoider)
  - 📦 Sokoban (box-pushing puzzles)
  - 🧗 Climber (vertical platform jumper)
  - 🎴 Memory Cards (Christmas-themed matching)
  - 🌀 Maze Runner (navigate procedural mazes)
  - 🛷 Flappy Sleigh (Flappy Bird style)

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
│   │       ├── riddle-challenge/
│   │       ├── hangman-challenge/
│   │       ├── word-scramble-challenge/
│   │       ├── word-search-challenge/
│   │       ├── rebus-challenge/
│   │       ├── memory-card-challenge/
│   │       ├── geometry-dash-challenge/
│   │       ├── sokoban-challenge/
│   │       ├── climber-challenge/
│   │       ├── flappy-sleigh-challenge/
│   │       └── maze-runner-challenge/
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

## 🎮 Challenge Types

### Simple Challenges
- **Riddle:** Solve text-based riddles
- **Hangman:** Guess the word letter by letter
- **Word Scramble:** Unscramble Christmas words
- **Word Search:** Find words in a grid
- **Rebus:** Decode emoji puzzles

### Minigames
- **Memory Cards:** Match pairs of Christmas icons (4x4, 6x6, 8x8 grids)
- **Geometry Dash:** Jump over obstacles in an auto-scrolling level
- **Sokoban:** Push gift boxes onto target spots
- **Climber:** Jump between platforms to reach the star
- **Flappy Sleigh:** Navigate through gaps (Flappy Bird style)
- **Maze Runner:** Find collectibles and reach the exit

### Endless Modes
- **Climber Infinite:** Climb forever, track best height and time
- **Flappy Sleigh Infinite:** Survive as long as possible
- **Geometry Dash Infinite:** Endless obstacle course

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
