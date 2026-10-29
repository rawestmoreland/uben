// da(r)- and wo(r)- compounds of the verb preposition quiz: after a
// preposition that takes a thing, German uses a pronominal adverb instead of
// preposition + pronoun. "Ich warte ____." -> darauf, "____ wartest du?" ->
// worauf. People take the preposition + a pronoun instead (Ich warte auf
// ihn), never the compound.
//
// The compound is built from the stored pattern's preposition by the regular
// rule (da/wo + preposition, with an "r" inserted before a vowel), so it
// can't drift from the pattern. The cloze sentence for each form is authored
// and stored in `verb_preposition_compounds`. Questions reuse the preposition
// quiz's question shape: the buttons simply carry the compounds, so the
// grid, grading and feedback work unchanged, and the case step is skipped
// because a compound is never a two-way preposition.

import type {
  DueVerbPrepCompoundCard,
  VerbPrepositionCompoundForm,
} from '@/types/database';
import {
  buildVerbPrepositionQuestion,
  type BuildQuestionOptions,
  fillBlank,
  parsePrepositionList,
  PREPOSITION_GRID,
  type VerbPrepositionButton,
  type VerbPrepositionPattern,
  type VerbPrepositionQuestion,
} from './verbPrepositionService';

const FORM_STEMS: Record<VerbPrepositionCompoundForm, string> = {
  da: 'da',
  wo: 'wo',
};

const VOWEL_START = /^[aeiouäöü]/;

/** e.g. ('auf', 'da') -> 'darauf', ('für', 'wo') -> 'wofür'. */
export function toCompound(
  preposition: string,
  form: VerbPrepositionCompoundForm,
): string {
  const normalized = preposition.trim().normalize('NFC').toLowerCase();
  const linkingR = VOWEL_START.test(normalized) ? 'r' : '';
  return `${FORM_STEMS[form]}${linkingR}${normalized}`;
}

/** How a compound is built, e.g. ('auf', 'da') -> 'da + r + auf'. */
export function describeCompound(
  preposition: string,
  form: VerbPrepositionCompoundForm,
): string {
  const normalized = preposition.trim().normalize('NFC').toLowerCase();
  const linkingR = VOWEL_START.test(normalized) ? ' + r' : '';
  return `${FORM_STEMS[form]}${linkingR} + ${normalized}`;
}

/** Every compound that can be an answer, in the preposition grid's order. */
export function getCompoundGrid(form: VerbPrepositionCompoundForm): string[] {
  return PREPOSITION_GRID.map((preposition) => toCompound(preposition, form));
}

/**
 * Build a da(r)-/wo(r)- question from a pattern whose `sentence` and
 * `translation` are the compound row's. Returns null when the pattern can't
 * be asked reliably (see buildVerbPrepositionQuestion).
 */
export function buildVerbPrepositionCompoundQuestion(
  pattern: VerbPrepositionPattern,
  form: VerbPrepositionCompoundForm,
  personExample: string | null,
  options: BuildQuestionOptions = {},
): VerbPrepositionQuestion | null {
  const base = buildVerbPrepositionQuestion(pattern, options);
  if (!base) return null;

  const primaryAnswer = toCompound(base.primaryAnswer, form);
  return {
    ...base,
    buttons: base.buttons.map(
      ({ preposition, enabled }): VerbPrepositionButton => ({
        preposition: toCompound(preposition, form),
        enabled,
      }),
    ),
    primaryAnswer,
    acceptedAnswers: base.acceptedAnswers.map((answer) =>
      toCompound(answer, form),
    ),
    completedSentence: fillBlank(pattern.sentence, primaryAnswer),
    compound: {
      form,
      construction: describeCompound(base.primaryAnswer, form),
      personExample,
    },
  };
}

// ── Session types ────────────────────────────────────────────────────

/** A compound card as loaded from SQLite: adds its pattern's sibling prepositions. */
export interface VerbPrepositionCompoundCardRow extends DueVerbPrepCompoundCard {
  sibling_prepositions: string | null;
}

/** A card whose pattern produced a sound question. */
export interface VerbPrepositionCompoundQuizCard extends DueVerbPrepCompoundCard {
  question: VerbPrepositionQuestion;
}

/** A da(r)-/wo(r)- review session containing due cards and new cards */
export interface VerbPrepositionCompoundQuizSession {
  cards: VerbPrepositionCompoundQuizCard[];
  dueCount: number;
  newCount: number;
}

/**
 * Attach each card's question and drop the ones that can't be asked, so the
 * quiz never shows a compound whose correct button isn't on the grid.
 */
export function buildVerbPrepositionCompoundCards(
  rows: VerbPrepositionCompoundCardRow[],
  random: () => number = Math.random,
): VerbPrepositionCompoundQuizCard[] {
  const cards: VerbPrepositionCompoundQuizCard[] = [];
  for (const { sibling_prepositions, ...card } of rows) {
    const question = buildVerbPrepositionCompoundQuestion(
      card,
      card.form,
      card.person_example,
      {
        siblingPrepositions: parsePrepositionList(sibling_prepositions),
        random,
      },
    );
    if (question) cards.push({ ...card, question });
  }
  return cards;
}

/**
 * Keep the first card per pattern. A pattern's da and wo questions share
 * their answer, so asking both in one session would give the second away.
 * `taken` carries the patterns already used (e.g. by the due cards).
 */
export function onePerPattern<T extends { verb_preposition_id: number }>(
  cards: readonly T[],
  taken: ReadonlySet<number> = new Set(),
): T[] {
  const seen = new Set(taken);
  const result: T[] = [];
  for (const card of cards) {
    if (seen.has(card.verb_preposition_id)) continue;
    seen.add(card.verb_preposition_id);
    result.push(card);
  }
  return result;
}
