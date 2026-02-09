# Release Train Overview

Automated CI/CD pipeline for üben with three-branch strategy: `develop` → `staging` → `main`

## Quick Reference

### Branch Workflow

```
develop (active development)
  ↓ PR weekly
staging (pre-production testing)
  ↓ PR bi-weekly
main (production releases)
```

### Automatic Behaviors

| Branch | Change Type | Action | EAS Profile | Channel | Version Bump |
|--------|------------|--------|-------------|---------|--------------|
| develop | JS-only | OTA update | N/A | develop | Patch (1.0.1 → 1.0.2) |
| develop | Native | Development build | development | develop | Patch (1.0.1 → 1.0.2) |
| staging | Any | Store build → TestFlight | preview-store | staging | Minor (1.0.2 → 1.1.0) |
| main | Any | Store build → App Store | production | production | None (uses staging version) |

### Commands

```bash
# Manual OTA updates
npm run update:dev         # Publish to develop channel
npm run update:staging     # Publish to staging channel
npm run update:prod        # Publish to production channel

# Manual builds
npm run build:dev          # Development build (internal)
npm run build:staging      # Store build for TestFlight
npm run build:prod         # Production build for App Store

# Version management
npm run version:bump       # Bump version based on current branch
```

## Setup Instructions

**IMPORTANT:** Before using the release train, complete the setup:

👉 **See `.github/RELEASE_TRAIN_SETUP.md` for complete setup instructions**

### Quick Setup Checklist

- [ ] Create `develop` and `staging` branches
- [ ] Configure GitHub secrets (`EXPO_TOKEN`, `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`)
- [ ] Set up branch protection rules (develop, staging, main)
- [ ] Test develop workflow (OTA update)
- [ ] Test staging workflow (TestFlight build)
- [ ] Test production workflow (App Store build)

## Daily Development Flow

```bash
# 1. Work on develop branch
git checkout develop
git pull origin develop

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"
git push origin develop

# 3. Automatic deployment happens:
#    - JS-only changes → OTA update
#    - Native changes → Development build
```

## Weekly Staging Release

1. Create PR: `develop` → `staging` on GitHub
2. Review changes and get approval
3. Merge PR
4. Automatic actions:
   - Version bumps (minor increment)
   - Builds for iOS and Android
   - Submits to TestFlight (iOS) and Play Console (Android)
   - Creates pre-release tag

## Bi-weekly Production Release

1. Test staging build thoroughly
2. Create PR: `staging` → `main` on GitHub
3. Get approval from team
4. Merge PR
5. Automatic actions:
   - Builds for iOS and Android
   - Submits to App Store (iOS) and Play Store (Android)
   - Creates production tag
   - Generates changelog

## Version Numbering

**Semantic versioning:** `MAJOR.MINOR.PATCH` (e.g., 1.2.3)

- **develop**: Auto-increments PATCH (1.0.1 → 1.0.2)
- **staging**: Auto-increments MINOR (1.0.2 → 1.1.0)
- **main**: Uses staging's version (no increment)

**Build numbers** are managed separately by EAS (auto-increment enabled).

## Native vs JS-Only Changes

The release train uses EAS fingerprinting to automatically detect:

**JS-only changes** (OTA update):
- React component changes
- Business logic changes
- Styling changes
- Non-native code updates

**Native changes** (requires build):
- New Expo plugins in app.json
- Native dependency changes (expo-camera, etc.)
- iOS/Android configuration changes
- Splash screen or icon changes

## Rollback Procedures

### Production Rollback

```bash
# Option 1: Revert merge commit
git checkout main
git revert <merge-commit-sha>
git push origin main
# → Triggers new production build

# Option 2: Emergency OTA hotfix (JS-only issues)
npx eas update --branch production --message "Hotfix: description"
```

### Staging Rollback

```bash
# Fix on develop, then promote to staging
git checkout develop
# Make fix
git commit -m "fix: resolve issue"
git push origin develop
# Create PR: develop → staging
```

## Monitoring

### Check Workflow Status

- **GitHub**: Actions tab in repository
- **Expo**: [expo.dev](https://expo.dev) dashboard for builds
- **TestFlight**: App Store Connect for iOS builds
- **Play Console**: Google Play Console for Android builds

### Workflow Notifications

- Commit comments on develop (OTA or build status)
- PR comments with code quality results
- GitHub releases for production tags

## Files Structure

```
.github/
  workflows/
    develop.yml          # OTA updates and development builds
    staging.yml          # Preview builds and TestFlight
    production.yml       # Production builds and App Store
    pr-checks.yml        # PR validation and code quality
    README.md            # Workflow documentation
  RELEASE_TRAIN_SETUP.md # Detailed setup guide

scripts/
  bump-version.js        # Automatic version bumping

eas.json                 # EAS build and submit configuration
```

## Troubleshooting

See `.github/RELEASE_TRAIN_SETUP.md` for detailed troubleshooting guide.

Common issues:
- **OTA fails**: Check EXPO_TOKEN secret
- **Android submission fails**: Verify credentials uploaded to EAS (`eas credentials`)
- **Version doesn't bump**: Enable GitHub Actions write permissions
- **PR checks fail**: Check PR direction (must follow develop → staging → main)

## Benefits

✅ **Automated version management** - No manual version bumping
✅ **Intelligent deployments** - OTA for JS changes, builds for native changes
✅ **Clear release process** - Defined stages with approval gates
✅ **Reduced errors** - Automated checks prevent common mistakes
✅ **Fast feedback** - Immediate OTA updates for rapid iteration
✅ **Safe production** - Multiple gates before production release

## Support

- Setup guide: `.github/RELEASE_TRAIN_SETUP.md`
- Workflow docs: `.github/workflows/README.md`
- EAS docs: https://docs.expo.dev
- Project docs: `.claude/CLAUDE.md`
