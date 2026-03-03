# Release Workflow

## Branch Strategy

```
feature/* ──► develop ──► staging ──► main
```

| Branch    | Purpose                                     |
| --------- | ------------------------------------------- |
| `develop` | Integration branch for feature work         |
| `staging` | Preview deployments and QA                  |
| `main`    | Production-ready code only, tagged releases |

### Rules

- **main** is never committed to directly
- **main** only receives merges from `staging` (planned releases) or `hotfix/*` branches (OTA patches)
- Feature branches always target `develop`
- No `release/*` branches are needed — `staging` serves as the stabilization layer

---

## Standard Release Flow (Native Build)

### 1. Feature development

```bash
git checkout develop
git checkout -b feature/my-feature
# ... work ...
git push origin feature/my-feature
# Open PR → develop
```

### 2. Promote to staging for QA

```bash
git checkout staging
git merge --no-ff develop
git push origin staging
# Triggers preview EAS build for QA
```

### 3. Bump versions on staging

Once QA has signed off, bump versions on staging before opening the release PR. This is a deliberate act that signals "we are committing to shipping this."

```bash
git checkout staging
# Bump version in package.json and app.config.js
git commit -m "chore: bump version to 1.3.0"
git push origin staging
```

**Files to update:**

| File            | Field                 | Notes                                  |
| --------------- | --------------------- | -------------------------------------- |
| `package.json`  | `version`             | Semantic version e.g. `1.3.0`          |
| `app.config.js` | `version`             | Must match `package.json`              |
| `app.config.js` | `ios.buildNumber`     | Increment by 1, required by App Store  |
| `app.config.js` | `android.versionCode` | Increment by 1, required by Play Store |

### 4. Open a PR from staging → main

- Title: `Release v1.3.0`
- Link to the release ticket
- The version bump in the diff makes it clear what's shipping

**PR checklist:**

- [ ] QA signed off on staging preview build
- [ ] Versions bumped (`version`, `buildNumber`, `versionCode`)
- [ ] Release ticket updated with what's included
- [ ] No unresolved conflicts

### 5. Merge and tag

```bash
# After PR is approved and merged:
git checkout main
git pull origin main
git tag v1.3.0
git push origin main --tags
```

### 6. Trigger EAS production build

```bash
eas build --platform all --profile production
```

---

## OTA Hotfix Flow

Use this when a fix needs to go out immediately via Expo Updates, **without** carrying unfinished staging work into main.

> **Do not bump any version numbers for OTA hotfixes.**
>
> The runtime version policy is set to `appVersion`. Bumping `version` in `app.config.js` would generate a new runtime version, meaning the OTA update would only be delivered to users already on that new version — users on the current production version would never receive the fix. The only versioning artifact for an OTA hotfix is the git tag.

**Always branch from `main`, not from `staging` or `develop`.**

```
main ──────────────────────────────────► main (tagged)
  └─► hotfix/fix-description ──────┘
           │
           └──────────────────────────► staging (back-merged)
           │
           └──────────────────────────► develop (back-merged)
```

### Step by step

**1. Cut the hotfix branch from main**

```bash
git checkout main
git pull origin main
git checkout -b hotfix/fix-article-crash
```

**2. Make the fix and push**

```bash
# ... fix the bug ...
git commit -m "fix: <description>"
git push origin hotfix/fix-article-crash
```

**3. Open a PR from hotfix → main, merge and tag**

```bash
# After PR is approved and merged:
git checkout main
git pull origin main
git tag v1.2.1-ota
git push origin main --tags
```

**4. Deploy the OTA update**

```bash
eas update --branch production --message "fix: <description>"
```

**5. Back-merge into staging and develop**

This is critical — without it, the fix will be clobbered by the next staging → main merge.

```bash
git checkout staging
git merge --no-ff hotfix/fix-article-crash
git push origin staging

git checkout develop
git merge --no-ff hotfix/fix-article-crash
git push origin develop
```

**6. Clean up**

```bash
git branch -d hotfix/fix-article-crash
git push origin --delete hotfix/fix-article-crash
```

---

## Tag Naming Convention

| Type              | Format       | Version bump                            | Trigger                                 |
| ----------------- | ------------ | --------------------------------------- | --------------------------------------- |
| Full native build | `v1.3.0`     | `version`, `buildNumber`, `versionCode` | EAS production build + store submission |
| OTA hotfix        | `v1.2.1-ota` | None                                    | `eas update` only, no store submission  |

---

## Weekly Release Train

Release tickets are tracked on the release kanban board. Each week:

1. Scope the release — confirm what's merged into `develop`
2. Merge `develop` → `staging` and run QA on the preview build
3. If QA passes, bump versions on `staging`, open the PR, merge → `main` and tag
4. If a blocking issue is found, fix on a `hotfix/*` branch (see above) or pull the offending feature and re-deploy staging

---

## Gotchas

- Always use `--no-ff` merges to preserve branch history and avoid ambiguous commit graphs
- Never rebase branches that have already been merged — this generates duplicate commits with new SHAs on future merges
- After a hotfix, confirm the fix is present in both `staging` and `develop` before closing the ticket
- Never bump `version` in `app.config.js` for an OTA hotfix — doing so creates a new runtime version and the update won't reach current users
