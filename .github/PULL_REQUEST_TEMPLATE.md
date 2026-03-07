## Summary

<!-- What does this PR do? 1-3 sentences. -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code quality
- [ ] Database / migration change
- [ ] Dependency update
- [ ] Docs / config only

## Related Issue

Closes #

## Changes

<!-- Bullet list of specific changes made. -->

-

## Testing

- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested edge cases (e.g. empty state, offline, 0 due cards)
- [ ] SQLite operations verified (no web-platform usage)
- [ ] New/updated database migrations tested from a clean state

## Screenshots

<!-- For UI changes, include before/after screenshots. Delete this section if not applicable. -->

| Before | After |
|--------|-------|
|        |       |

## Checklist

- [ ] `npm run lint` passes
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] No inline styles — all styles use `StyleSheet.create()`
- [ ] No SQL string interpolation — all queries use prepared statements
- [ ] No `console.log` left in production paths
- [ ] Components stay under 200 lines
- [ ] Business logic is in the service layer, not in components
