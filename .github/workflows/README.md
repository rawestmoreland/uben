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

**Purpose:** Publishes a staging OTA update when only JS changed, or runs preview builds and TestFlight submissions when native code changed. This is the only publisher for the `staging` EAS branch.

**Steps:**
1. Lint and TypeScript checks
2. Compare native fingerprints against the latest finished staging builds
3. If they match: publish an OTA update to the `staging` branch
4. If they differ: build for iOS and Android (`preview` profile, internal distribution; no store submission)
5. Create a unique pre-release tag, `v<version>-staging.<run number>` (for OTAs, the tag message includes the EAS update group ID)

The app version is not bumped here; an OTA reaches every build with a matching runtime version.

### 3. `production.yml` - Production App Store Release

**Trigger:** Push of an exact semver tag (`v1.9.1`). Staging and OTA tags do not match.

**Purpose:** Store builds and submissions for iOS and Android.

**Steps:**
1. Validate: tag equals `app.config.js` version, and the tagged commit is on `main` (both fail the run)
2. Lint and TypeScript checks
3. Per platform: build with `--wait`, then submit that exact build (a failed build or submission fails the run)
4. Publish the `v<version>` GitHub Release (the draft from `release-notes.yml`, or a git-log changelog since the previous release tag)

### 3b. `production-ota.yml` - Production OTA

**Trigger:** Manual (`workflow_dispatch`), from `main` only.

**Purpose:** Publish a JS-only fix to the `production` channel without a store release.

**Steps:**
1. Lint and TypeScript checks
2. Verify the native fingerprint matches the latest production builds (requires `runtimeVersion.policy: 'fingerprint'`)
3. `eas update --branch production`
4. Tag `v<version>-ota.<run number>` and create a pre-release recording the EAS update group ID

### 4. `release-notes.yml` - Claude Release Notes

**Trigger:** Pull request from `staging` merged into `main`

**Purpose:** Uses `anthropics/claude-code-action` to write user-facing release notes from the commits/PRs since the previous release tag.

**Steps:**
1. Read version from `app.config.js` (via `scripts/app-version.cjs`) and find the previous release tag
2. Claude writes `RELEASE_NOTES.md`
3. Create (as draft) or update the `v<version>` GitHub Release with the notes
4. Comment the notes on the merged PR

`production.yml` publishes the draft when the tag is pushed, falling back to a git-log changelog if no draft exists. Requires the `ANTHROPIC_API_KEY` secret.

### 5. `pr-checks.yml` - Pull Request Validation

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
