# API Rules

## Context

**This app has NO backend API.** Everything is local-first with SQLite.

This file exists to document the pattern IF we add a backend later (e.g., for cloud sync, user accounts, or shared word lists).

## Current State (v1)

### No API Calls

- All data stored locally in SQLite
- No network requests for vocabulary data
- No user authentication
- No cloud sync

### Only External APIs

- **AdMob**: For ad monetization
- **Expo Updates** (optional): For OTA updates

## Future API Design (If Needed)

### When to Add a Backend

Consider adding an API when:

- Users request cloud sync across devices
- You want to share community-created word lists
- You need user accounts and profiles
- You want to track aggregated learning analytics
- You want premium features (subscriptions)

### Recommended Stack (Future)

- **Supabase**: Easy setup, PostgreSQL, auth, real-time
- **PocketBase**: Simple Go backend, built-in auth
- **Firebase**: If you need real-time sync
- **Custom Express/Fastify API**: For full control

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

## Current Implementation

### No API Service Needed

```typescript
// ❌ Don't create these yet
// services/api.ts - NOT NEEDED
// services/auth.ts - NOT NEEDED
// services/sync.ts - NOT NEEDED
```

### Focus on Local Services

```typescript
// ✅ These are what we need now
// services/vocabularyService.ts
// services/spacedRepetitionService.ts
// services/statisticsService.ts
```

## Rules Summary

### Current (v1) Rules

- ✅ All data stays local (SQLite)
- ✅ No authentication required
- ✅ No network requests for vocabulary
- ✅ AdMob is the only external API
- ✅ Offline-first by default

### Future API Rules (When Added)

- ✅ Use JWT for authentication
- ✅ Implement offline-first sync with queue
- ✅ Handle network errors gracefully
- ✅ Rate limit API requests client-side
- ✅ Use HTTPS only
- ✅ Respect user privacy (GDPR)
- ✅ Background sync for seamless experience
- ✅ Conflict resolution: last-write-wins

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
