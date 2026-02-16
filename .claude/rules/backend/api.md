# API Rules

## Context

**This app is offline-first with optional cloud sync.** All core functionality works with SQLite only. PocketBase provides optional vocabulary sync but is NOT required for the app to function.

## Current State

### Offline-First Architecture

- ✅ All data stored locally in SQLite (primary source of truth)
- ✅ App works fully offline (no network required)
- ✅ Optional PocketBase sync for vocabulary updates (categories, nouns)
- ❌ No user authentication yet (Phase 2)
- ❌ No user progress sync yet (Phase 2)

### External APIs

- **PocketBase** (optional): Vocabulary sync for categories and nouns
- **AdMob**: For ad monetization
- **Expo Updates** (optional): For OTA updates

### PocketBase Integration (Current)

**Status**: Implemented but optional. If `PB_URL` is not set, the app works entirely offline.

**What syncs**:
- Categories (read-only from PocketBase)
- Nouns (read-only from PocketBase)

**What doesn't sync** (stays local):
- User-added words (`is_user_added = 1`)
- Card progress (`card_progress` table)
- Review history (`review_history` table)
- Settings

**See**: `.claude/rules/backend/pocketbase.md` for full PocketBase documentation.

## PocketBase Sync Service

### Current Implementation

**Service**: `services/syncService.ts`

```typescript
import { PB_URL, SYNC_CONFIG } from '@/constants/pocketbase';

export async function syncVocabularyFromPocketBase() {
  if (!PB_URL) {
    console.log('PocketBase URL not set, skipping sync');
    return { success: false, reason: 'not_configured' };
  }

  try {
    // Fetch categories and nouns from PocketBase
    // Upsert into local SQLite by matching remote_id
    // Update last_sync timestamp in settings
  } catch (error) {
    // Handle network errors gracefully
    // App continues working offline
  }
}
```

**Key features**:
- Graceful degradation (no network = no problem)
- Matches records by `remote_id` to preserve local references
- Paginated fetching (200 records per page)
- Tracks last sync timestamp

**See**: `services/syncService.ts` for implementation.

## Future Enhancements

### Phase 2: User Accounts & Progress Sync

When to add:
- Users request cloud backup of progress
- Multi-device sync becomes a priority
- Community features need user identity

### What to sync (Phase 2+)

- User accounts (PocketBase built-in auth)
- Card progress (`card_progress` → PocketBase collection)
- Review history (`review_history` → PocketBase collection)
- User-added words (optional, privacy considerations)

### API Design Principles (Future)

#### RESTful Endpoints

```typescript
// User management
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

// Vocabulary (read-only official content)
GET    /api/vocabulary/nouns?level=A1
GET    /api/vocabulary/verbs?level=A1

// User data sync
GET    /api/user/progress
POST   /api/user/progress/sync
GET    /api/user/words
POST   /api/user/words
DELETE /api/user/words/:id

// Community features (future)
GET    /api/community/word-lists
POST   /api/community/word-lists
GET    /api/community/word-lists/:id
```

#### Sync Strategy

```typescript
// Conflict resolution: Last-write-wins with timestamps
interface SyncPayload {
  lastSyncAt: string; // ISO timestamp
  progress: CardProgress[];
  userWords: UserWord[];
}

// Server responds with newer data
interface SyncResponse {
  progress: CardProgress[];
  userWords: UserWord[];
  serverTimestamp: string;
}
```

### Authentication (Future)

#### JWT Pattern

```typescript
// Store token securely
import * as SecureStore from 'expo-secure-store';

export async function saveAuthToken(token: string) {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('auth_token');
}
```

#### API Client

```typescript
// services/apiClient.ts
import { getAuthToken } from './auth';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

### Offline-First Sync (Future)

#### Sync Queue Pattern

```typescript
// Store failed sync attempts locally
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  resource TEXT NOT NULL, -- 'noun', 'verb', 'progress'
  resource_id INTEGER,
  data TEXT, -- JSON payload
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0
);
```

#### Background Sync

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const SYNC_TASK = 'background-sync';

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    await syncWithServer();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register background sync
export async function registerBackgroundSync() {
  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 60 * 15, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}
```

### Rate Limiting (Future)

#### Client-Side Rate Limiting

```typescript
// Prevent API spam
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(
    endpoint: string,
    maxRequests: number = 10,
    windowMs: number = 60000,
  ): boolean {
    const now = Date.now();
    const requests = this.requests.get(endpoint) || [];

    // Remove old requests outside window
    const recentRequests = requests.filter((time) => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(endpoint, recentRequests);
    return true;
  }
}

export const rateLimiter = new RateLimiter();
```

### Error Handling (Future)

#### Network Errors

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public endpoint: string,
  ) {
    super(message);
  }
}

export async function safeApiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T | null> {
  try {
    return await apiRequest(endpoint, options);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 401) {
        // Token expired, redirect to login
        await clearAuthToken();
        router.push('/login');
      } else if (error.statusCode >= 500) {
        // Server error, queue for retry
        console.error('Server error:', error);
      }
    } else {
      // Network error, show offline message
      console.error('Network error:', error);
    }
    return null;
  }
}
```

### Data Privacy (Future)

#### User Data Handling

- Store sensitive data (email, password) only on backend
- Never log auth tokens
- Use HTTPS only
- Implement data export (GDPR compliance)
- Implement account deletion

```typescript
// GDPR: Export user data
export async function exportUserData(): Promise<string> {
  const data = await apiRequest('/api/user/export');
  return JSON.stringify(data, null, 2);
}

// GDPR: Delete account
export async function deleteAccount(): Promise<void> {
  await apiRequest('/api/user/account', { method: 'DELETE' });
  await clearLocalData();
}
```

## Current Service Layer

### Implemented Services

```typescript
// ✅ Core services
services/vocabularyService.ts      // SQLite CRUD for nouns/verbs
services/spacedRepetitionService.ts // SM-2 algorithm
services/statisticsService.ts       // User progress stats
services/syncService.ts            // PocketBase vocabulary sync (optional)
```

### Not Yet Implemented

```typescript
// ❌ Phase 2+ services
services/authService.ts            // User authentication
services/progressSyncService.ts    // Sync card_progress to cloud
services/userWordsService.ts       // Cloud backup of user-added words
```

## Rules Summary

### Current Rules (Offline-First + Optional Sync)

- ✅ SQLite is the source of truth (local-first)
- ✅ App works fully offline (no network required)
- ✅ PocketBase sync is optional (graceful degradation)
- ✅ Sync uses `remote_id` to match records (preserves local references)
- ✅ User data (progress, history) stays local for now
- ✅ No authentication required yet
- ✅ Handle network errors gracefully (don't block UI)

### Future Rules (Phase 2+)

- ✅ Use PocketBase auth for user accounts
- ✅ Implement bidirectional sync with conflict resolution
- ✅ Sync queue for offline changes
- ✅ Background sync for seamless experience
- ✅ Use HTTPS only in production
- ✅ Respect user privacy (GDPR-compliant)
- ✅ Rate limit API requests client-side

### Don'ts

- ❌ Don't add API complexity until needed
- ❌ Don't store auth tokens in AsyncStorage (use SecureStore)
- ❌ Don't sync on every action (batch updates)
- ❌ Don't trust client-side validation alone
- ❌ Don't expose internal IDs in API (use UUIDs)
- ❌ Don't log sensitive data

## Migration Path

When you're ready to add a backend:

1. **Phase 1**: Add optional cloud backup (export/import JSON)
2. **Phase 2**: Add user accounts (email/password)
3. **Phase 3**: Add real-time sync
4. **Phase 4**: Add community features (shared lists)

Start simple, grow as needed. The local-first foundation makes this easy to add incrementally.
