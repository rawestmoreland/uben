import { purchaseService } from '@/services/purchaseService';
import {
  getQualityFromResponse,
  spacedRepetitionService,
} from '@/services/spacedRepetitionService';
import {
  isCorrectPreposition,
  type VerbPrepositionQuizCard,
} from '@/services/verbPrepositionService';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────

export type VerbPrepositionQuizPhase =
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'complete'
  | 'empty'
  | 'locked';

export interface VerbPrepositionQuizResult {
  card: VerbPrepositionQuizCard;
  selectedPreposition: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface VerbPrepositionQuizSessionData {
  phase: VerbPrepositionQuizPhase;
  currentCard: VerbPrepositionQuizCard | null;
  selectedPreposition: string | null;
  isCorrect: boolean | null;
  progress: { current: number; total: number };
  results: VerbPrepositionQuizResult[];
  submitAnswer: (preposition: string) => void;
  nextCard: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Manages the verb preposition quiz lifecycle: loading a session of
 * (verb, preposition, case) patterns, presenting each as a cloze question,
 * and recording answers with SM-2 scoring.
 *
 * Mirrors useVerbQuizSession's gating and SM-2/card_progress wiring: this
 * feature is Pro-only with no metered free trial (purchaseService.isProUnlocked).
 * Each question was built from the stored pattern by verbPrepositionService
 * when the session loaded, and grading accepts the primary preposition and
 * any stored alternates. Progress lives on its own 'verb_prep' card, so it
 * never touches article stats.
 */
export function useVerbPrepositionQuizSession(): VerbPrepositionQuizSessionData {
  const [phase, setPhase] = useState<VerbPrepositionQuizPhase>('loading');
  const [cards, setCards] = useState<VerbPrepositionQuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPreposition, setSelectedPreposition] = useState<string | null>(
    null,
  );
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<VerbPrepositionQuizResult[]>([]);

  const cardStartTime = useRef<number>(0);

  // ── Load session on mount ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const unlocked = await purchaseService.isProUnlocked();

        // Defensive gate: the home screen already routes to the paywall
        // when locked, but a direct/deep link could still land here.
        if (!unlocked) {
          if (!cancelled) setPhase('locked');
          return;
        }

        const session = await spacedRepetitionService.getVerbPrepositionSession(
          20,
          5,
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
        console.error('[VerbPrepositionQuiz] Failed to load session:', error);
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
    async (preposition: string) => {
      if (phase !== 'playing' || !currentCard) return;

      const timeTakenMs = Date.now() - cardStartTime.current;
      const correct = isCorrectPreposition(currentCard.question, preposition);
      const quality = getQualityFromResponse(correct, timeTakenMs);

      setSelectedPreposition(preposition);
      setIsCorrect(correct);
      setPhase('feedback');

      setResults((prev) => [
        ...prev,
        {
          card: currentCard,
          selectedPreposition: preposition,
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
            'verb_prep',
            currentCard.word_id,
          );
        }

        await spacedRepetitionService.recordReview(
          cardProgressId,
          quality,
          timeTakenMs,
        );
      } catch (error) {
        console.error('[VerbPrepositionQuiz] Failed to record review:', error);
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
      setSelectedPreposition(null);
      setIsCorrect(null);
      setPhase('playing');
      cardStartTime.current = Date.now();
    }
  }, [cards.length, currentIndex]);

  // ── Return ───────────────────────────────────────────────────────

  return {
    phase,
    currentCard,
    selectedPreposition,
    isCorrect,
    progress: {
      current: currentIndex + 1,
      total: cards.length,
    },
    results,
    submitAnswer,
    nextCard,
  };
}
