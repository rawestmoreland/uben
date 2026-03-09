import { PB_URL } from '@/constants/pocketbase';

/**
 * Submits an anonymous quiz result to PocketBase for aggregate analytics.
 *
 * ## What is stored
 *   - `noun_id`      — the PocketBase ID of the noun that was quizzed
 *   - `is_correct`   — whether the user chose the right article
 *   - `quality`      — SM-2 quality score (0–5)
 *   - `time_taken_ms`— response time in milliseconds
 *   - `created`      — auto-generated timestamp (no user info)
 *
 * ## What is NOT stored
 *   No user ID, session ID, device ID, installation ID, or location.
 *   The raw records are admin-only; only aggregate reports are ever shared.
 *
 * ## Note on server logs
 *   Like any HTTP request, the server's access log will contain the caller's
 *   IP address. That data is not stored in the quiz_results collection and is
 *   not retained beyond normal log rotation.
 *
 * ## Behaviour
 *   Fire-and-forget — errors are silently ignored so a failed submission
 *   never interrupts the quiz. Skipped automatically when:
 *     - PB_URL is not configured (offline-only mode)
 *     - the noun has no remote_id (user-added words stay local)
 */
export function submitQuizResult(
  nounRemoteId: string,
  isCorrect: boolean,
  quality: number,
  timeTakenMs: number,
): void {
  if (!PB_URL) return;

  fetch(`${PB_URL}/api/collections/quiz_results/records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      noun_id: nounRemoteId,
      is_correct: isCorrect,
      quality,
      time_taken_ms: timeTakenMs,
    }),
  }).catch(() => {
    // Analytics submissions are best-effort — never surface errors to the user.
  });
}
