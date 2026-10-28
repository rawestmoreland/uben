import { purchaseService } from '@/services/purchaseService';
import { settingsService } from '@/services/settingsService';
import {
  getQualityFromResponse,
  spacedRepetitionService,
} from '@/services/spacedRepetitionService';
import {
  applyCaseStepToQuality,
  isCorrectCase,
  isCorrectPreposition,
  needsCaseStep,
  type VerbPrepositionQuizCard,
} from '@/services/verbPrepositionService';
import type { VerbPrepositionCase } from '@/types/database';
import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────

/**
 * 'patterns' is the cloze preposition quiz; 'pronouns' asks the da(r)-/wo(r)-
 * form of the same patterns. Each keeps its own card progress.
 */
export type VerbPrepositionQuizMode = 'patterns' | 'pronouns';

export type VerbPrepositionQuizPhase =
  | 'loading'
  | 'playing'
  | 'case'
  | 'feedback'
  | 'complete'
  | 'empty'
  | 'locked';

export interface VerbPrepositionQuizResult {
  card: VerbPrepositionQuizCard;
  selectedPreposition: string;
  /** True only when the preposition and, if it was asked, the case were right. */
  isCorrect: boolean;
  /** The case the learner tapped; null when the case step did not apply. */
  selectedCase: VerbPrepositionCase | null;
  timeTakenMs: number;
}

/** A correct two-way preposition waiting for its Akkusativ/Dativ tap. */
interface PendingCaseStep {
  preposition: string;
  quality: number;
  timeTakenMs: number;
}

export interface VerbPrepositionQuizSessionData {
  phase: VerbPrepositionQuizPhase;
  currentCard: VerbPrepositionQuizCard | null;
  selectedPreposition: string | null;
  /** The case tapped in the case step; null until then or when it was skipped. */
  selectedCase: VerbPrepositionCase | null;
  /** Null until the card is fully answered (including the case step). */
  isCorrect: boolean | null;
  progress: { current: number; total: number };
  results: VerbPrepositionQuizResult[];
  submitAnswer: (preposition: string) => void;
  submitCase: (selectedCase: VerbPrepositionCase) => void;
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
 *
 * In 'pronouns' mode the cards are da(r)-/wo(r)- questions (darauf, Worauf)
 * loaded by getVerbPrepositionPronounSession and tracked as 'verb_prep_pronoun'
 * cards. The answers are compounds, never a two-way preposition, so the case
 * step below never applies to them.
 *
 * After a correct two-way preposition (an, auf, in, ...) the session moves to
 * a 'case' phase and asks for Akkusativ or Dativ before showing feedback,
 * unless the learner turned the step off in Settings. A wrong case caps the
 * SM-2 quality at 3 (see applyCaseStepToQuality): the card is not reset.
 * Nothing is saved until the card is fully answered.
 */
export function useVerbPrepositionQuizSession(
  mode: VerbPrepositionQuizMode = 'patterns',
): VerbPrepositionQuizSessionData {
  const [phase, setPhase] = useState<VerbPrepositionQuizPhase>('loading');
  const [cards, setCards] = useState<VerbPrepositionQuizCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedPreposition, setSelectedPreposition] = useState<string | null>(
    null,
  );
  const [selectedCase, setSelectedCase] = useState<VerbPrepositionCase | null>(
    null,
  );
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [results, setResults] = useState<VerbPrepositionQuizResult[]>([]);

  const cardStartTime = useRef<number>(0);
  const caseStepEnabled = useRef(true);
  const pendingCaseStep = useRef<PendingCaseStep | null>(null);

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

        caseStepEnabled.current =
          await settingsService.getVerbPrepositionCaseStep();

        const session =
          mode === 'pronouns'
            ? await spacedRepetitionService.getVerbPrepositionPronounSession(
                20,
                5,
              )
            : await spacedRepetitionService.getVerbPrepositionSession(20, 5);

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
  }, [mode]);

  // ── Current card ─────────────────────────────────────────────────

  const currentCard = cards[currentIndex] ?? null;

  // ── Finish a card ────────────────────────────────────────────────

  const finishCard = useCallback(
    async (
      card: VerbPrepositionQuizCard,
      result: VerbPrepositionQuizResult,
      quality: number,
    ) => {
      setSelectedPreposition(result.selectedPreposition);
      setSelectedCase(result.selectedCase);
      setIsCorrect(result.isCorrect);
      setPhase('feedback');
      setResults((prev) => [...prev, result]);

      // Persist to database (recordReview updates card_progress and
      // inserts review_history in one transaction)
      try {
        let cardProgressId = card.id;

        // New cards (id === 0) need a card_progress row first
        if (cardProgressId === 0) {
          cardProgressId = await spacedRepetitionService.createCardForWord(
            card.word_type,
            card.word_id,
          );
        }

        await spacedRepetitionService.recordReview(
          cardProgressId,
          quality,
          result.timeTakenMs,
        );
      } catch (error) {
        console.error('[VerbPrepositionQuiz] Failed to record review:', error);
      }
    },
    [],
  );

  // ── Submit answer ────────────────────────────────────────────────

  const submitAnswer = useCallback(
    (preposition: string) => {
      if (phase !== 'playing' || !currentCard) return;

      const { question } = currentCard;
      const timeTakenMs = Date.now() - cardStartTime.current;
      const correct = isCorrectPreposition(question, preposition);
      const quality = getQualityFromResponse(correct, timeTakenMs);

      // A correct two-way preposition is followed by the case tap. The
      // preposition's response time is what scores the card, so the extra
      // tap never slows the quality rating.
      if (caseStepEnabled.current && needsCaseStep(question, preposition)) {
        pendingCaseStep.current = { preposition, quality, timeTakenMs };
        setSelectedPreposition(preposition);
        setPhase('case');
        return;
      }

      finishCard(
        currentCard,
        {
          card: currentCard,
          selectedPreposition: preposition,
          isCorrect: correct,
          selectedCase: null,
          timeTakenMs,
        },
        quality,
      );
    },
    [phase, currentCard, finishCard],
  );

  // ── Submit case ──────────────────────────────────────────────────

  const submitCase = useCallback(
    (chosenCase: VerbPrepositionCase) => {
      const pending = pendingCaseStep.current;
      if (phase !== 'case' || !currentCard || !pending) return;

      pendingCaseStep.current = null;
      const caseCorrect = isCorrectCase(currentCard.question, chosenCase);

      finishCard(
        currentCard,
        {
          card: currentCard,
          selectedPreposition: pending.preposition,
          isCorrect: caseCorrect,
          selectedCase: chosenCase,
          timeTakenMs: pending.timeTakenMs,
        },
        applyCaseStepToQuality(pending.quality, caseCorrect),
      );
    },
    [phase, currentCard, finishCard],
  );

  // ── Next card ────────────────────────────────────────────────────

  const nextCard = useCallback(() => {
    const nextIndex = currentIndex + 1;

    if (nextIndex >= cards.length) {
      setPhase('complete');
    } else {
      setCurrentIndex(nextIndex);
      setSelectedPreposition(null);
      setSelectedCase(null);
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
    selectedCase,
    isCorrect,
    progress: {
      current: currentIndex + 1,
      total: cards.length,
    },
    results,
    submitAnswer,
    submitCase,
    nextCard,
  };
}
