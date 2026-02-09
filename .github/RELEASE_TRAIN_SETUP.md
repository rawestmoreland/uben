# Release Train Setup Guide

This guide walks you through setting up the automated CI/CD release train for üben.

## Overview

The release train uses a three-branch strategy:
- **develop** → Active development with automatic OTA updates
- **staging** → Pre-production testing with TestFlight builds
- **main** → Production releases to App Store and Play Store

## Prerequisites

- GitHub repository with admin access
- Expo account with EAS CLI installed
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

## Step 1: Create Branches

```bash
# Ensure you're on main and up to date
git checkout main
git pull

# Create staging branch from main
git checkout -b staging
git push -u origin staging

# Create develop branch from staging
git checkout -b develop
git push -u origin develop
```

## Step 2: Configure GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

### Required Secrets

#### 1. EXPO_TOKEN

Get your Expo token:

```bash
npx eas login
npx eas tokens:create --name "GitHub Actions CI/CD"
```

Copy the token and add it to GitHub secrets as `EXPO_TOKEN`.

#### 2. GOOGLE_SERVICE_ACCOUNT_KEY_JSON (Optional - for Android)

To enable automatic Android submissions:

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to: **Setup → API access**
3. Create a new service account or use existing
4. Grant "Release Manager" permissions
5. Download the JSON key
6. Copy the entire JSON content and add to GitHub secrets as `GOOGLE_SERVICE_ACCOUNT_KEY_JSON`

**Note:** Without this secret, Android builds will be created but not automatically submitted.

## Step 3: Configure Branch Protection

### For develop branch:

1. Go to: **Settings → Branches → Branch protection rules**
2. Click "Add rule"
3. Branch name pattern: `develop`
4. Enable:
   - ✅ Require a pull request before merging (no approvals required)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
5. Add status checks: `Lint and Type Check`
6. Disable force pushes and deletions
7. Click "Create"

### For staging branch:

1. Add rule for `staging`
2. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require 1 approval before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
3. Add status checks: `Lint and Type Check`, `Validate PR Direction`
4. Disable force pushes and deletions
5. Click "Create"

### For main branch:

1. Add rule for `main`
2. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require 1 approval before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
3. Add status checks: `Lint and Type Check`, `Validate PR Direction`
4. Disable force pushes and deletions
5. Click "Create"

## Step 4: Test the Setup

### Test develop branch (OTA update):

```bash
git checkout develop
echo "// Test OTA update" >> app/(tabs)/index.tsx
git add .
git commit -m "test: OTA update flow"
git push origin develop
```

**Expected:**
- ✅ GitHub Action runs
- ✅ Lint and TypeScript checks pass
- ✅ OTA update publishes to development channel
- ✅ Commit comment appears confirming OTA success

### Test develop branch (native change):

```bash
git checkout develop
# Add a new plugin to app.json or install a native dependency
npm install expo-camera
npx expo install expo-camera
git add .
git commit -m "feat: add camera support"
git push origin develop
```

**Expected:**
- ✅ GitHub Action runs
- ✅ OTA update fails (native changes detected)
- ✅ Development build triggers automatically
- ✅ Commit comment indicates build was triggered

### Test staging release:

1. Go to GitHub → Pull Requests → New PR
2. Base: `staging`, Compare: `develop`
3. Create and merge the PR

**Expected:**
- ✅ Version bumps (e.g., 1.0.1 → 1.1.0)
- ✅ Version bump committed back to staging
- ✅ Preview builds trigger for iOS and Android
- ✅ Builds submit to TestFlight (iOS) and Play Console (Android)
- ✅ Pre-release tag created (e.g., v1.1.0-staging)

### Test production release:

1. Go to GitHub → Pull Requests → New PR
2. Base: `main`, Compare: `staging`
3. Create and merge the PR

**Expected:**
- ✅ Production builds trigger for iOS and Android
- ✅ Builds submit to App Store and Play Store
- ✅ Production tag created (e.g., v1.1.0)
- ✅ GitHub Release created with changelog

## Workflow Summary

### Daily Development Flow

```bash
# Work on develop branch
git checkout develop
git pull

# Make changes
# Commit and push
git add .
git commit -m "feat: new feature"
git push origin develop

# → Automatic OTA update or build (depending on change type)
```

### Weekly Staging Release

1. Create PR: `develop` → `staging`
2. Review changes
3. Merge PR
4. → Automatic version bump, build, TestFlight submission

### Bi-weekly Production Release

1. Test staging build thoroughly
2. Create PR: `staging` → `main`
3. Get approval
4. Merge PR
5. → Automatic production build and App Store submission

## Troubleshooting

### OTA update fails with "Not authorized"

- Check that `EXPO_TOKEN` is correctly set in GitHub secrets
- Regenerate token: `npx eas tokens:create`

### Android submission fails

- Verify `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` is set
- Check service account has "Release Manager" permissions
- Ensure `google-service-account.json` file is not committed to git (it's generated in workflow)

### Version bump doesn't commit

- Check that GitHub Actions has write permissions
- Go to: **Settings → Actions → General → Workflow permissions**
- Enable: "Read and write permissions"

### Build fails with "No builds started"

- Check EAS project configuration in app.json
- Verify `eas.json` profiles are correct
- Check build logs in Expo dashboard

### PR checks fail with "Invalid PR direction"

This is expected behavior! It ensures:
- `staging` only accepts PRs from `develop`
- `main` only accepts PRs from `staging`

This prevents accidentally deploying untested code to production.

## Rollback Procedures

### Rollback production (if deployed version has issues)

```bash
# Option 1: Revert merge commit
git checkout main
git revert <merge-commit-sha>
git push origin main
# → Triggers new production build with reverted changes

# Option 2: Emergency OTA hotfix (JS-only issues)
npx eas update --branch production --message "Hotfix: revert feature X"
```

### Rollback staging

```bash
# Fix on develop, then merge to staging again
git checkout develop
# Make fix
git commit -m "fix: resolve staging issue"
git push origin develop

# Create new PR: develop → staging
# Merge → New staging build
```

## Maintenance

### Update dependencies

```bash
# Always update on develop first
git checkout develop
npm update
git add package*.json
git commit -m "chore: update dependencies"
git push origin develop

# Test thoroughly, then promote to staging
```

### Change version manually (if needed)

```bash
# Edit app.json and package.json
# Commit with [skip ci] to avoid triggering builds
git commit -m "chore: manual version adjustment [skip ci]"
```

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Expo Fingerprint Documentation](https://docs.expo.dev/eas-update/runtime-versions/)

## Support

If you encounter issues:
1. Check workflow logs in GitHub Actions tab
2. Check build logs in Expo dashboard
3. Review this documentation
4. Check Expo forums or GitHub discussions
