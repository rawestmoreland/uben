// da(r)-/wo(r)- practice for verb + preposition patterns that take a thing.
//
// The same pattern ("warten auf + Akk.") is asked in two forms, each with a
// blank that is the pronominal adverb:
//
//   Ich warte schon lange ____.   -> darauf   (da(r)- + preposition)
//   ____ wartest du?              -> Worauf   (wo(r)- + preposition)
//
// Nothing here stores or predicts grammar beyond the one spelling rule: an
// `r` goes between the da-/wo- and a preposition that starts with a vowel
// (daran, worüber) and not before a consonant (dafür, womit). The pattern's
// preposition, case and sibling patterns come from the stored
// `verb_prepositions` row, and the sentences from `verb_preposition_pronouns`,
// so the result is a regular VerbPrepositionQuestion that the preposition
// quiz screen already knows how to show and grade.

import {
  buildVerbPrepositionQuestion,
  fillBlank,
  parsePrepositionList,
  type PeopleRule,
  type VerbPrepositionQuestion,
  type VerbPrepositionQuizCard,
} from '@/services/verbPrepositionService';
import type { DueVerbPrepCard, VerbPrepositionCase } from '@/types/database';

export type PronounFormat = 'da' | 'wo';

const VOWEL_START = /^[aeiouäöü]/;

/** da(r)-/wo(r)- plus a preposition, e.g. ('da', 'auf') -> 'darauf'. */
export function buildPronounCompound(
  format: PronounFormat,
  preposition: string,
): string {
  const normalized = preposition.trim().normalize('NFC').toLowerCase();
  return `${format}${VOWEL_START.test(normalized) ? 'r' : ''}${normalized}`;
}

// A person takes the preposition + a pronoun in the case the verb governs.
const PERSON_FORMS: Partial<
  Record<VerbPrepositionCase, { pronoun: string; question: string }>
> = {
  akk: { pronoun: 'ihn', question: 'wen' },
  dat: { pronoun: 'ihm', question: 'wem' },
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The rule for people: `auf + Akk.` -> "auf ihn" / "Auf wen", not
 * darauf/worauf. Null when the pattern governs the genitive, which has no
 * such pronoun form.
 */
export function buildPeopleRule(
  preposition: string,
  caseGoverned: VerbPrepositionCase,
): PeopleRule | null {
  const forms = PERSON_FORMS[caseGoverned];
  if (!forms) return null;
  const normalized = preposition.trim().normalize('NFC').toLowerCase();
  return {
    withPronoun: `${normalized} ${forms.pronoun}`,
    question: capitalize(`${normalized} ${forms.question}`),
    thingForms: {
      da: buildPronounCompound('da', normalized),
      wo: buildPronounCompound('wo', normalized),
    },
  };
}

/** The pattern fields a pronoun question is built from. */
export type PronounPattern = Pick<
  DueVerbPrepCard,
  | 'verb'
  | 'is_reflexive'
  | 'preposition'
  | 'case_governed'
  | 'sentence'
  | 'translation'
>;

/**
 * Build the da(r)-/wo(r)- question for a pattern. The cloze sentence is the
 * one for `format`; the button grid keeps its fixed order but shows the
 * compounds. Returns null when the sentence has no blank or the preposition
 * has no button (see buildVerbPrepositionQuestion).
 */
export function buildPronounQuestion(
  pattern: PronounPattern,
  format: PronounFormat,
  options: {
    siblingPrepositions?: readonly string[];
    random?: () => number;
  } = {},
): VerbPrepositionQuestion | null {
  // Alternate prepositions are not carried over: a pronoun sentence is
  // written for the primary preposition only.
  const question = buildVerbPrepositionQuestion(
    { ...pattern, alt_prepositions: null },
    options,
  );
  if (!question) return null;

  const toCompound = (preposition: string) =>
    buildPronounCompound(format, preposition);
  const primaryAnswer = toCompound(question.primaryAnswer);

  return {
    ...question,
    buttons: question.buttons.map((button) => ({
      ...button,
      preposition: toCompound(button.preposition),
    })),
    primaryAnswer,
    acceptedAnswers: question.acceptedAnswers.map(toCompound),
    completedSentence: fillBlank(pattern.sentence, primaryAnswer),
    peopleRule: buildPeopleRule(pattern.preposition, pattern.case_governed),
  };
}

// ── Session types ────────────────────────────────────────────────────

/**
 * A verb_prep_pronoun card as loaded from SQLite: the pattern's columns plus
 * the sentence for each form and the primary prepositions of the verb's
 * other patterns (a JSON array string, or null).
 */
export interface VerbPrepositionPronounCardRow extends Omit<
  DueVerbPrepCard,
  'sentence' | 'translation'
> {
  da_sentence: string;
  da_translation: string;
  wo_sentence: string;
  wo_translation: string;
  sibling_prepositions: string | null;
}

/**
 * Turn each row into a card the preposition quiz can play: the sentence and
 * translation are those of a randomly chosen form, picked once per session so
 * the card keeps one form while it is on screen. Rows that can't produce a
 * sound question are dropped.
 */
export function buildVerbPrepositionPronounCards(
  rows: VerbPrepositionPronounCardRow[],
  random: () => number = Math.random,
): VerbPrepositionQuizCard[] {
  const cards: VerbPrepositionQuizCard[] = [];
  for (const row of rows) {
    const {
      da_sentence,
      da_translation,
      wo_sentence,
      wo_translation,
      sibling_prepositions,
      ...pattern
    } = row;

    const format: PronounFormat = random() < 0.5 ? 'da' : 'wo';
    const card: DueVerbPrepCard = {
      ...pattern,
      sentence: format === 'da' ? da_sentence : wo_sentence,
      translation: format === 'da' ? da_translation : wo_translation,
    };

    const question = buildPronounQuestion(card, format, {
      siblingPrepositions: parsePrepositionList(sibling_prepositions),
      random,
    });
    if (question) cards.push({ ...card, question });
  }
  return cards;
}
