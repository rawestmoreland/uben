// German verb Präteritum (simple past) quiz: multiple-choice question
// builder. No rule engine here — unlike adjective endings, a verb's simple
// past form isn't grammatically derivable for strong/irregular verbs
// (gehen → ging, sein → war), it's memorized vocabulary, so the "correct
// answer" is just the verbs.past_tense value passed in.

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface VerbImperfectQuestion {
  infinitive: string;
  /** The correct Präteritum (simple past) form, e.g. "ging" */
  correctAnswer: string;
  /** Shuffled multiple-choice options, always including correctAnswer */
  options: string[];
  english: string | null;
}

/**
 * Build a multiple-choice question for a verb's Präteritum form.
 * Distractors are drawn from other verbs' past-tense forms in
 * `distractorPool` (deduplicated, never the correct answer) so wrong
 * options are still plausible-looking German simple-past forms.
 *
 * If the pool has fewer than 3 usable distractors (e.g. a very small
 * vocabulary), the question is built with however many are available —
 * the correct answer is always included.
 */
export function generateImperfectQuestion(
  verb: { infinitive: string; pastTense: string; english: string | null },
  distractorPool: readonly string[],
): VerbImperfectQuestion {
  const wrongPool = Array.from(new Set(distractorPool)).filter(
    (form) => form !== verb.pastTense,
  );
  const distractors = shuffle(wrongPool).slice(0, 3);
  const options = shuffle([verb.pastTense, ...distractors]);

  return {
    infinitive: verb.infinitive,
    correctAnswer: verb.pastTense,
    options,
    english: verb.english,
  };
}
