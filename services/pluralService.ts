// German noun plural-ending quiz: classifies a noun's stored plural into one
// of nine textbook ending patterns by diffing it against the singular.
//
// There's deliberately no rule engine predicting plurals here — German
// plural formation has too many exceptions to guess safely. The ending is
// *derived* from the stored `nouns.plural` string, and anything that doesn't
// fit one of the nine patterns (Museum -> Museen, Bus -> Busse,
// Lehrerin -> Lehrerinnen, ...) classifies as null and is left out of the
// quiz rather than risking a wrong "correct" answer.

import type { DuePluralCard } from '@/types/database';

export type PluralEnding =
  | 'none' // -    Lehrer -> Lehrer
  | 'umlaut' // ¨-   Vater -> Väter
  | 'e' // -e   Hund -> Hunde
  | 'umlaut_e' // ¨-e  Stuhl -> Stühle
  | 'er' // -er  Kind -> Kinder
  | 'umlaut_er' // ¨-er Haus -> Häuser
  | 'n' // -n   Katze -> Katzen
  | 'en' // -en  Frau -> Frauen
  | 's'; // -s   Auto -> Autos

export interface PluralEndingOption {
  ending: PluralEnding;
  /** Textbook notation shown on the answer button. Language-neutral, so never translated. */
  label: string;
}

/**
 * The nine answer buttons in their fixed 3x3 grid order (row by row). The
 * order never changes between questions so learners build muscle memory.
 */
export const PLURAL_ENDINGS: readonly PluralEndingOption[] = [
  { ending: 'none', label: '-' },
  { ending: 'umlaut', label: '¨-' },
  { ending: 'e', label: '-e' },
  { ending: 'umlaut_e', label: '¨-e' },
  { ending: 'er', label: '-er' },
  { ending: 'umlaut_er', label: '¨-er' },
  { ending: 'n', label: '-n' },
  { ending: 'en', label: '-en' },
  { ending: 's', label: '-s' },
];

const ENDING_LABELS = new Map(
  PLURAL_ENDINGS.map((option) => [option.ending, option.label]),
);

/** Textbook notation for an ending, e.g. 'umlaut_er' -> '¨-er'. */
export function getPluralEndingLabel(ending: PluralEnding): string {
  return ENDING_LABELS.get(ending) ?? ending;
}

// ── Classification ───────────────────────────────────────────────────

/** Suffixes accepted when the stem is unchanged (step 2 of the diff). */
const PLAIN_SUFFIXES = new Map<string, PluralEnding>([
  ['', 'none'],
  ['e', 'e'],
  ['er', 'er'],
  ['n', 'n'],
  ['en', 'en'],
  ['s', 's'],
]);

/** Suffixes accepted after undoing a stem-vowel umlaut (step 3 of the diff). */
const UMLAUT_SUFFIXES = new Map<string, PluralEnding>([
  ['', 'umlaut'],
  ['e', 'umlaut_e'],
  ['er', 'umlaut_er'],
]);

// "äu" needs no entry of its own: undoing its "ä" yields "au".
const UNDO_UMLAUT = new Map([
  ['ä', 'a'],
  ['ö', 'o'],
  ['ü', 'u'],
]);

interface PluralAnalysis {
  ending: PluralEnding;
  /** Index in the plural of the stem vowel that took an umlaut, if any. */
  umlautIndex: number | null;
  /** Number of characters the suffix adds to the end of the plural. */
  suffixLength: number;
}

function normalizeWord(word: string): string {
  return word.trim().normalize('NFC');
}

/** What `plural` appends to `singular`, or null if it doesn't start with it. */
function getAddedSuffix(singular: string, plural: string): string | null {
  return plural.startsWith(singular) ? plural.slice(singular.length) : null;
}

/**
 * Diff the stored singular and plural (case-insensitively):
 *   1. plural == singular                      -> '-'
 *   2. plural = singular + e|en|n|er|s         -> that suffix
 *   3. undo ONE umlaut in the plural, then
 *      plural == singular or singular + e|er   -> the umlaut variant
 *   4. anything else                           -> null (excluded from the quiz)
 */
function analyzePlural(
  singular: string | null | undefined,
  plural: string | null | undefined,
): PluralAnalysis | null {
  if (!singular || !plural) return null;

  const singularLower = normalizeWord(singular).toLowerCase();
  const pluralLower = normalizeWord(plural).toLowerCase();
  if (!singularLower || !pluralLower) return null;

  const plainSuffix = getAddedSuffix(singularLower, pluralLower);
  const plainEnding =
    plainSuffix === null ? undefined : PLAIN_SUFFIXES.get(plainSuffix);
  if (plainSuffix !== null && plainEnding) {
    return {
      ending: plainEnding,
      umlautIndex: null,
      suffixLength: plainSuffix.length,
    };
  }

  // Try undoing each umlaut individually — exactly one stem change allowed.
  for (let index = 0; index < pluralLower.length; index++) {
    const baseVowel = UNDO_UMLAUT.get(pluralLower[index]);
    if (!baseVowel) continue;

    const withoutUmlaut =
      pluralLower.slice(0, index) + baseVowel + pluralLower.slice(index + 1);
    const suffix = getAddedSuffix(singularLower, withoutUmlaut);
    const ending = suffix === null ? undefined : UMLAUT_SUFFIXES.get(suffix);
    if (suffix !== null && ending) {
      return { ending, umlautIndex: index, suffixLength: suffix.length };
    }
  }

  return null;
}

/**
 * Classify a noun's stored plural into one of the nine ending patterns.
 * Returns null for anything that doesn't fit — irregular and loan-word
 * plurals, -in -> -innen, -se, multiple stem changes, or a missing plural.
 */
export function getPluralEnding(
  singular: string | null | undefined,
  plural: string | null | undefined,
): PluralEnding | null {
  return analyzePlural(singular, plural)?.ending ?? null;
}

export interface PluralSegment {
  text: string;
  /** True for the parts that make up the ending: the umlauted vowel and the suffix. */
  highlighted: boolean;
}

/**
 * Split the stored plural into plain/highlighted runs for feedback, e.g.
 * Haus/Häuser -> H, [ä], us, [er]. An unclassifiable plural comes back as a
 * single plain segment.
 */
export function getPluralSegments(
  singular: string,
  plural: string,
): PluralSegment[] {
  const display = normalizeWord(plural);
  const analysis = analyzePlural(singular, plural);

  // Indices come from the lowercased string; bail out of highlighting if
  // lowercasing ever changed the length (never happens for German letters).
  if (!analysis || display.toLowerCase().length !== display.length) {
    return [{ text: display, highlighted: false }];
  }

  const suffixStart = display.length - analysis.suffixLength;
  const segments: PluralSegment[] = [];

  if (analysis.umlautIndex === null) {
    segments.push({ text: display.slice(0, suffixStart), highlighted: false });
  } else {
    const umlautIndex = analysis.umlautIndex;
    segments.push(
      { text: display.slice(0, umlautIndex), highlighted: false },
      { text: display[umlautIndex], highlighted: true },
      { text: display.slice(umlautIndex + 1, suffixStart), highlighted: false },
    );
  }
  segments.push({ text: display.slice(suffixStart), highlighted: true });

  return segments.filter((segment) => segment.text.length > 0);
}

// ── Session types ────────────────────────────────────────────────────

/** A plural card whose stored plural classified cleanly into one of the nine endings. */
export interface PluralQuizCard extends DuePluralCard {
  ending: PluralEnding;
}

/** A plural-ending review session containing due cards and new cards */
export interface PluralQuizSession {
  cards: PluralQuizCard[];
  dueCount: number;
  newCount: number;
}

/**
 * Attach each card's ending and drop the ones that don't classify. The quiz
 * never shows a noun whose correct button can't be derived from stored data.
 */
export function classifyPluralCards<
  T extends { german: string; plural: string },
>(cards: T[]): (T & { ending: PluralEnding })[] {
  const classified: (T & { ending: PluralEnding })[] = [];
  for (const card of cards) {
    const ending = getPluralEnding(card.german, card.plural);
    if (ending) classified.push({ ...card, ending });
  }
  return classified;
}
