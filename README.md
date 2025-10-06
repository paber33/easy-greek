# 🇬🇷 Easy Greek - Spaced Repetition Learning App

A modern, production-ready web app for learning Greek vocabulary using an intelligent FSRS-lite (Free Spaced Repetition Scheduler) algorithm. Built with Next.js, TypeScript, and TailwindCSS.

## Features

### 📚 Smart Spaced Repetition
- **FSRS-lite Algorithm**: Advanced scheduler that maintains stability (S) and difficulty (D) metrics
- **Adaptive Learning**: Cards are scheduled based on memory retrievability and individual difficulty
- **Four Rating Levels**: Again (0), Hard (1), Good (2), Easy (3)
- **Learning Steps**: Graduated introduction of new cards with configurable intervals
- **Leech Detection**: Automatically identifies problematic cards after 8+ lapses

### 🎯 Core Screens

#### Word List
- Comprehensive table showing all vocabulary with:
  - Greek word and translation
  - Tags for organization
  - Status (new/learning/review/relearning)
  - Due date with smart formatting
  - Repetition count and lapse tracking
  - Success rate percentage
  - Stability (S) and Difficulty (D) metrics
- Add, edit, and reset individual cards
- Start training sessions directly

#### Training Session
- **Smart Queue Building**:
  - All due learning/relearning cards (time-critical)
  - Up to 120 due review cards (most overdue first)
  - Up to 10 new cards per day
- Clean card interface with front/back presentation
- Keyboard shortcuts: `Space` to show answer, `1-4` to rate
- Real-time progress indicator
- Due counter for remaining cards
- Comprehensive end-of-session summary

#### Session Log
- Historical performance tracking (last 30 days)
- Daily session summaries with:
  - Total reviewed, correct, incorrect counts
  - Accuracy percentage with visual bar
  - New/learning/review card breakdown
- Overall statistics:
  - Current streak counter 🔥
  - Total reviews all-time
  - Overall accuracy
  - Total sessions
- Simple bar chart visualization of last 7 days

#### Settings
- **SRS Configuration**:
  - Daily new cards limit (0-100)
  - Daily reviews limit (0-500)
  - Learning steps in minutes (customizable)
  - Target retrievability values for each rating
- **Data Management**:
  - Export cards to CSV
  - Import cards from CSV
  - Database statistics dashboard

### 🧠 FSRS-lite Algorithm Details

The app implements a lightweight version of the Free Spaced Repetition Scheduler:

#### Initial Values on Graduation
```
Good:  D = clamp(D - 0.2, 1, 10);  S = 2.5
Easy:  D = clamp(D - 0.5, 1, 10);  S = 4.0
Hard:  D = clamp(D + 0.3, 1, 10);  S = 1.5
```

#### Update Formulas
- **Retrievability**: `R(t) = exp(-t / S)` (memory strength at review time)
- **Difficulty Update**: Adjusted based on rating and retrievability
- **Stability Update**: Penalizes failures (×0.5), grows on success with difficulty-based scaling
- **Interval Calculation**: `-S' * Math.log(R*)` with ±15% jitter to avoid review clumping

#### Queue Building Strategy
1. All due learning/relearning cards (time-critical)
2. Due review cards sorted by:
   - Most overdue first
   - Lower retrievability (harder) second
3. New cards (FIFO or tag-balanced)

### 💾 Data Storage
- **localStorage-based**: No backend required
- **Auto-save**: Cards saved automatically on changes
- **Schema Migration**: Version tracking for future upgrades
- **Session Logging**: Daily summaries stored for 90 days
- **CSV Import/Export**: Portable data format

### 🎨 UI/UX Features
- Clean, modern TailwindCSS design
- Dark mode support (follows system preference)
- Responsive layout (mobile-friendly)
- Keyboard shortcuts for efficiency
- Visual status badges and progress indicators
- Color-coded card states

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd easy-greek
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
easy-greek/
├── app/
│   ├── page.tsx          # Main app with state management
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── WordList.tsx      # Word management interface
│   ├── TrainingSession.tsx  # Learning session UI
│   ├── SessionLog.tsx    # Performance history
│   └── Settings.tsx      # Configuration panel
├── lib/
│   ├── types.ts          # TypeScript interfaces
│   ├── constants.ts      # Configuration constants
│   ├── srs.ts            # FSRS-lite scheduler
│   ├── storage.ts        # localStorage utilities
│   └── mockData.ts       # Sample Greek vocabulary
└── README.md
```

## Usage Guide

### Adding Words
1. Click "Add Word" on the Word List screen
2. Enter Greek word, translation, and tags
3. Card will be marked as "new" and added to the queue

### Starting a Session
1. Click "Start Session" on the Word List
2. Review the Greek word on the front
3. Press `Space` or click "Show Answer"
4. Rate your recall:
   - **Again (1)**: Forgot completely
   - **Hard (2)**: Difficult to recall
   - **Good (3)**: Recalled with some effort
   - **Easy (4)**: Instantly recalled
5. Complete the session to see your summary

### Adjusting Settings
1. Navigate to Settings screen
2. Modify daily limits, learning steps, or target retrievability
3. Click "Save Settings"
4. Changes take effect immediately

### Importing/Exporting Data
**Export**: Click "Export to CSV" in Settings to download all cards

**Import CSV Format**:
```csv
id,greek,translation,tags
1,Γεια σου,Hello,greetings;basics
2,Ευχαριστώ,Thank you,greetings
```

## Configuration

### Default Settings
- **Daily New Cards**: 10
- **Daily Reviews**: 120
- **Learning Steps**: 1 min, 10 min
- **Target Retrievability**:
  - Again: 0.95 (short review)
  - Hard: 0.90
  - Good: 0.85
  - Easy: 0.80

### Customization
All settings can be adjusted in the Settings panel. Lower retrievability targets = longer intervals between reviews.

## Mock Data

The app ships with 18 sample Greek words across categories:
- Greetings (Γεια σου, Καλημέρα, etc.)
- Food (Ψωμί, Νερό, Κρασί, etc.)
- Verbs (Είμαι, Έχω, Θέλω, etc.)
- Nouns (Σπίτι, Οικογένεια, Αγάπη, etc.)

Some cards are pre-configured as "review" status to demonstrate the algorithm in action.

## Technical Details

### Technologies
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4
- **State Management**: React Hooks
- **Storage**: localStorage API

### Key Components
- `SRSScheduler`: Core algorithm implementation
- `buildQueue()`: Intelligent card selection
- `rate()`: Update card state based on user rating
- `computeRetrievability()`: Calculate memory strength

### Performance
- Client-side only (no API calls)
- Instant card updates
- Optimized for 1000+ cards
- Minimal re-renders with proper React patterns

## Future Enhancements

Potential features for future versions:
- Multiple-choice answer mode
- Audio pronunciation support
- Spaced repetition charts (detailed analytics)
- Tag-based filtering and deck creation
- Sync to cloud storage
- Mobile app (React Native)
- Shared decks marketplace

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License

MIT License - feel free to use this project for learning or production.

## Acknowledgments

- Inspired by Anki and SuperMemo
- FSRS algorithm by Jarrett Ye
- Greek language learning community

---

**Built with ❤️ for language learners**
