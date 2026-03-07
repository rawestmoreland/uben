import { useCallback, useEffect, useRef, useState } from 'react';
import {
  spacedRepetitionService,
  getQualityFromResponse,
} from '@/services/spacedRepetitionService';
import { settingsService } from '@/services/settingsService';
import type { DueCard, ReviewSession } from '@/types/database';

// ── Types ────────────────────────────────────────────────────────────

export type QuizPhase = 'loading' | 'playing' | 'feedback' | 'complete' | 'empty';

type Article = 'der' | 'die' | 'das';

export interface QuizResult {
  card: DueCard;
  selectedArticle: Article;
  correctArticle: Article;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface QuizSessionData {
  mode: QuizMode;
  phase: QuizPhase;
  currentCard: DueCard | null;
  selectedArticle: Article | null;
  isCorrect: boolean | null;
  progress: { current: number; total: number };
  results: QuizResult[];
  submitAnswer: (article: Article) => void;
  nextCard: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

export type QuizMode = 'daily' | 'struggling';

/**
 * Manages the full quiz lifecycle: loading a session, presenting cards,
 * recording answers with SM-2 scoring, and tracking results.
 *
 * @param mode - 'daily' uses the normal SRS schedule; 'struggling' drills
 *               the words the user misses most (ignores next_review_date).
 */
export function useQuizSession(mode: QuizMode = 'daily'): QuizSessionData {
  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);

  const cardStartTime = useRef<number>(0);

  // ── Load session on mount ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        let reviewSession;

        if (mode === 'struggling') {
          reviewSession =
            await spacedRepetitionService.getStrugglingWordsSession(15);
        } else {
          // Load selected categories and levels from settings
          const [categoryIds, levels] = await Promise.all([
            settingsService.getSelectedCategories(),
            settingsService.getSelectedLevels(),
          ]);
          reviewSession = await spacedRepetitionService.getDailyReviewSession(
            20,
            5,
            categoryIds.length > 0 ? categoryIds : undefined,
            levels.length > 0 ? levels : undefined,
          );
        }

        if (cancelled) return;

        if (reviewSession.cards.length === 0) {
          setPhase('empty');
          return;
        }

        setSession(reviewSession);
        setPhase('playing');
        cardStartTime.current = Date.now();
      } catch (error) {
        console.error('[Quiz] Failed to load session:', error);
        setPhase('empty');
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Current card ─────────────────────────────────────────────────

  const currentCard = session?.cards[currentIndex] ?? null;

  // ── Submit answer ────────────────────────────────────────────────

  const submitAnswer = useCallback(
    async (article: Article) => {
      if (phase !== 'playing' || !currentCard) return;

      const timeTakenMs = Date.now() - cardStartTime.current;
      const correct = article === currentCard.article;
      const quality = getQualityFromResponse(correct, timeTakenMs);

      setSelectedArticle(article);
      setIsCorrect(correct);
      setPhase('feedback');

      // Record result for summary
      setResults((prev) => [
        ...prev,
        {
          card: currentCard,
          selectedArticle: article,
          correctArticle: currentCard.article as Article,
          isCorrect: correct,
          timeTakenMs,
        },
      ]);

      // Persist to database
      try {
        let cardProgressId = currentCard.id;

        // New cards (id === 0) need a card_progress row first
        if (cardProgressId === 0) {
          cardProgressId = await spacedRepetitionService.createCardForWord(
            'noun',
            currentCard.word_id,
          );
        }

        await spacedRepetitionService.recordReview(
          cardProgressId,
          quality,
          timeTakenMs,
        );
      } catch (error) {
        console.error('[Quiz] Failed to record review:', error);
      }
    },
    [phase, currentCard],
  );

  // ── Next card ────────────────────────────────────────────────────

  const nextCard = useCallback(() => {
    if (!session) return;

    const nextIndex = currentIndex + 1;

    if (nextIndex >= session.cards.length) {
      setPhase('complete');
    } else {
      setCurrentIndex(nextIndex);
      setSelectedArticle(null);
      setIsCorrect(null);
      setPhase('playing');
      cardStartTime.current = Date.now();
    }
  }, [session, currentIndex]);

  // ── Return ───────────────────────────────────────────────────────

  return {
    mode,
    phase,
    currentCard,
    selectedArticle,
    isCorrect,
    progress: {
      current: currentIndex + 1,
      total: session?.cards.length ?? 0,
    },
    results,
    submitAnswer,
    nextCard,
  };
}
