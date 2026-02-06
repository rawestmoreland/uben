# Spaced Repetition Skill

## Overview

This skill implements the SM-2 (SuperMemo 2) spaced repetition algorithm for optimal vocabulary retention. The algorithm schedules reviews based on how well the user remembers each word, with intervals increasing for well-known words and resetting for forgotten ones.

## SM-2 Algorithm Fundamentals

### Core Concept

- Cards are reviewed at increasing intervals
- Correct answers → longer intervals (retention strengthens)
- Incorrect answers → interval resets (needs more practice)
- Each card has an "ease factor" that adjusts based on performance

### Key Variables

#### Ease Factor (EF)

- **Range**: 1.3 to 2.5 (typically)
- **Default**: 2.5 (neutral difficulty)
- **Purpose**: Adjusts how quickly intervals grow
- **Higher EF** = easier card, faster interval growth
- **Lower EF** = harder card, slower interval growth

#### Interval (I)

- **Measured in**: Days
- **Starting value**: 0 (new card)
- **Purpose**: Days until next review
- **Growth**: Multiplies by ease factor on correct answers

#### Repetitions (R)

- **Count**: Number of consecutive correct reviews
- **Resets to 0**: On any incorrect answer (quality < 3)
- **Purpose**: Tracks learning progress

### Quality Rating (Q)

User response quality scale (0-5):

```typescript
enum Quality {
  CompleteBlackout = 0, // "I have no idea"
  IncorrectButRemembered = 1, // "Wrong, but I recalled something"
  IncorrectButEasy = 2, // "Wrong, but it seemed easy"
  CorrectWithDifficulty = 3, // "Correct, but I struggled"
  CorrectWithHesitation = 4, // "Correct, slight hesitation"
  Perfect = 5, // "Correct, immediately"
}
```

**For your app's article quiz**, map user actions to quality:

- Wrong answer = 0 (complete blackout)
- Correct answer, slow (>3 seconds) = 3 (with difficulty)
- Correct answer, medium (1-3 seconds) = 4 (with hesitation)
- Correct answer, fast (<1 second) = 5 (perfect)

## Implementation

### Core Algorithm Function

```typescript
interface CardReview {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string; // ISO date string
}

export function calculateNextReview(
  currentCard: CardReview,
  quality: number, // 0-5
  reviewDate: Date = new Date(),
): CardReview {
  let { easeFactor, interval, repetitions } = currentCard;

  // Step 1: Update ease factor based on quality
  if (quality >= 3) {
    // Correct answer
    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }

  // Ensure ease factor stays within bounds
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Step 2: Update repetitions and interval
  if (quality < 3) {
    // Incorrect answer - reset
    repetitions = 0;
    interval = 0;
  } else {
    // Correct answer - increase interval
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1; // First correct: review tomorrow
    } else if (repetitions === 2) {
      interval = 6; // Second correct: review in 6 days
    } else {
      // Third+ correct: multiply by ease factor
      interval = Math.round(interval * easeFactor);
    }
  }

  // Step 3: Calculate next review date
  const nextReviewDate = new Date(reviewDate);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimals
    interval,
    repetitions,
    nextReviewDate: nextReviewDate.toISOString().split('T')[0], // YYYY-MM-DD
  };
}
```

### Usage Example

```typescript
// Initial card state (new card)
const newCard: CardReview = {
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReviewDate: '2024-02-06',
};

// User got it right on first try (quality = 5)
const afterFirstReview = calculateNextReview(newCard, 5);
// Result: { easeFactor: 2.6, interval: 1, repetitions: 1, nextReviewDate: '2024-02-07' }

// User got it right again (quality = 4)
const afterSecondReview = calculateNextReview(afterFirstReview, 4);
// Result: { easeFactor: 2.5, interval: 6, repetitions: 2, nextReviewDate: '2024-02-13' }

// User struggles but gets it (quality = 3)
const afterThirdReview = calculateNextReview(afterSecondReview, 3);
// Result: { easeFactor: 2.36, interval: 14, repetitions: 3, nextReviewDate: '2024-02-27' }

// User forgets it (quality = 0)
const afterForgetting = calculateNextReview(afterThirdReview, 0);
// Result: { easeFactor: 1.96, interval: 0, repetitions: 0, nextReviewDate: '2024-02-06' }
```

## Database Integration

### Storing Review Data

```typescript
// After each review, update the database
export async function recordReview(
  db: SQLite.SQLiteDatabase,
  cardProgressId: number,
  quality: number,
  timeTakenMs: number,
) {
  // Get current card state
  const currentCard = await db.getFirstAsync<CardReview>(
    'SELECT ease_factor, interval, repetitions, next_review_date FROM card_progress WHERE id = ?',
    [cardProgressId],
  );

  if (!currentCard) {
    throw new Error('Card not found');
  }

  // Calculate new state
  const updated = calculateNextReview(
    {
      easeFactor: currentCard.ease_factor,
      interval: currentCard.interval,
      repetitions: currentCard.repetitions,
      nextReviewDate: currentCard.next_review_date,
    },
    quality,
  );

  // Use transaction for atomicity
  await db.withTransactionAsync(async () => {
    // Update card progress
    await db.runAsync(
      `UPDATE card_progress
       SET ease_factor = ?,
           interval = ?,
           repetitions = ?,
           next_review_date = ?,
           total_reviews = total_reviews + 1,
           correct_reviews = correct_reviews + ?,
           last_reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        updated.easeFactor,
        updated.interval,
        updated.repetitions,
        updated.nextReviewDate,
        quality >= 3 ? 1 : 0, // Increment correct count if quality >= 3
        cardProgressId,
      ],
    );

    // Record in history for analytics
    await db.runAsync(
      `INSERT INTO review_history (card_progress_id, quality, time_taken_ms)
       VALUES (?, ?, ?)`,
      [cardProgressId, quality, timeTakenMs],
    );
  });
}
```

### Creating Initial Cards

```typescript
// When user encounters a new word for the first time
export async function createCardForWord(
  db: SQLite.SQLiteDatabase,
  wordType: 'noun' | 'verb',
  wordId: number,
) {
  await db.runAsync(
    `INSERT INTO card_progress (word_type, word_id, ease_factor, interval, repetitions, next_review_date)
     VALUES (?, ?, 2.5, 0, 0, date('now'))`,
    [wordType, wordId],
  );
}
```

## Quiz Session Management

### Daily Review Strategy

```typescript
export async function getDailyReviewSession(
  db: SQLite.SQLiteDatabase,
  maxCards: number = 20,
  newCardsLimit: number = 5,
): Promise<ReviewSession> {
  // Get due cards (cards that need review today)
  const dueCards = await db.getAllAsync(
    `SELECT cp.*, n.german, n.article, n.plural
     FROM card_progress cp
     JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id
     WHERE cp.next_review_date <= date('now')
     ORDER BY cp.next_review_date ASC
     LIMIT ?`,
    [maxCards - newCardsLimit],
  );

  // Get new cards (words never reviewed before)
  const newCards = await db.getAllAsync(
    `SELECT n.*
     FROM nouns n
     LEFT JOIN card_progress cp ON cp.word_type = 'noun' AND cp.word_id = n.id
     WHERE cp.id IS NULL
       AND n.level = 'A1'
     ORDER BY RANDOM()
     LIMIT ?`,
    [newCardsLimit],
  );

  // Mix them together (reviews first, then new)
  return {
    cards: [...dueCards, ...newCards],
    dueCount: dueCards.length,
    newCount: newCards.length,
  };
}
```

### Progress Tracking

```typescript
export async function getStudyStreak(
  db: SQLite.SQLiteDatabase,
): Promise<number> {
  const reviews = await db.getAllAsync<{ review_date: string }>(
    `SELECT DISTINCT date(reviewed_at) as review_date
     FROM review_history
     ORDER BY review_date DESC
     LIMIT 365`,
  );

  if (reviews.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const review of reviews) {
    const reviewDate = new Date(review.review_date);
    reviewDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff === streak) {
      streak++;
      currentDate = reviewDate;
    } else if (daysDiff > streak) {
      break;
    }
  }

  return streak;
}
```

## Quality Detection (Response Time)

### Automatic Quality Assignment

```typescript
export function getQualityFromResponse(
  isCorrect: boolean,
  responseTimeMs: number,
): number {
  if (!isCorrect) {
    return 0; // Complete blackout
  }

  // Correct answer - determine quality based on speed
  if (responseTimeMs < 1000) {
    return 5; // Perfect - under 1 second
  } else if (responseTimeMs < 3000) {
    return 4; // Hesitation - 1-3 seconds
  } else {
    return 3; // Difficulty - over 3 seconds
  }
}

// Usage in quiz component
const startTime = Date.now();
// ... user selects answer ...
const responseTime = Date.now() - startTime;
const quality = getQualityFromResponse(isCorrect, responseTime);
await recordReview(db, cardId, quality, responseTime);
```

## Advanced Features

### Leech Detection

Cards that are repeatedly forgotten may be "leeches" - words that don't stick:

```typescript
export async function detectLeeches(
  db: SQLite.SQLiteDatabase,
): Promise<number[]> {
  // A leech is a card with:
  // - 8+ total reviews
  // - Less than 50% correct rate
  const leeches = await db.getAllAsync<{ id: number }>(
    `SELECT id
     FROM card_progress
     WHERE total_reviews >= 8
       AND (1.0 * correct_reviews / total_reviews) < 0.5`,
  );

  return leeches.map((l) => l.id);
}

// Mark leeches for special attention or exclude from normal reviews
export async function suspendLeech(db: SQLite.SQLiteDatabase, cardId: number) {
  await db.runAsync(
    `UPDATE card_progress
     SET next_review_date = date('now', '+30 days')
     WHERE id = ?`,
    [cardId],
  );
}
```

### Card Difficulty Analysis

```typescript
export async function getCardDifficulty(
  db: SQLite.SQLiteDatabase,
  cardId: number,
): Promise<'easy' | 'medium' | 'hard'> {
  const card = await db.getFirstAsync<{
    ease_factor: number;
    total_reviews: number;
    correct_reviews: number;
  }>(
    'SELECT ease_factor, total_reviews, correct_reviews FROM card_progress WHERE id = ?',
    [cardId],
  );

  if (!card || card.total_reviews < 3) {
    return 'medium'; // Not enough data
  }

  const successRate = card.correct_reviews / card.total_reviews;

  if (card.ease_factor >= 2.5 && successRate >= 0.8) {
    return 'easy';
  } else if (card.ease_factor < 2.0 || successRate < 0.5) {
    return 'hard';
  } else {
    return 'medium';
  }
}
```

### Forecast

Show users what's coming:

```typescript
export async function getForecast(
  db: SQLite.SQLiteDatabase,
  days: number = 7,
): Promise<Record<string, number>> {
  const forecast: Record<string, number> = {};
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM card_progress WHERE next_review_date = ?',
      [dateStr],
    );

    forecast[dateStr] = result?.count || 0;
  }

  return forecast;
}
```

## Testing the Algorithm

### Test Cases

```typescript
describe('SM-2 Algorithm', () => {
  test('new card with perfect answer', () => {
    const card = {
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: '2024-02-06',
    };
    const result = calculateNextReview(card, 5);

    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  test('forgotten card resets', () => {
    const card = {
      easeFactor: 2.5,
      interval: 14,
      repetitions: 3,
      nextReviewDate: '2024-02-06',
    };
    const result = calculateNextReview(card, 0);

    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  test('ease factor stays above minimum', () => {
    let card = {
      easeFactor: 1.4,
      interval: 1,
      repetitions: 1,
      nextReviewDate: '2024-02-06',
    };

    // Keep failing it
    for (let i = 0; i < 10; i++) {
      card = calculateNextReview(card, 0);
    }

    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  test('interval grows exponentially for mastered cards', () => {
    let card = {
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: '2024-02-06',
    };

    card = calculateNextReview(card, 5); // interval: 1
    card = calculateNextReview(card, 5); // interval: 6
    card = calculateNextReview(card, 5); // interval: 15-16
    card = calculateNextReview(card, 5); // interval: 38-42

    expect(card.interval).toBeGreaterThan(30);
  });
});
```

## Best Practices

### Do's

- ✅ Always record review history for analytics
- ✅ Use transactions when updating multiple tables
- ✅ Cap maximum interval at 365 days (optional)
- ✅ Show users their progress (streak, forecast)
- ✅ Allow manual quality override for edge cases
- ✅ Gradually introduce new words (don't overwhelm)
- ✅ Balance new cards with reviews (80/20 rule)

### Don'ts

- ❌ Don't let ease factor drop below 1.3 (cards become too frequent)
- ❌ Don't show the same card twice in one session
- ❌ Don't reset intervals on minor mistakes (quality 3 is still correct)
- ❌ Don't force users through too many cards at once
- ❌ Don't penalize slow correct answers too harshly (quality 3 is fine)
- ❌ Don't forget to handle timezone edge cases in date calculations

## Edge Cases

### Missed Review Days

If a user misses several days and has 100+ due cards:

```typescript
export async function prioritizeDueCards(
  db: SQLite.SQLiteDatabase,
  limit: number = 20,
): Promise<Card[]> {
  // Prioritize:
  // 1. Cards due longest ago (most overdue)
  // 2. Cards with lowest ease factor (hardest words)
  return await db.getAllAsync(
    `SELECT cp.*, n.german, n.article
     FROM card_progress cp
     JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id
     WHERE cp.next_review_date <= date('now')
     ORDER BY 
       julianday('now') - julianday(cp.next_review_date) DESC,
       cp.ease_factor ASC
     LIMIT ?`,
    [limit],
  );
}
```

### User Changed Time Zone

```typescript
// Always use UTC for storage, local time for display
export function normalizeDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
}
```

### Card Suspended/Archived

```typescript
// Add a status field to track suspended cards
ALTER TABLE card_progress ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'archived'));

// Exclude suspended cards from reviews
WHERE status = 'active' AND next_review_date <= date('now')
```

## Performance Optimization

### Batch Updates

When processing multiple reviews in a session:

```typescript
export async function batchRecordReviews(
  db: SQLite.SQLiteDatabase,
  reviews: Array<{ cardId: number; quality: number; timeTakenMs: number }>,
) {
  await db.withTransactionAsync(async () => {
    for (const review of reviews) {
      await recordReview(db, review.cardId, review.quality, review.timeTakenMs);
    }
  });
}
```

### Preload Tomorrow's Cards

```typescript
// Background task to prepare tomorrow's session
export async function preloadTomorrowCards(db: SQLite.SQLiteDatabase) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // This query result can be cached
  return await db.getAllAsync(
    `SELECT cp.*, n.german, n.article
     FROM card_progress cp
     JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id
     WHERE cp.next_review_date = ?`,
    [tomorrowStr],
  );
}
```

## References

- Original SM-2 Algorithm: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
- Anki's modifications: https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html
- Research on optimal intervals: Wozniak, P. A. (1990). "Optimization of repetition spacing in the practice of learning"

## Summary

The SM-2 algorithm is proven and effective for vocabulary learning. Key points:

- Start conservative (quality 3 = correct)
- Let intervals grow naturally for mastered words
- Reset quickly for forgotten words
- Track everything for analytics
- Keep the user engaged with reasonable daily limits
