import {
  generateDeclensionQuestion,
  type AdjectiveDeclensionQuestion,
} from '@/services/adjectiveDeclensionService';
import {
  getQualityFromResponse,
  spacedRepetitionService,
} from '@/services/spacedRepetitionService';
import type { DueAdjectiveCard } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────

export type AdjectiveQuizPhase =
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'complete'
  | 'empty';

interface AdjectiveQuizCard {
  card: DueAdjectiveCard;
  question: AdjectiveDeclensionQuestion;
}

export interface AdjectiveQuizResult {
  card: DueAdjectiveCard;
  question: AdjectiveDeclensionQuestion;
  selectedAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface AdjectiveQuizSessionData {
  phase: AdjectiveQuizPhase;
  currentQuestion: AdjectiveDeclensionQuestion | null;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  progress: { current: number; total: number };
  results: AdjectiveQuizResult[];
  submitAnswer: (answer: string) => void;
  nextCard: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Manages the adjective declension quiz lifecycle: loading a session,
 * generating a fresh sentence/answer-options for each adjective, recording
 * answers with SM-2 scoring, and tracking results.
 *
 * Mirrors useQuizSession's phase machine, but each "card" here is an
 * adjective paired with a freshly-generated declension question rather than
 * a fixed word/article pair — the same adjective is drilled in varied
 * grammatical contexts across reviews (see adjectiveDeclensionService).
 */
export function useAdjectiveQuizSession(): AdjectiveQuizSessionData {
  const [phase, setPhase] = useState<AdjectiveQuizPhase>('loading');
  const [cards, setCards] = useState<AdjectiveQuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<AdjectiveQuizResult[]>([]);

  const cardStartTime = useRef<number>(0);

  // ── Load session on mount ────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const session =
          await spacedRepetitionService.getAdjectiveDeclensionSession(20, 5);

        if (cancelled) return;

        if (session.cards.length === 0) {
          setPhase('empty');
          return;
        }

        setCards(
          session.cards.map((card) => ({
            card,
            question: generateDeclensionQuestion({
              german: card.german,
              english: card.english,
            }),
          })),
        );
        setPhase('playing');
        cardStartTime.current = Date.now();
      } catch (error) {
        console.error('[AdjectiveQuiz] Failed to load session:', error);
        setPhase('empty');
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
    async (answer: string) => {
      if (phase !== 'playing' || !currentCard) return;

      const timeTakenMs = Date.now() - cardStartTime.current;
      const correct = answer === currentCard.question.correctAnswer;
      const quality = getQualityFromResponse(correct, timeTakenMs);

      setSelectedAnswer(answer);
      setIsCorrect(correct);
      setPhase('feedback');

      setResults((prev) => [
        ...prev,
        {
          card: currentCard.card,
          question: currentCard.question,
          selectedAnswer: answer,
          isCorrect: correct,
          timeTakenMs,
        },
      ]);

      // Persist to database
      try {
        let cardProgressId = currentCard.card.id;

        // New cards (id === 0) need a card_progress row first
        if (cardProgressId === 0) {
          cardProgressId = await spacedRepetitionService.createCardForWord(
            'adjective',
            currentCard.card.word_id,
          );
        }

        await spacedRepetitionService.recordReview(
          cardProgressId,
          quality,
          timeTakenMs,
        );
      } catch (error) {
        console.error('[AdjectiveQuiz] Failed to record review:', error);
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
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase('playing');
      cardStartTime.current = Date.now();
    }
  }, [cards.length, currentIndex]);

  // ── Return ───────────────────────────────────────────────────────

  return {
    phase,
    currentQuestion: currentCard?.question ?? null,
    selectedAnswer,
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
