import type { PluralEnding, PluralQuizCard } from '@/services/pluralService';
import { settingsService } from '@/services/settingsService';
import {
  getQualityFromResponse,
  spacedRepetitionService,
} from '@/services/spacedRepetitionService';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────

export type PluralQuizPhase =
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'complete'
  | 'empty';

export interface PluralQuizResult {
  card: PluralQuizCard;
  selectedEnding: PluralEnding;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface PluralQuizSessionData {
  phase: PluralQuizPhase;
  currentCard: PluralQuizCard | null;
  selectedEnding: PluralEnding | null;
  isCorrect: boolean | null;
  progress: { current: number; total: number };
  results: PluralQuizResult[];
  submitAnswer: (ending: PluralEnding) => void;
  nextCard: () => void;
  /** Restart the current card's response timer, e.g. after the learner
   * dismisses the notation hint, so reading time isn't scored as hesitation. */
  restartTimer: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Manages the plural-ending quiz lifecycle: loading a session for the
 * learner's selected categories/levels, presenting nouns, and recording
 * answers with SM-2 scoring.
 *
 * Mirrors useVerbQuizSession's SM-2/card_progress wiring. The correct
 * ending on each card was derived from the noun's stored plural by
 * pluralService when the session was built, so grading is a plain
 * comparison. Plural progress lives on its own 'noun_plural' card, so it
 * never touches the noun's article progress. Free for everyone (no Pro gate).
 */
export function usePluralQuizSession(): PluralQuizSessionData {
  const [phase, setPhase] = useState<PluralQuizPhase>('loading');
  const [cards, setCards] = useState<PluralQuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedEnding, setSelectedEnding] = useState<PluralEnding | null>(
    null,
  );
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<PluralQuizResult[]>([]);

  const cardStartTime = useRef<number>(0);

  // ── Load session on mount ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        // Same category/level selection as the article quiz
        const [categoryIds, levels] = await Promise.all([
          settingsService.getSelectedCategories(),
          settingsService.getSelectedLevels(),
        ]);
        // B1+ is a virtual level meaning "all words" — pass no level filter
        const hasB1Plus = levels.includes('B1+');
        const session = await spacedRepetitionService.getPluralQuizSession(
          20,
          5,
          categoryIds.length > 0 ? categoryIds : undefined,
          hasB1Plus ? undefined : levels.length > 0 ? levels : undefined,
        );

        if (cancelled) return;

        if (session.cards.length === 0) {
          setPhase('empty');
          return;
        }

        setCards(session.cards);
        setPhase('playing');
        cardStartTime.current = Date.now();
      } catch (error) {
        console.error('[PluralQuiz] Failed to load session:', error);
        if (!cancelled) setPhase('empty');
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Current card ─────────────────────────────────────────────────

  const currentCard = cards[currentIndex] ?? null;

  // ── Submit answer ────────────────────────────────────────────────

  const submitAnswer = useCallback(
    async (ending: PluralEnding) => {
      if (phase !== 'playing' || !currentCard) return;

      const timeTakenMs = Date.now() - cardStartTime.current;
      const correct = ending === currentCard.ending;
      const quality = getQualityFromResponse(correct, timeTakenMs);

      setSelectedEnding(ending);
      setIsCorrect(correct);
      setPhase('feedback');

      setResults((prev) => [
        ...prev,
        {
          card: currentCard,
          selectedEnding: ending,
          isCorrect: correct,
          timeTakenMs,
        },
      ]);

      // Persist to database (recordReview updates card_progress and
      // inserts review_history in one transaction)
      try {
        let cardProgressId = currentCard.id;

        // New cards (id === 0) need a card_progress row first
        if (cardProgressId === 0) {
          cardProgressId = await spacedRepetitionService.createCardForWord(
            'noun_plural',
            currentCard.word_id,
          );
        }

        await spacedRepetitionService.recordReview(
          cardProgressId,
          quality,
          timeTakenMs,
        );
      } catch (error) {
        console.error('[PluralQuiz] Failed to record review:', error);
      }
    },
    [phase, currentCard],
  );

  // ── Next card ────────────────────────────────────────────────────

  const nextCard = useCallback(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= cards.length) {
      setPhase('complete');
    } else {
      setCurrentIndex(nextIndex);
      setSelectedEnding(null);
      setIsCorrect(null);
      setPhase('playing');
      cardStartTime.current = Date.now();
    }
  }, [cards.length, currentIndex]);

  const restartTimer = useCallback(() => {
    cardStartTime.current = Date.now();
  }, []);

  // ── Return ───────────────────────────────────────────────────────

  return {
    phase,
    currentCard,
    selectedEnding,
    isCorrect,
    progress: {
      current: currentIndex + 1,
      total: cards.length,
    },
    results,
    submitAnswer,
    nextCard,
    restartTimer,
  };
}
