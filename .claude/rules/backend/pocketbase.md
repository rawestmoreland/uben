# PocketBase Backend Rules

## Context

PocketBase is a lightweight Go backend that provides a REST API, real-time subscriptions, and built-in authentication. For Üben, it serves as the optional cloud sync backend for vocabulary data.

**Important**: The app is offline-first. PocketBase is **optional** — the app works fully offline with SQLite. Sync is a convenience feature, not a requirement.

## Architecture

### Location

All PocketBase code lives in `/database/pocketbase/`:

```
/database/pocketbase/
  base/                     # Go application source
    main.go                 # PocketBase entry point
    go.mod                  # Go dependencies
    go.sum                  # Dependency checksums
    migrations/             # Go migration files (schema as code)
      1771189769_first_migration.go
    pb_data/                # Runtime database + uploads (gitignored)
    pb_public/              # Static file serving (optional)
  Dockerfile                # Multi-stage build
  docker-compose.yml        # Local development
  fly.toml                  # Fly.io deployment config
  makefile                  # Dev shortcuts (make run)
```

### Collections (Schema)

Defined in Go migrations under `base/migrations/`:

#### `categories` Collection

```go
categoriesCollection := core.NewBaseCollection("categories")
categoriesCollection.ListRule = types.Pointer("")  // public read
categoriesCollection.ViewRule = types.Pointer("")  // public read
categoriesCollection.CreateRule = nil              // admin only
categoriesCollection.UpdateRule = nil              // admin only
categoriesCollection.DeleteRule = nil              // admin only

categoriesCollection.Fields.Add(
  &core.TextField{Name: "name", Required: false},
  &core.TextField{Name: "display_name", Required: false},
  &core.NumberField{Name: "display_order", Required: false, Min: types.Pointer(0.0)},
)
```

**Fields:**
- `id` (auto, 15-char) — deterministic remote ID from import
- `name` (text) — machine name ("people", "animals")
- `display_name` (text) — human-readable ("People & Family")
- `display_order` (number) — sort order in UI
- `created`, `updated` (auto) — timestamps

**API Rules:**
- Anyone can read (public vocabulary)
- Only admins can create/update/delete

#### `nouns` Collection

```go
nounsCollection := core.NewBaseCollection("nouns")
nounsCollection.ListRule = types.Pointer("")  // public read
nounsCollection.ViewRule = types.Pointer("")  // public read
nounsCollection.CreateRule = nil              // admin only
nounsCollection.UpdateRule = nil              // admin only
nounsCollection.DeleteRule = nil              // admin only

nounsCollection.Fields.Add(
  &core.TextField{Name: "german", Required: true},
  &core.SelectField{Name: "article", Required: true, MaxSelect: 1, Values: []string{"der", "die", "das"}},
  &core.TextField{Name: "plural", Required: false},
  &core.TextField{Name: "english", Required: false},
  &core.SelectField{Name: "level", Required: true, MaxSelect: 1, Values: []string{"A1", "A2", "B1", "B2", "C1", "C2"}},
  &core.RelationField{Name: "category", Required: true, MaxSelect: 1, CollectionId: categoriesCollection.Id},
)

// Unique index on (german, article)
nounsCollection.AddIndex("idx_nouns_german_article", true, "german, article", "")
```

**Fields:**
- `id` (auto, 15-char) — deterministic remote ID from import
- `german` (text, required) — the German noun
- `article` (select, required) — "der", "die", or "das"
- `plural` (text) — plural form
- `english` (text) — translation
- `level` (select, required) — CEFR level (A1-C2)
- `category` (relation) — FK to categories collection
- `created`, `updated` (auto) — timestamps

**Indexes:**
- Unique constraint on `(german, article)` — prevents duplicates

**API Rules:**
- Anyone can read (public vocabulary)
- Only admins can create/update/delete

#### `users` Collection (Built-in)

PocketBase's auth collection, modified by migration:

```go
usersCollection.ListRule = types.Pointer("id = @request.auth.id")     // users can list themselves
usersCollection.ViewRule = types.Pointer("id = @request.auth.id")     // users can view themselves
usersCollection.CreateRule = nil                                      // open registration (or set to admin-only)
usersCollection.UpdateRule = types.Pointer("id = @request.auth.id")   // users can update themselves
usersCollection.DeleteRule = types.Pointer("id = @request.auth.id")   // users can delete themselves
```

**Future use**: User accounts, progress sync (Phase 2+).

## Development

### Prerequisites

- **Go 1.24+** installed
- **Docker** (optional, for containerized dev)

### Local Development

#### Option 1: Go Run (Recommended for dev)

```bash
cd database/pocketbase
make run
# or manually:
cd base && go run . serve --http="127.0.0.1:8080"
```

- Auto-migrates on startup (migrations run automatically with `go run`)
- Admin UI: http://localhost:8080/_/
- API: http://localhost:8080/api/

#### Option 2: Docker Compose

```bash
cd database/pocketbase
docker compose up --build
```

- Builds multi-stage Dockerfile
- Persists data to `./base/pb_data` volume
- Migrations run on first startup

### Seeding Data

After starting PocketBase, seed vocabulary data:

```bash
# From project root
npm run pb:import        # Generate pb-import-*.json files
node scripts/pbjson-to-pb.js   # POST to PocketBase API
```

**Script details** (`scripts/pbjson-to-pb.js`):
- Reads `pb-import-categories.json` and `pb-import-nouns.json`
- POSTs to `/api/collections/{collection}/records`
- Imports categories first, then nouns (nouns reference category IDs)
- Uses deterministic IDs so local `remote_id` values match PocketBase records

**Alternative**: Use PocketBase Admin UI → Collections → Import records (paste JSON).

## Migrations

### Migration Pattern

PocketBase uses **Go migrations** (not SQL). Migrations are registered in `init()` functions and auto-run on startup.

**Location**: `base/migrations/`

**Format**:

```go
package migrations

import (
  "github.com/pocketbase/pocketbase/core"
  m "github.com/pocketbase/pocketbase/migrations"
  "github.com/pocketbase/pocketbase/tools/types"
)

func init() {
  m.Register(func(app core.App) error {
    // Up: create collections, add fields, set rules
    collection := core.NewBaseCollection("my_collection")
    // ... configure fields, rules, indexes
    return app.Save(collection)
  }, func(app core.App) error {
    // Down: rollback changes (optional)
    collection, _ := app.FindCollectionByNameOrId("my_collection")
    return app.Delete(collection)
  })
}
```

### Creating Migrations

1. **Auto-generate migration snapshot**:

```bash
cd base
go run . migrate create "my_migration_name"
```

This creates a new timestamped migration file.

2. **Edit migration** to define schema changes.

3. **Run migration**:

Migrations auto-run on `go run . serve` or on next server start.

### Migration Rules

- ✅ **Do**: Define schema as Go code (type-safe, version-controlled)
- ✅ **Do**: Include both `up` and `down` functions
- ✅ **Do**: Set API rules in migrations (security as code)
- ✅ **Do**: Add indexes for performance
- ❌ **Don't**: Manually edit the database (use migrations)
- ❌ **Don't**: Delete old migrations (breaks history)

## Deployment

### Fly.io (Recommended)

**Config**: `fly.toml`

```toml
app = 'uben-pocketbase-backend'
primary_region = 'ord'  # Chicago (change to your preferred region)

[build]

[[mounts]]
  source = 'pb_data'        # Persistent volume for database
  destination = '/pb/pb_data'

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = 'stop'      # Scale to zero when idle
  auto_start_machines = true       # Wake on request
  min_machines_running = 0         # Free tier friendly

[[vm]]
  memory = '512mb'
  cpus = 1
```

**Deploy steps**:

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch app (from /database/pocketbase/)
cd database/pocketbase
fly launch  # Creates fly.toml (already exists)

# 4. Deploy
fly deploy

# 5. Create persistent volume (if not auto-created)
fly volumes create pb_data --size 1  # 1GB free tier

# 6. Check status
fly status
fly logs

# 7. Open admin UI
fly open /_/
```

**Important**: Set admin credentials on first visit to `https://your-app.fly.dev/_/`.

### Environment Variables

Set in Fly.io or Docker:

```bash
# Fly.io
fly secrets set ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure123

# Docker
docker run -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=secure123 ...
```

**Note**: PocketBase creates the admin user on first run if `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.

### Backup & Restore

**Backup** (Fly.io):

```bash
# SSH into Fly machine
fly ssh console

# Inside container:
tar -czf /tmp/pb_data_backup.tar.gz /pb/pb_data

# Exit and download
fly ssh sftp get /tmp/pb_data_backup.tar.gz ./pb_data_backup.tar.gz
```

**Restore**:

```bash
fly ssh console
# Upload backup first via sftp or volume mount
tar -xzf /tmp/pb_data_backup.tar.gz -C /pb/
```

**Alternative**: Use PocketBase's built-in export/import (Admin UI → Settings → Import/Export).

## API Usage

### Base URL

- **Local dev**: `http://localhost:8080/api/`
- **Production**: `https://your-app.fly.dev/api/`

### Authentication

For **public reads** (categories, nouns): No auth required.

For **admin actions** (create/update/delete):

```bash
# 1. Login as admin
curl -X POST http://localhost:8080/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity":"admin@example.com","password":"secure123"}'

# Response: { "token": "eyJhbGciOiJIUzI1...", "admin": {...} }

# 2. Use token in requests
curl http://localhost:8080/api/collections/nouns/records \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1..."
```

### Common Endpoints

#### List Categories

```bash
GET /api/collections/categories/records?perPage=100
```

Response:

```json
{
  "page": 1,
  "perPage": 100,
  "totalItems": 18,
  "totalPages": 1,
  "items": [
    {
      "id": "0xw1qzu1smooo21",
      "name": "people",
      "display_name": "People & Family",
      "display_order": 1,
      "created": "2026-02-16 10:00:00.000Z",
      "updated": "2026-02-16 10:00:00.000Z"
    }
  ]
}
```

#### List Nouns (with filters)

```bash
# All A1 nouns
GET /api/collections/nouns/records?filter=level='A1'&perPage=200

# Nouns in "people" category
GET /api/collections/nouns/records?filter=category='0xw1qzu1smooo21'

# Search by German word
GET /api/collections/nouns/records?filter=german~'Haus'
```

#### Get Single Noun

```bash
GET /api/collections/nouns/records/08oxbu206tbhmm0
```

#### Create Noun (admin only)

```bash
POST /api/collections/nouns/records
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "id": "custom15charID",  # optional, PB generates if omitted
  "german": "Katze",
  "article": "die",
  "plural": "Katzen",
  "english": "cat",
  "level": "A1",
  "category": "1k30b5i16cltr60"
}
```

### Real-time Subscriptions (Future)

PocketBase supports SSE subscriptions for live updates:

```javascript
// Example: subscribe to noun changes
const eventSource = new EventSource(
  'http://localhost:8080/api/realtime?collections=nouns'
);

eventSource.addEventListener('message', (e) => {
  const data = JSON.parse(e.data);
  console.log('Noun updated:', data);
});
```

**Use case**: Sync vocabulary updates to devices without polling.

## Client Integration

### Configuration

**File**: `constants/pocketbase.ts`

```typescript
export const PB_URL = process.env.EXPO_PUBLIC_PB_URL || 'http://localhost:8080';
export const PB_API_KEY = process.env.EXPO_PUBLIC_PB_API_KEY;

export const SYNC_CONFIG = {
  PAGE_SIZE: 200,
  LAST_SYNC_KEY: 'last_pocketbase_sync',
} as const;
```

**Environment** (`.env.local`):

```bash
EXPO_PUBLIC_PB_URL=https://your-app.fly.dev
EXPO_PUBLIC_PB_API_KEY=optional-key-for-query-param-auth
```

### Sync Service

**File**: `services/syncService.ts`

The sync service fetches categories and nouns from PocketBase and upserts them into local SQLite. It matches records by `remote_id` to avoid losing user progress.

**Key operations**:
- Fetch paginated data from PocketBase
- Upsert into local SQLite (match by `remote_id`)
- Track last sync timestamp in settings

**See**: `services/syncService.ts` for implementation details.

## Scripts

### `npm run pb:import`

Generates JSON import files from local seed data.

**Script**: `scripts/generate-pb-import.js`

**Output**:
- `pb-import-categories.json` — 18 categories with deterministic IDs
- `pb-import-nouns.json` — 477+ nouns with deterministic IDs

**Why deterministic IDs?** So local `remote_id` values match PocketBase records (enables sync without orphaning `card_progress` data).

### `node scripts/pbjson-to-pb.js`

POSTs JSON import files to PocketBase API.

**Usage**:

```bash
# 1. Start PocketBase
cd database/pocketbase && make run

# 2. Generate import files
npm run pb:import

# 3. Import to PocketBase
node scripts/pbjson-to-pb.js
```

**What it does**:
- POSTs categories to `/api/collections/categories/records`
- POSTs nouns to `/api/collections/nouns/records`
- Uses parallel requests (Promise.all)

**Note**: This is for initial seeding. For incremental updates, use the PocketBase Admin UI or write a smarter sync script.

## Security

### API Rules

PocketBase uses **rule-based access control** (defined in migrations):

```go
// Public read, admin write
collection.ListRule = types.Pointer("")  // "" = allow all
collection.ViewRule = types.Pointer("")
collection.CreateRule = nil               // nil = admin only
collection.UpdateRule = nil
collection.DeleteRule = nil
```

**Rule syntax** (future):

```go
// Only authenticated users can read
collection.ListRule = types.Pointer("@request.auth.id != ''")

// Users can only update their own data
collection.UpdateRule = types.Pointer("@request.auth.id = user_id")
```

See [PocketBase Rules](https://pocketbase.io/docs/api-rules-and-filters/) for full syntax.

### CORS

PocketBase allows all origins by default in development. For production, configure CORS in `main.go` or use Fly.io edge proxies.

### HTTPS

- **Local dev**: HTTP is fine
- **Production**: Always use HTTPS (Fly.io enforces this)

### Admin Credentials

- **Never commit** admin credentials to git
- Use environment variables or Fly secrets
- Rotate admin password regularly

## Monitoring

### Logs

**Local**:

```bash
# Go run (stdout)
cd base && go run . serve --http="127.0.0.1:8080"
```

**Fly.io**:

```bash
fly logs
fly logs -a uben-pocketbase-backend
```

### Health Check

PocketBase has a built-in health endpoint:

```bash
GET /api/health

# Response:
{ "code": 200, "message": "API is healthy", "data": {} }
```

### Metrics (Future)

PocketBase supports Prometheus metrics via plugins. For now, use Fly.io's built-in monitoring.

## Troubleshooting

### Migration Fails

**Symptom**: "migration already applied" or "collection not found"

**Fix**:

```bash
# Reset database (local dev only)
rm -rf base/pb_data
cd base && go run . serve --http="127.0.0.1:8080"
```

### Import Fails (duplicate key)

**Symptom**: POST returns 400 "duplicate key"

**Cause**: Trying to import data that already exists.

**Fix**:

```bash
# Delete existing records via Admin UI or:
curl -X DELETE http://localhost:8080/api/collections/nouns/records/{id} \
  -H "Authorization: Bearer {admin_token}"
```

### Fly Deployment Fails

**Symptom**: "builder not found" or "go.mod not found"

**Cause**: Dockerfile expects `./base` directory structure.

**Fix**: Ensure you run `fly deploy` from `/database/pocketbase/` directory.

### Volume Not Persisting

**Symptom**: Data lost after Fly machine restart.

**Cause**: Volume not mounted or wrong mount path.

**Fix**:

```bash
# Check volumes
fly volumes list

# Create if missing
fly volumes create pb_data --size 1

# Verify fly.toml mount config
[[mounts]]
  source = 'pb_data'
  destination = '/pb/pb_data'
```

## Future Enhancements

### Phase 2: User Accounts & Progress Sync

- Add `card_progress` and `review_history` collections
- Link to `users` collection (FK: `user_id`)
- Sync user data (bidirectional, conflict resolution)
- Real-time subscriptions for multi-device sync

### Phase 3: Community Features

- `word_lists` collection (user-created lists)
- `shared_progress` (leaderboards, challenges)
- Social features (friends, study groups)

### Phase 4: Advanced Features

- Image uploads for vocabulary (S3 or PocketBase file fields)
- Audio pronunciation files
- Custom hooks (email verification, webhooks)

## Resources

- **PocketBase Docs**: https://pocketbase.io/docs/
- **PocketBase Go Migrations**: https://pocketbase.io/docs/go-migrations/
- **Fly.io Docs**: https://fly.io/docs/
- **Dockerfile Best Practices**: https://docs.docker.com/develop/dev-best-practices/

## Rules Summary

### Do's

- ✅ Define schema in Go migrations (version-controlled)
- ✅ Set API rules in migrations (security as code)
- ✅ Use deterministic IDs for sync (match local `remote_id`)
- ✅ Keep PocketBase optional (app works offline)
- ✅ Use HTTPS in production
- ✅ Test locally with `make run` before deploying
- ✅ Backup `pb_data` before major changes

### Don'ts

- ❌ Don't manually edit PocketBase database (use migrations)
- ❌ Don't commit `pb_data/` to git (large, sensitive)
- ❌ Don't commit admin credentials
- ❌ Don't delete old migrations (breaks history)
- ❌ Don't use HTTP in production (Fly.io enforces HTTPS)
- ❌ Don't skip migration down functions (needed for rollbacks)
