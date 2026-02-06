# Styles & Design System

## Design Philosophy

Neo-brutalist design: Bold, unapologetic, functional. Think raw geometric shapes, thick borders, high contrast, and a bit of playful chaos. No soft gradients, no subtle shadows, no decorative emojis.

## Visual Principles

- **Bold & Direct**: Thick borders (2-4px), strong colors, clear hierarchy
- **High Contrast**: Black borders on bright backgrounds, no subtle transitions
- **Geometric**: Hard edges, rectangles, no rounded corners (or minimal 4-8px max)
- **Functional First**: Every element has a clear purpose, no decoration for decoration's sake
- **Slightly Chaotic**: Elements can overlap, tilt slightly, or break the grid intentionally
- **Tactile**: Buttons look pressable, cards look stackable

## Color Palette

### Primary Colors

```typescript
export const Colors = {
  // Base
  black: '#000000',
  white: '#FFFFFF',

  // Accent colors (bright, saturated)
  yellow: '#FFE500', // Primary accent
  blue: '#0066FF', // Secondary accent
  red: '#FF3333', // Error/wrong answer
  green: '#00CC66', // Success/correct answer
  purple: '#9933FF', // Tertiary accent

  // Backgrounds
  cream: '#FFF8E1', // Warm off-white
  lightGray: '#F5F5F5', // Cool off-white

  // Text
  textPrimary: '#000000',
  textSecondary: '#333333',
};
```

### Usage

- **Yellow**: Primary CTA buttons, highlights, quiz cards
- **Blue**: Secondary actions, links, info
- **Red**: Wrong answers, delete actions
- **Green**: Correct answers, success states
- **Purple**: User-added content, special features
- **Black borders everywhere**: 2-3px solid black on all major elements

## Typography

```typescript
export const Typography = {
  // Sizes
  huge: 48,
  title: 32,
  heading: 24,
  body: 16,
  small: 14,
  tiny: 12,

  // Weights
  bold: '700' as const,
  semibold: '600' as const,
  regular: '400' as const,

  // Use system fonts - they're bold enough
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};
```

### Text Style Rules

- **Headings**: Bold, black, generous size
- **Body**: Regular weight, high contrast
- **No italic** unless absolutely necessary
- **All caps** for labels and buttons (sparingly)

## Spacing & Layout

```typescript
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Layout = {
  borderWidth: 3, // Thick borders
  borderWidthThin: 2, // Slightly thinner
  borderRadius: 0, // Sharp corners default
  borderRadiusSm: 4, // Minimal rounding if needed
  buttonHeight: 56, // Chunky, pressable
  cardPadding: 16,
  screenPadding: 20,
};
```

### Layout Principles

- **Generous padding**: Don't crowd elements
- **Grid-breaking**: Not everything needs perfect alignment
- **Stackable cards**: Elements can layer with slight offsets
- **Breathing room**: White space is functional, not decorative

## Component Styles

### Buttons

```typescript
const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: Layout.borderRadius,
    // Optional: slight shadow for depth
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0, // Hard shadow, not blurred
    elevation: 0, // Android: use border instead
  },
  primaryText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});
```

**Button Rules:**

- Always have thick black border
- Primary actions: bright background (yellow, blue)
- Secondary actions: white background
- Text: bold, uppercase, black
- Hard shadows (4px offset, no blur) for depth

### Cards

```typescript
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    padding: Layout.cardPadding,
    borderRadius: Layout.borderRadius,
    // Optional: hard shadow
    shadowColor: Colors.black,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardAccent: {
    backgroundColor: Colors.cream,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
  },
  cardHighlight: {
    backgroundColor: Colors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
  },
});
```

**Card Rules:**

- Always bordered (3px black)
- Can have colored backgrounds
- Can overlap other cards slightly for visual interest
- Hard shadows for depth, not soft blur

### Quiz/Interactive Elements

```typescript
const quizStyles = StyleSheet.create({
  articleButton: {
    backgroundColor: Colors.white,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    paddingVertical: 20,
    paddingHorizontal: 32,
    minWidth: 100,
  },
  articleButtonActive: {
    backgroundColor: Colors.blue,
    transform: [{ translateY: 2 }], // Pressed effect
  },
  articleButtonCorrect: {
    backgroundColor: Colors.green,
  },
  articleButtonWrong: {
    backgroundColor: Colors.red,
  },
  nounText: {
    fontSize: Typography.huge,
    fontWeight: Typography.bold,
    color: Colors.black,
    textAlign: 'center',
  },
});
```

**Interactive Rules:**

- Clear pressed/active states (slight movement or color change)
- Immediate feedback (green/red for correct/wrong)
- Large touch targets (minimum 48x48)
- High contrast always

### Input Fields

```typescript
const inputStyles = StyleSheet.create({
  input: {
    backgroundColor: Colors.white,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    padding: 16,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: Colors.black,
    borderRadius: Layout.borderRadius,
  },
  inputFocused: {
    backgroundColor: Colors.cream,
    borderColor: Colors.blue,
  },
});
```

### Progress/Stats

```typescript
const progressStyles = StyleSheet.create({
  progressBar: {
    height: 24,
    backgroundColor: Colors.lightGray,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    borderRadius: Layout.borderRadius,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.green,
    borderRightWidth: Layout.borderWidth,
    borderRightColor: Colors.black,
  },
  statCard: {
    backgroundColor: Colors.white,
    borderWidth: Layout.borderWidth,
    borderColor: Colors.black,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.huge,
    fontWeight: Typography.bold,
    color: Colors.black,
  },
  statLabel: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: Colors.black,
    textTransform: 'uppercase',
  },
});
```

## Animations & Interactions

### Keep It Simple

- Use `transform` for movement (no complex animations)
- Quick, snappy transitions (100-200ms)
- Pressed states: slight translateY or scale
- Success/error: brief color flash or shake

```typescript
// Example: Button press
const animatedValue = useRef(new Animated.Value(0)).current;

const handlePressIn = () => {
  Animated.timing(animatedValue, {
    toValue: 1,
    duration: 100,
    useNativeDriver: true,
  }).start();
};

const translateY = animatedValue.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 4], // Slight downward press
});
```

### Don'ts for Animations

- ❌ No smooth fades or gradual opacity changes
- ❌ No bouncy spring animations
- ❌ No elaborate loading spinners (use simple progress)
- ❌ No parallax or scroll effects

### Dos for Animations

- ✅ Instant color changes
- ✅ Quick position shifts (press effects)
- ✅ Simple scale transformations
- ✅ Direct, immediate feedback

## Icons & Graphics

### Icon Usage

- Use `@expo/vector-icons` with simple, bold icons
- Icons should be outlined or filled, no thin strokes
- Black icons on colored backgrounds
- Size: 24-32px typically

### No Emojis

- ❌ Don't use emojis for decoration
- ❌ Don't use emojis as icons
- ✅ Use proper icon sets instead
- Exception: If an emoji is part of the German noun itself (rare)

### Graphics

- Simple geometric shapes
- Thick strokes (matching border width)
- High contrast
- Can be playful but purposeful

## Gradients & Effects

### Gradients: Use Sparingly or Not at All

- **Prefer solid colors** over gradients
- If gradients are used: bold, high-contrast, linear only
- No subtle, soft gradients
- Example acceptable use: background accent on a non-critical screen

```typescript
// If you must use a gradient (rare):
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={[Colors.yellow, Colors.blue]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={{ borderWidth: 3, borderColor: Colors.black }}
/>
```

### Shadows

- **Hard shadows only**: No blur radius
- Offset shadows (4-8px) for depth
- Always black
- Use sparingly for important elements

```typescript
shadow: {
  shadowColor: Colors.black,
  shadowOffset: { width: 6, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 0, // No blur!
}
```

## Screen Layouts

### Tab Screens

```typescript
const screenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
    padding: Layout.screenPadding,
  },
  screenHeader: {
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: Colors.black,
    paddingBottom: 16,
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: Colors.black,
  },
});
```

### Content Organization

- Clear sections with borders or color blocks
- Not everything centered - left-align content when appropriate
- Break the grid occasionally for visual interest
- Use color blocks to separate sections

## Accessibility

- Maintain WCAG AA contrast ratios (our high contrast helps)
- Touch targets minimum 44x44 (our chunky style helps)
- Use semantic labels for screen readers
- Don't rely on color alone (use text + icons)

## Platform Considerations

### iOS vs Android

- Keep designs mostly platform-agnostic (neo-brutalism works everywhere)
- Use `Platform.select()` for font families
- Test shadows on both (Android uses elevation)

```typescript
Platform.select({
  ios: {
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  android: {
    elevation: 8, // Adjust to taste
    borderWidth: Layout.borderWidth,
  },
});
```

## Examples & Inspiration

Think:

- 1980s Memphis design (bold, geometric)
- Risograph printing (flat colors, high contrast)
- Brutalist architecture (raw, functional)
- Early web design (before everything was rounded)

Don't think:

- Modern iOS design (too soft, too gradual)
- Material Design 3 (too many subtle effects)
- Neumorphism (way too subtle)
- Glassmorphism (too blurry)

## Summary Checklist

Every component should have:

- ✅ Thick black border (2-3px)
- ✅ High contrast colors
- ✅ Bold, clear typography
- ✅ Minimal or no border radius
- ✅ Clear, immediate interaction states
- ✅ No decorative emojis
- ✅ No soft gradients or shadows
- ✅ Generous spacing
- ✅ Purposeful, not precious
