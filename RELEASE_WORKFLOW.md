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

---

## Standard Release Flow

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
# Triggers preview/EAS build for QA
```

### 3. Release to production (native build)

```bash
git checkout main
git merge --no-ff staging
git tag v1.2.0
git push origin main --tags
# Triggers EAS production build + App Store submission
```

---

## OTA Hotfix Flow

Use this when a fix needs to go out immediately via Expo Updates, **without** carrying unfinished staging work into main.

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

**3. Merge into main and tag**

```bash
git checkout main
git merge --no-ff hotfix/fix-article-crash
git tag v1.2.1-ota
git push origin main --tags
# Deploy OTA update via: eas update --branch production
```

**4. Back-merge into staging and develop**

This is critical — without it, the fix will be clobbered by the next staging → main merge.

```bash
git checkout staging
git merge --no-ff hotfix/fix-article-crash
git push origin staging

git checkout develop
git merge --no-ff hotfix/fix-article-crash
git push origin develop
```

**5. Clean up**

```bash
git branch -d hotfix/fix-article-crash
git push origin --delete hotfix/fix-article-crash
```

---

## Tag Naming Convention

| Type              | Format          | Trigger                                   |
| ----------------- | --------------- | ----------------------------------------- |
| Full native build | `v1.2.0`        | App Store / Play Store submission via EAS |
| OTA update        | `v1.2.1-ota`    | `eas update` — no store submission needed |
| Emergency hotfix  | `v1.2.1-hotfix` | Urgent patch via `eas update`             |

---

## Weekly Release Train

Release tickets are tracked on the release kanban board. Each week:

1. Scope the release — confirm what's merged into `develop`
2. Cut the staging merge and run QA on the preview build
3. If QA passes, merge staging → main and tag
4. If a blocking issue is found, fix on a `hotfix/*` branch (see above) or pull the offending feature and re-deploy staging

---

## Gotchas

- Always use `--no-ff` merges to preserve branch history and avoid ambiguous commit graphs
- Never rebase branches that have already been merged — this generates duplicate commits with new SHAs on future merges
- After a hotfix, confirm the fix is present in both `staging` and `develop` before closing the ticket
