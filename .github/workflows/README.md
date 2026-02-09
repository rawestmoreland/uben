# GitHub Actions Workflows

This directory contains CI/CD workflows for the üben release train.

## Workflows

### 1. `develop.yml` - Development OTA Updates

**Trigger:** Push to `develop` branch

**Purpose:** Automatically publishes OTA updates for JS-only changes, or triggers builds for native changes.

**Steps:**
1. Lint and TypeScript checks
2. Attempt OTA update to `develop` channel
3. If OTA fails (native changes), trigger development build
4. Comment on commit with result

### 2. `staging.yml` - Preview Builds for TestFlight

**Trigger:** Push to `staging` branch

**Purpose:** Automated preview builds and TestFlight submissions.

**Steps:**
1. Bump version (minor increment)
2. Commit version bump back to staging
3. Lint and TypeScript checks
4. Build for iOS and Android (preview-store profile)
5. Auto-submit to TestFlight and Play Console
6. Create pre-release tag (e.g., v1.1.0-staging)

### 3. `production.yml` - Production App Store Release

**Trigger:** Push to `main` branch

**Purpose:** Automated production builds and App Store submissions.

**Steps:**
1. Validate version (should match staging)
2. Lint and TypeScript checks
3. Build for iOS and Android (production profile)
4. Auto-submit to App Store and Play Store
5. Create production tag (e.g., v1.1.0)
6. Generate changelog and create GitHub Release

### 4. `pr-checks.yml` - Pull Request Validation

**Trigger:** Pull requests to `develop`, `staging`, or `main`

**Purpose:** Validate PR direction and run code quality checks.

**Steps:**
1. Validate PR direction (staging ← develop, main ← staging)
2. Run lint and TypeScript checks
3. Comment on PR with results

## Required Secrets

Configure these in: **Settings → Secrets and variables → Actions**

- `EXPO_TOKEN` - Expo authentication token (required)
- `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` - Google Play service account key (optional, for Android submissions)

## Branch Protection

All workflows depend on proper branch protection rules:

- **develop**: Require status checks, no approval required
- **staging**: Require status checks + 1 approval
- **main**: Require status checks + 1 approval

## Manual Workflow Runs

While these workflows run automatically, you can also trigger builds manually:

```bash
# Manual OTA update
npm run update:dev
npm run update:preview
npm run update:prod

# Manual builds
npm run build:dev
npm run build:preview
npm run build:prod
```

## Workflow Status

Check workflow status:
- GitHub Actions tab in repository
- [Expo Dashboard](https://expo.dev) for build status

## Troubleshooting

See `.github/RELEASE_TRAIN_SETUP.md` for detailed troubleshooting guide.
