import {
  generateImperfectQuestion,
  type VerbImperfectQuestion,
} from '@/services/verbImperfectService';
import { purchaseService } from '@/services/purchaseService';
import {
  getQualityFromResponse,
  spacedRepetitionService,
} from '@/services/spacedRepetitionService';
import { vocabularyService } from '@/services/vocabularyService';
import type { DueVerbCard } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────

export type VerbQuizPhase =
  | 'loading'
  | 'playing'
  | 'feedback'
  | 'complete'
  | 'empty'
  | 'locked';

interface VerbQuizCard {
  card: DueVerbCard;
  question: VerbImperfectQuestion;
}

export interface VerbQuizResult {
  card: DueVerbCard;
  question: VerbImperfectQuestion;
  selectedAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface VerbQuizSessionData {
  phase: VerbQuizPhase;
  currentQuestion: VerbImperfectQuestion | null;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  progress: { current: number; total: number };
  results: VerbQuizResult[];
  submitAnswer: (answer: string) => void;
  nextCard: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Manages the verb Präteritum (simple past) quiz lifecycle: loading a
 * session, generating a fresh multiple-choice question for each verb, and
 * recording answers with SM-2 scoring.
 *
 * Mirrors useAdjectiveQuizSession's SM-2/card_progress wiring, but this
 * feature is Pro-only with no metered free trial (unlike the adjective
 * quiz) — see purchaseService.isProUnlocked. The "correct answer" is
 * looked-up vocabulary (verbs.past_tense), not a derived grammatical rule,
 * so there's no explanation step between question and next card.
 */
export function useVerbQuizSession(): VerbQuizSessionData {
  const [phase, setPhase] = useState<VerbQuizPhase>('loading');
  const [cards, setCards] = useState<VerbQuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<VerbQuizResult[]>([]);

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

        const [session, allVerbs] = await Promise.all([
          spacedRepetitionService.getVerbImperfectSession(20, 5),
          vocabularyService.getVerbs(),
        ]);

        if (cancelled) return;

        if (session.cards.length === 0) {
          setPhase('empty');
          return;
        }

        const distractorPool = allVerbs
          .map((v) => v.past_tense)
          .filter((form): form is string => !!form);

        setCards(
          session.cards.map((card) => ({
            card,
            question: generateImperfectQuestion(
              {
                infinitive: card.infinitive,
                pastTense: card.past_tense,
                english: card.english,
              },
              distractorPool,
            ),
          })),
        );
        setPhase('playing');
        cardStartTime.current = Date.now();
      } catch (error) {
        console.error('[VerbQuiz] Failed to load session:', error);
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
            'verb',
            currentCard.card.word_id,
          );
        }

        await spacedRepetitionService.recordReview(
          cardProgressId,
          quality,
          timeTakenMs,
        );
      } catch (error) {
        console.error('[VerbQuiz] Failed to record review:', error);
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
