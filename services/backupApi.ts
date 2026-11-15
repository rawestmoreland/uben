import { PB_API_KEY, PB_URL } from '@/constants/pocketbase';

/**
 * Thin PocketBase REST client for the cloud-backup account and `backups`
 * collection. Every failure is normalised to a `BackupError` with a code the
 * UI can map to a message, so nothing here ever surfaces a raw network error.
 */

export type BackupErrorCode =
  | 'not_configured'
  | 'offline'
  | 'rate_limited'
  | 'server'
  /** Wrong email or password. */
  | 'invalid_credentials'
  | 'email_taken'
  | 'invalid_email'
  | 'weak_password'
  /** The stored session is no longer accepted: sign in again. */
  | 'session_expired'
  | 'not_pro'
  | 'not_signed_in'
  /** Another backup or restore is already running. */
  | 'busy'
  | 'no_backup'
  | 'unsupported_version'
  | 'invalid_backup';

export class BackupError extends Error {
  constructor(
    public readonly code: BackupErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'BackupError';
  }
}

/** Upload/download of a heavy user's history can be slow on a poor connection. */
const REQUEST_TIMEOUT_MS = 30_000;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  /** Adds the shared app key (required to register an account). */
  appKey?: boolean;
  query?: Record<string, string>;
}

/** Result of `request`: parsed JSON (or null for an empty body) on a 2xx. */
export async function pbRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T | null> {
  if (!PB_URL || !PB_API_KEY) throw new BackupError('not_configured');

  const params = new URLSearchParams(options.query);
  if (options.appKey) params.set('key', PB_API_KEY);
  const queryString = params.toString();
  const url = `${PB_URL}/api/${path}${queryString ? `?${queryString}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: options.token } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new BackupError('offline');
  } finally {
    clearTimeout(timer);
  }

  if (response.ok) {
    // 204 (delete) and similar have no body.
    const text = await response.text().catch(() => '');
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BackupError('server', 'Unreadable response');
    }
  }

  throw await toBackupError(response, Boolean(options.token));
}

interface PocketBaseErrorBody {
  data?: Record<string, { code?: string }>;
}

async function toBackupError(
  response: Response,
  hadToken: boolean,
): Promise<BackupError> {
  if (response.status === 429) return new BackupError('rate_limited');
  if (response.status >= 500) return new BackupError('server');
  // 401 on an authorized call means the token is no longer valid. A 403/404 on
  // an owner-only record is how PocketBase reports "not yours / not there".
  if (response.status === 401 && hadToken) return new BackupError('session_expired');
  if (response.status === 403 && hadToken) return new BackupError('session_expired');

  let body: PocketBaseErrorBody = {};
  try {
    body = (await response.json()) as PocketBaseErrorBody;
  } catch {
    // keep the empty body
  }
  const fields = body.data ?? {};
  if (fields.email?.code === 'validation_not_unique') return new BackupError('email_taken');
  if (fields.email) return new BackupError('invalid_email');
  if (fields.password) return new BackupError('weak_password');
  if (response.status === 400 && !hadToken) return new BackupError('invalid_credentials');
  return new BackupError('server', `HTTP ${response.status}`);
}
