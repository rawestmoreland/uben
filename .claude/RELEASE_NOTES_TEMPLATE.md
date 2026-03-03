# Release Notes Template

> **How to use**: When asked to generate release notes, run `git diff <base>..<head>` (e.g., `git diff main..staging`), analyze the changes, and fill in this template. Remove sections that have no relevant changes. Remove this instruction block before publishing.

---

# Üben v{VERSION} — Release Notes

**Release date**: {YYYY-MM-DD}
**Build**: {EAS_BUILD_ID or git SHA short}
**Diff**: `{BASE_BRANCH}` → `{HEAD_BRANCH}`

---

## What's New

> User-facing features added in this release. Write in plain language for non-technical readers (App Store / TestFlight audience).

- **{Feature name}**: {One-sentence description of the user benefit}
- **{Feature name}**: {One-sentence description of the user benefit}

---

## Improvements

> Enhancements to existing features — things that got better, faster, or easier to use.

- {Description of improvement}
- {Description of improvement}

---

## Bug Fixes

> Issues that were identified and resolved.

- Fixed: {Brief description of what was broken and what the fix does}
- Fixed: {Brief description of what was broken and what the fix does}

---

## Under the Hood

> Technical changes — database migrations, dependency updates, architecture refactors, performance work. Relevant for developers and reviewers, not App Store copy.

### Database / Schema
- {Migration or schema change}

### Dependencies
- Updated `{package}` from `{old}` to `{new}`

### Architecture / Refactor
- {Refactor or structural change}

### Performance
- {Performance improvement}

---

## Known Issues

> Bugs or limitations that are known but not yet fixed in this release.

- {Issue description} — workaround: {workaround if any}

---

## Breaking Changes

> Only present if this release requires user action or changes existing behavior in a disruptive way.

- {Change description and what the user/developer needs to do}

---

## Testing Notes

> Specific areas reviewers should focus on for this release.

- [ ] {Screen or flow to verify}
- [ ] {Edge case to test}
- [ ] Tested on iOS {version}
- [ ] Tested on Android {version}

---

## App Store Release Notes (iOS)

> Short, user-friendly copy for the App Store "What's New" field. Max ~500 characters. No markdown — plain text only.

```
{Plain-text summary of what's new, written for end users. Focus on benefits, not implementation details.}
```

---

*Generated from diff: `git diff {BASE_BRANCH}..{HEAD_BRANCH}`*
