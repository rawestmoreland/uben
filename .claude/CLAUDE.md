# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Üben** is a mobile-first German language learning app focused on mastering noun articles (der/die/das) and plurals through spaced repetition. The app uses the SM-2 algorithm to optimize vocabulary retention and supports user-generated content.

Built with:

- **Expo SDK 54** with the new architecture enabled
- **React 19** and **React Native 0.81.5**
- **Expo Router v6** for file-based routing with typed routes enabled
- **React Compiler** enabled for automatic memoization
- **expo-sqlite** for local-first data storage
- TypeScript with strict mode

The app uses a tab-based navigation structure and supports iOS, Android, and web platforms (though SQLite only works on iOS/Android).

## App Features

### Core Functionality

1. **Article Quiz** - Users practice identifying the correct article (der/die/das) for German nouns
2. **Spaced Repetition** - SM-2 algorithm schedules optimal review times based on user performance
3. **Progress Tracking** - Statistics, streaks, and success rates
4. **User-Generated Content** - Users can add their own nouns and verbs to the database
5. **A1-Level Focus** - Starting with beginner vocabulary, expandable to higher levels

### Learning Mechanics

- Response time tracking (fast = perfect, slow = needs work)
- Quality ratings (0-5) based on correctness and speed
- Adaptive intervals (1 day → 6 days → 2 weeks → 1 month+)
- Daily review sessions with mix of due cards and new cards
- Leech detection for words that don't stick

### Design Philosophy

- **Neo-brutalist UI**: Bold colors, thick borders, high contrast, geometric shapes
- **Offline-first**: All data stored on-device with SQLite, works without network
- **Optional cloud sync**: PocketBase backend for vocabulary updates (categories, nouns)
- **Fast & Simple**: Ship quickly, iterate based on feedback
- **Mobile-first**: Optimized for iOS/Android, web is secondary

## Development Commands

### Starting Development

```bash
npm install                # Install dependencies
npx expo start            # Start dev server with QR code
npm run ios               # Start on iOS simulator
npm run android           # Start on Android emulator
npm run web               # Start web development server (note: SQLite won't work)
```

### Code Quality

```bash
npm run lint              # Run ESLint with Expo config
```

### Project Management

```bash
npm run reset-project     # Move starter code to app-example/ and create blank app/
npm run pb:import         # Generate PocketBase import JSON from seed data
```

### PocketBase Backend (Optional)

```bash
cd database/pocketbase
make run                  # Start PocketBase locally (http://localhost:8080)
# Admin UI: http://localhost:8080/_/
# API: http://localhost:8080/api/
```

**See**: `.claude/rules/backend/pocketbase.md` for full documentation.

## Architecture

### Database Layer (SQLite)

**Location**: `/database/`

The app uses expo-sqlite for local data persistence:

#### Schema

- **nouns** - German nouns with articles, plurals, English translations, and CEFR level
- **verbs** - German verbs with conjugations and separable prefix flag
- **card_progress** - Spaced repetition tracking (ease factor, interval, repetitions)
- **review_history** - Historical review data for analytics
- **settings** - User preferences
- **data_versions** - Migration tracking for vocabulary updates

#### Key Files

- `database/db.ts` - Database initialization and singleton pattern
- `database/schema.sql` - Table definitions
- `database/migrations/` - Migration files (versioned)
- `database/seeds/` - Vocabulary data (A1 nouns to start)

#### Important Notes

- SQLite works on iOS/Android only, NOT on web
- Use prepared statements (parameterized queries) to prevent SQL injection
- UNIQUE constraint on (german, article) prevents duplicates
- `is_user_added` flag distinguishes user content from pre-loaded vocabulary
- `remote_id` column stores deterministic PocketBase IDs for sync matching

### PocketBase Backend (Optional)

**Location**: `/database/pocketbase/`

Optional Go backend for vocabulary sync. The app works fully offline without it.

#### Collections

- **categories** - Vocabulary categories (people, animals, home, etc.)
- **nouns** - German nouns with articles, plurals, translations
- **users** (built-in) - For future user accounts (Phase 2+)

#### What Syncs

- ✅ Categories (read-only from PocketBase → SQLite)
- ✅ Nouns (read-only from PocketBase → SQLite)
- ❌ User progress (stays local for now)
- ❌ User-added words (stays local for now)

#### Key Features

- Deterministic IDs match local `remote_id` values
- Public read access (anyone can fetch vocabulary)
- Admin-only writes (controlled vocabulary)
- Deployed to Fly.io with auto-scaling (scale to zero when idle)

**See**: `.claude/rules/backend/pocketbase.md` for full setup, deployment, and API docs.

### Service Layer

**Location**: `/services/`

Business logic abstracted from UI components:

- **vocabularyService.ts** - CRUD operations for nouns/verbs (SQLite)
- **spacedRepetitionService.ts** - SM-2 algorithm implementation
- **statisticsService.ts** - User progress, streaks, forecasting
- **syncService.ts** - Optional PocketBase vocabulary sync

Services use the database singleton and provide clean APIs to components.

#### Sync Service

`services/syncService.ts` handles optional vocabulary sync from PocketBase:

- Fetches categories and nouns from PocketBase API
- Upserts into local SQLite by matching `remote_id`
- Gracefully handles network errors (app continues offline)
- Tracks last sync timestamp in settings
- Skips sync entirely if `PB_URL` is not configured

**Important**: Sync is one-way (PocketBase → SQLite) for vocabulary only. User progress stays local.

### File-Based Routing (Expo Router)

**Location**: `/app/`

- Root layout: `app/_layout.tsx` - wraps entire app with theme provider and stack navigator
- Tab layout: `app/(tabs)/_layout.tsx` - defines bottom tab navigation
- Tab screens:
  - `app/(tabs)/index.tsx` - Home/Quiz screen (main learning interface)
  - `app/(tabs)/progress.tsx` - Progress/stats screen
  - `app/(tabs)/words.tsx` - User's vocabulary list and word management
  - `app/(tabs)/settings.tsx` - App settings and preferences
- Modal example: `app/modal.tsx` with presentation mode set in root layout
- Uses `unstable_settings.anchor = '(tabs)'` for initial route configuration

### Theming System

The app has a comprehensive theming system with light/dark mode support:

1. **Theme Constants** (`constants/theme.ts`):
   - `Colors` object with light/dark color schemes
   - **Neo-brutalist palette**: Black, white, yellow (#FFE500), blue (#0066FF), red (#FF3333), green (#00CC66)
   - `Fonts` object with platform-specific font families (iOS system fonts, web fonts, etc.)
   - `Spacing` constants for consistent padding/margins
   - `Layout` constants (border widths, button heights)

2. **Theme Hooks**:
   - `useColorScheme()` - Re-exported from react-native, provides current color scheme
   - `useThemeColor()` - Custom hook that resolves colors based on theme, supports prop overrides

3. **Themed Components**:
   - `ThemedText` - Text component with automatic theme-based coloring and predefined types (default, title, defaultSemiBold, subtitle, link)
   - `ThemedView` - View component with automatic theme-based background colors
   - Both support `lightColor` and `darkColor` props for per-instance customization

### Component Organization

- **Base components**: `components/` - Reusable components
  - `parallax-scroll-view.tsx` - Animated scroll view
  - `external-link.tsx` - External links with proper handling
  - `haptic-tab.tsx` - Tab bar with haptic feedback
  - `hello-wave.tsx` - Animated wave component
- **Quiz components**: `components/quiz/` - Quiz-specific UI
  - Article selection buttons
  - Quiz cards
  - Feedback animations
- **UI components**: `components/ui/` - Platform-specific UI primitives
  - `icon-symbol.tsx` (with `.ios.tsx` variant)
  - `collapsible.tsx`
- **Themed wrappers**: `themed-text.tsx` and `themed-view.tsx` wrap React Native primitives with theme awareness
- **Custom hooks**: `hooks/` - Contains theming hooks with platform-specific variants (`.web.ts` for web overrides)

### Path Aliases

The project uses `@/` as an alias for the root directory:

```typescript
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { vocabularyService } from '@/services/vocabularyService';
```

### Platform-Specific Code

The codebase uses platform-specific file extensions:

- `.ios.tsx` - iOS-specific implementations
- `.android.tsx` - Android-specific implementations
- `.web.ts` - Web-specific implementations
- Default files apply to all platforms

Examples:

- `icon-symbol.ios.tsx` vs `icon-symbol.tsx`
- `use-color-scheme.web.ts` vs `use-color-scheme.ts`
- Database initialization checks Platform.OS !== 'web'

## Key Configuration Details

### Expo Config (`app.json`)

- **Scheme**: `germanpractice://` for deep linking
- **New Architecture**: Enabled (`newArchEnabled: true`)
- **React Compiler**: Enabled for performance optimization
- **Typed Routes**: Enabled for type-safe navigation
- **Edge-to-edge**: Android edge-to-edge display enabled
- **Web output**: Static export

### TypeScript

- Strict mode enabled
- Path alias `@/*` maps to root directory
- Uses `expo/tsconfig.base` as foundation
- Type definitions in `/types/` directory

### ESLint

- Uses `eslint-config-expo` with flat config format
- Ignores `dist/` directory

## Data Flow

### Quiz Session Flow

1. User opens app → Check for due cards in `card_progress`
2. Mix due cards (80%) with new words (20%)
3. Present quiz → Track response time
4. User answers → Calculate quality (0-5) based on correctness + speed
5. Update `card_progress` with new SM-2 values (ease factor, interval, next review date)
6. Record in `review_history` for analytics
7. Show next card

### Adding User Words Flow

1. User navigates to "Add Word" screen
2. Enters German word, selects article, optionally adds plural/English
3. Validation checks for duplicates (UNIQUE constraint on german + article)
4. Insert into `nouns` table with `is_user_added = 1`
5. Automatically create initial `card_progress` entry
6. Word appears in next quiz session

## Design Guidelines

### Neo-Brutalist Style Rules

See `.claude/rules/frontend/styles.md` for comprehensive guidelines.

**Key principles:**

- Thick black borders (3px) on all major elements
- Bright, saturated accent colors (yellow, blue, red, green)
- High contrast, no subtle gradients
- Sharp corners (0-4px border radius max)
- Hard shadows (4-6px offset, no blur)
- Bold typography (semibold/bold weights)
- Generous spacing, elements can overlap slightly
- Functional first, no decorative elements

**Component patterns:**

- Buttons: Bright background + black border + uppercase text
- Cards: White/cream background + black border + optional hard shadow
- Quiz feedback: Immediate color change (green = correct, red = wrong)
- No emojis, no soft animations

## Testing Strategy

### Development Testing

1. Test on both iOS and Android before shipping (use Expo Go)
2. Verify SQLite operations work correctly
3. Test spaced repetition calculations with sample data
4. Verify user-added words don't conflict with pre-loaded vocabulary
5. Test edge cases (missed days, timezone changes, 100+ due cards)

### TestFlight Build Process

```bash
# Build for iOS
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios
```

## Monetization

### AdMob Integration

- Banner ads on non-critical screens (progress, word list) — `components/ads/ad-banner.tsx`
- Interstitial ads between quiz sessions, every 3rd completed session (not mid-quiz) — `hooks/use-quiz-interstitial-ad.ts`
- Rewarded ads for unlocking features (future)
- Never interrupt active learning
- Ships with Google's test ad unit IDs by default (`constants/ads.ts`) so builds work before a real AdMob account exists; override with `EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID`, `EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID`, `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- AdMob is not supported on web — ad components/hooks have `.web` stub variants that render/do nothing there
- IAP (ad-free unlock, premium features) is intentionally deferred to a later phase

## Future Roadmap

### Phase 1 (Current - v1.0)

- ✅ Local SQLite database
- ✅ Article quiz with A1 nouns
- ✅ SM-2 spaced repetition
- ✅ User-added words
- ✅ Basic stats and progress tracking
- ✅ AdMob integration
- ✅ TestFlight release

### Phase 2 (Post-launch)

- Cloud backup (export/import JSON)
- Verb conjugation quiz
- Plural form quiz
- More vocabulary levels (A2, B1)
- Daily goal customization
- Dark mode polish

### Phase 3 (If successful)

- User accounts (optional)
- Cloud sync across devices
- Community word lists
- Streak competitions
- Premium features (ad-free, unlimited vocab)

## Pull Requests

Always use the PR template at `.github/PULL_REQUEST_TEMPLATE.md` when creating pull requests. Fill in every section — remove or mark N/A only what genuinely does not apply (e.g. no screenshots for a non-UI change).

## Important Notes for Claude Code

### Database Operations

- ✅ Always use prepared statements: `db.runAsync('SELECT * FROM nouns WHERE id = ?', [id])`
- ❌ Never use string interpolation: `db.runAsync(\`SELECT \* FROM nouns WHERE id = ${id}\`)`
- ✅ Use transactions for multi-step operations
- ✅ Handle UNIQUE constraint violations gracefully
- ❌ Don't access SQLite on web platform

### Component Patterns

- ✅ Keep components focused and under 200 lines
- ✅ Use StyleSheet.create() for all styles
- ✅ Extract business logic to service layer
- ✅ Use hooks for state management (no Redux)
- ❌ Don't use inline styles
- ❌ Don't put database queries in components

### Code Style

- ✅ Functional components with TypeScript interfaces
- ✅ Meaningful variable names (no single letters except loop counters)
- ✅ Comment complex business logic (SM-2 algorithm, SQL queries)
- ✅ Handle loading and error states
- ❌ No class components
- ❌ No 'var' (use const/let)

### Performance

- ✅ Use useCallback for functions passed as props
- ✅ Use useMemo for expensive computations
- ✅ Use FlatList for long lists (not ScrollView + map)
- ✅ Batch database operations in transactions
- ❌ Avoid inline function definitions in render

## Resources

- **Expo Documentation**: https://docs.expo.dev/
- **Expo Router**: https://docs.expo.dev/router/introduction/
- **expo-sqlite**: https://docs.expo.dev/versions/latest/sdk/sqlite/
- **SM-2 Algorithm**: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
- **Neo-brutalism Design**: https://hype4.academy/articles/design/neo-brutalism-in-web-design
