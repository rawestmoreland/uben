// German verb Präteritum (simple past) quiz: picks a random pronoun slot
// and returns the stored correct answer for it.
//
// There's no conjugation rule engine here — every pronoun's form is
// stored explicitly in the verbs table (see database/seeds/verbs), because
// getting German's personal-ending exceptions right by rule (the
// epenthetic "-e-" German inserts after stems ending in a dental or
// sibilant, e.g. finden -> "fandest" not "fandst") isn't worth risking
// getting subtly wrong at runtime.

export type ImperfectPronoun = 'ich' | 'du' | 'er' | 'wir' | 'ihr' | 'sie';

const PRONOUNS: readonly ImperfectPronoun[] = [
  'ich',
  'du',
  'er',
  'wir',
  'ihr',
  'sie',
];

/** Display text for each pronoun slot. */
export const PRONOUN_LABELS: Record<ImperfectPronoun, string> = {
  ich: 'ich',
  du: 'du',
  er: 'er/sie/es',
  wir: 'wir',
  ihr: 'ihr',
  sie: 'sie',
};

/** A verb's Präteritum form for every supported pronoun. */
export interface VerbImperfectForms {
  ich: string;
  du: string;
  er: string;
  wir: string;
  ihr: string;
  sie: string;
}

export interface VerbImperfectQuestion {
  infinitive: string;
  /** Which pronoun slot this question asks about, e.g. "ich" or "wir" */
  pronoun: ImperfectPronoun;
  /** The correct Präteritum form for `pronoun`, e.g. "ging" */
  correctAnswer: string;
  english: string | null;
}

/**
 * Build a free-text question asking for a verb's Präteritum form in a
 * randomly chosen pronoun slot.
 */
export function generateImperfectQuestion(verb: {
  infinitive: string;
  forms: VerbImperfectForms;
  english: string | null;
}): VerbImperfectQuestion {
  const pronoun = PRONOUNS[Math.floor(Math.random() * PRONOUNS.length)];

  return {
    infinitive: verb.infinitive,
    pronoun,
    correctAnswer: verb.forms[pronoun],
    english: verb.english,
  };
}
