# React Native / Expo Frontend Rules

## Project Context

This is a mobile-first German language learning app built with Expo Router. Focus on fast development, clean code, and excellent mobile UX.

## Technology Stack

- **Expo SDK** (latest stable)
- **Expo Router** (file-based routing with app directory)
- **TypeScript** for type safety
- **expo-sqlite** for local data (native only, NOT web)
- **Functional components** with hooks only (no class components)

## Code Style & Patterns

### Components

- Use functional components with TypeScript interfaces for props
- Keep components small and focused (< 200 lines)
- Co-locate styles with components using StyleSheet.create()
- Use meaningful component names (e.g., `ArticleQuizCard`, not `Card`)

```typescript
interface ArticleQuizCardProps {
  noun: string;
  onAnswer: (article: 'der' | 'die' | 'das') => void;
}

export function ArticleQuizCard({ noun, onAnswer }: ArticleQuizCardProps) {
  // component logic
}
```

### State Management

- Use React hooks (useState, useEffect, useCallback, useMemo)
- Use Context for app-wide state (user settings, theme)
- Keep state close to where it's used
- No Redux or complex state libraries - keep it simple

### File Structure (Expo Router)

```
/app
  /(tabs)            - Tab-based screens (main navigation)
    index.tsx        - Home/Quiz screen
    progress.tsx     - Progress/stats screen
    settings.tsx     - Settings screen
  _layout.tsx        - Root layout
  +not-found.tsx     - 404 screen
/components          - Reusable UI components
/services            - Business logic, DB queries, algorithms
/database            - Schema, migrations, seed data
/hooks               - Custom React hooks
/types               - TypeScript type definitions
/constants           - Colors, spacing, config
```

### Routing (Expo Router)

- Screens live in `/app` directory
- File names become routes automatically
- Use `(tabs)` directory for tab navigation
- Use `Link` component for navigation
- Use `router.push()` for programmatic navigation

```typescript
import { Link, router } from 'expo-router';

// Declarative navigation
<Link href="/settings">Settings</Link>

// Programmatic navigation
router.push('/quiz');
```

### Tab Navigation

- Configure tabs in `app/(tabs)/_layout.tsx`
- Use icons from `@expo/vector-icons`
- Keep to 3-4 main tabs max
- Suggested tabs: Quiz, Progress, Words, Settings

### Styling

- Use StyleSheet.create() for all styles
- Define spacing/color constants in `/constants`
- Mobile-first design (iOS/Android primary, web secondary)
- Use flexbox for layouts
- Follow platform conventions (iOS vs Android differences)
- Leverage the existing theme constants from Expo boilerplate

```typescript
import { Colors } from '@/constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.light.background,
  },
});
```

### Performance

- Use `useCallback` for functions passed as props
- Use `useMemo` for expensive computations
- Avoid inline function definitions in render
- Use `FlatList` for long lists (not ScrollView + map)
- Screens lazy load automatically with Expo Router

### Error Handling

- Handle database errors gracefully with try/catch
- Show user-friendly error messages
- Log errors to console in development
- Use error boundaries for screen-level errors

### Platform Specific

- Use `Platform.OS` checks sparingly
- Prefer platform-agnostic solutions
- Remember: SQLite works on iOS/Android only, NOT web

```typescript
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // SQLite code here
}
```

### Expo Router Specifics

- Use `Stack.Screen` options for navigation bar config
- Use `useLocalSearchParams()` for URL params
- Use `Slot` component in layouts
- Leverage automatic deep linking

### Accessibility

- Add accessible labels where needed
- Ensure touch targets are at least 44x44 points
- Support both light and dark mode (use theme from constants)

### Testing

- Test on both iOS and Android before shipping
- Use Expo Go for rapid iteration
- Build standalone builds for TestFlight
- Test tab navigation thoroughly

## Don'ts

- ❌ Don't use class components
- ❌ Don't use inline styles (use StyleSheet.create)
- ❌ Don't use React Navigation directly (use Expo Router)
- ❌ Don't use SQL.js or web-specific SQLite solutions yet
- ❌ Don't over-engineer - ship fast, iterate later
- ❌ Don't use external UI libraries unless necessary (keep bundle small)
- ❌ Don't use var (use const/let)
- ❌ Don't mutate state directly
- ❌ Don't create navigation stacks manually (use file structure)

## Dos

- ✅ Write clean, readable TypeScript
- ✅ Keep components simple and testable
- ✅ Use meaningful variable names
- ✅ Comment complex business logic
- ✅ Handle loading and error states
- ✅ Think mobile-first
- ✅ Keep the app fast and responsive
- ✅ Leverage Expo Router's file-based routing
- ✅ Use the existing theme/constants from boilerplate
- ✅ Follow the existing project structure
