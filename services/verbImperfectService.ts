// German verb Präteritum (simple past) quiz: multiple-choice question
// builder with person/number conjugation.
//
// There's still no rule engine for the *stem* — unlike adjective endings,
// a verb's simple past stem isn't grammatically derivable for
// strong/irregular verbs (gehen -> ging, sein -> war), it's memorized
// vocabulary (verbs.past_tense). But once you have that stem, the personal
// endings that attach to it ARE regular, which is what lets the quiz ask
// "ich ___" / "wir ___" instead of always repeating "What's the Präteritum
// of X?".
//
// Scope: only pronouns whose ending never needs the epenthetic "-e-" that
// German inserts after certain stem-final consonants (e.g. finden -> du
// "fandest", not "fandst") are supported:
//   - "ich" and "er/sie/es" always take the bare stem unchanged — exactly
//     the value stored in past_tense.
//   - "wir" and "sie" (plural) always just add "-n" (if the stem already
//     ends in "e" — every weak/mixed verb's "-te" marker) or "-en"
//     (strong verbs, e.g. "ging" -> "gingen"). This holds for every verb
//     in the seed data, separable or not.
// "du"/"ihr" are deliberately left out until that edge case is handled.

export type ImperfectPronoun = 'ich' | 'er' | 'wir' | 'sie';

const PRONOUNS: readonly ImperfectPronoun[] = ['ich', 'er', 'wir', 'sie'];

/** Display text for each supported pronoun slot. */
export const PRONOUN_LABELS: Record<ImperfectPronoun, string> = {
  ich: 'ich',
  er: 'er/sie/es',
  wir: 'wir',
  sie: 'sie',
};

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Split a stored past_tense value into its stem and separable prefix, if
 * any (separable verbs are seeded as "stem prefix", e.g. "stand auf" for
 * aufstehen). The personal ending always attaches to the stem, with the
 * prefix re-appended after it — "standen auf", never "stand aufen".
 */
function splitSeparable(pastTense: string): [string, string | undefined] {
  const spaceIndex = pastTense.indexOf(' ');
  if (spaceIndex === -1) return [pastTense, undefined];
  return [pastTense.slice(0, spaceIndex), pastTense.slice(spaceIndex + 1)];
}

/**
 * Conjugate a verb's Präteritum stem (verbs.past_tense) for one of the
 * supported pronouns. See the module comment for which pronouns are
 * supported and why.
 */
export function conjugatePraeteritum(
  pastTense: string,
  pronoun: ImperfectPronoun,
): string {
  const [stem, prefix] = splitSeparable(pastTense);

  const form =
    pronoun === 'ich' || pronoun === 'er'
      ? stem
      : stem.endsWith('e')
        ? `${stem}n`
        : `${stem}en`;

  return prefix ? `${form} ${prefix}` : form;
}

export interface VerbImperfectQuestion {
  infinitive: string;
  /** Which pronoun slot this question asks about, e.g. "ich" or "wir" */
  pronoun: ImperfectPronoun;
  /** The correct conjugated Präteritum form for `pronoun`, e.g. "ging" */
  correctAnswer: string;
  /** Shuffled multiple-choice options, always including correctAnswer */
  options: string[];
  english: string | null;
}

/**
 * Build a multiple-choice question asking for a verb's Präteritum form in
 * a randomly chosen pronoun slot. Distractors are drawn from other verbs'
 * past-tense forms in `distractorPool`, conjugated for the SAME pronoun so
 * wrong options are still plausible-looking forms for that slot (e.g. a
 * "wir ___" question never offers a bare-stem distractor).
 *
 * If the pool has fewer than 3 usable distractors (e.g. a very small
 * vocabulary), the question is built with however many are available —
 * the correct answer is always included.
 */
export function generateImperfectQuestion(
  verb: { infinitive: string; pastTense: string; english: string | null },
  distractorPool: readonly string[],
): VerbImperfectQuestion {
  const pronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];
  const correctAnswer = conjugatePraeteritum(verb.pastTense, pronoun);

  const wrongPool = Array.from(
    new Set(
      distractorPool.map((pastTense) =>
        conjugatePraeteritum(pastTense, pronoun),
      ),
    ),
  ).filter((form) => form !== correctAnswer);

  const distractors = shuffle(wrongPool).slice(0, 3);
  const options = shuffle([correctAnswer, ...distractors]);

  return {
    infinitive: verb.infinitive,
    pronoun,
    correctAnswer,
    options,
    english: verb.english,
  };
}
