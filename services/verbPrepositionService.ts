// German verb + preposition quiz: builds a cloze question from a stored
// (verb, preposition, case) pattern, picks distractor buttons, and grades
// the answer.
//
// Like pluralService, nothing here predicts grammar. The correct answer, its
// accepted alternates and the governed case all come from the stored
// `verb_prepositions` row; this file only decides which *other* buttons to
// offer. A pattern that can't produce a sound question (no blank in the
// sentence, a preposition that isn't on the button grid) returns null and is
// left out of the quiz rather than risking a wrong "correct" answer.

import type { DueVerbPrepCard, VerbPrepositionCase } from '@/types/database';

// ── Button grid ──────────────────────────────────────────────────────

/**
 * Every preposition that can be an answer, in the fixed order the buttons
 * are laid out. The order never changes between questions so learners build
 * muscle memory; a question only varies which of these are enabled. A
 * pattern whose preposition isn't listed here is excluded from the quiz, so
 * extend this list before seeding a pattern that needs a new preposition.
 */
export const PREPOSITION_GRID: readonly string[] = [
  'an',
  'auf',
  'aus',
  'bei',
  'für',
  'in',
  'mit',
  'nach',
  'über',
  'um',
  'von',
  'vor',
  'zu',
];

/**
 * Enabled buttons per question: every accepted answer plus enough
 * distractors to reach this count.
 */
export const OPTIONS_PER_QUESTION = 8;

// ── Case labels ──────────────────────────────────────────────────────

const CASE_LABELS: Record<VerbPrepositionCase, string> = {
  akk: '+ Akk.',
  dat: '+ Dat.',
  gen: '+ Gen.',
};

/** Textbook notation for a governed case, e.g. 'akk' -> '+ Akk.'. */
export function formatCaseLabel(caseGoverned: VerbPrepositionCase): string {
  return CASE_LABELS[caseGoverned] ?? `+ ${caseGoverned}`;
}

/** The pattern without its case, e.g. 'sich freuen auf'. */
function formatPatternName(pattern: {
  verb: string;
  is_reflexive: number;
  preposition: string;
}): string {
  const reflexive = pattern.is_reflexive ? 'sich ' : '';
  return `${reflexive}${pattern.verb} ${pattern.preposition}`;
}

/** Full pattern as shown in feedback, e.g. 'sich freuen auf + Akk.'. */
export function formatPatternLabel(pattern: {
  verb: string;
  is_reflexive: number;
  preposition: string;
  case_governed: VerbPrepositionCase;
}): string {
  return `${formatPatternName(pattern)} ${formatCaseLabel(pattern.case_governed)}`;
}

// ── Confusion maps ───────────────────────────────────────────────────

/**
 * Prepositions learners mix up with a given pattern, most tempting first,
 * keyed by the pattern without its case (see `formatPatternName`). These
 * are mostly English-interference traps: English "wait *for*" pulls toward
 * `für`, "think *of*" toward `von`, and so on.
 */
const PATTERN_CONFUSIONS: Record<string, readonly string[]> = {
  'warten auf': ['für'],
  'hoffen auf': ['für'],
  'suchen nach': ['für'],
  'bitten um': ['für'],
  'denken an': ['über', 'von'],
  'glauben an': ['in'],
  'teilnehmen an': ['in'],
  'sich freuen auf': ['über'],
  'sich freuen über': ['auf'],
  'sich interessieren für': ['in'],
  'sich kümmern um': ['für'],
  'sich verlieben in': ['an'],
  'abhängen von': ['auf'],
  'bestehen aus': ['von'],
  'Angst haben vor': ['von'],
};

/**
 * Prepositions generally confused with a given answer (similar meaning or
 * the same English gloss), most tempting first. Used after the
 * pattern-specific traps and sibling patterns.
 */
const PREPOSITION_CONFUSIONS: Record<string, readonly string[]> = {
  an: ['auf', 'in', 'zu'],
  auf: ['für', 'an', 'über'],
  aus: ['von', 'bei'],
  bei: ['mit', 'an'],
  für: ['auf', 'um', 'zu'],
  in: ['an', 'auf', 'zu'],
  mit: ['bei', 'von', 'zu'],
  nach: ['um', 'zu', 'auf'],
  über: ['von', 'um', 'an'],
  um: ['für', 'über', 'nach'],
  von: ['über', 'vor', 'aus'],
  vor: ['von', 'für', 'zu'],
  zu: ['an', 'in', 'nach'],
};

// ── Parsing ──────────────────────────────────────────────────────────

const BLANK_PATTERN = /_{2,}/;

function normalizePreposition(preposition: string): string {
  return preposition.trim().normalize('NFC').toLowerCase();
}

/**
 * Parse a stored JSON array of prepositions (`alt_prepositions`). Malformed or non-array
 * values yield no alternates rather than failing the whole question.
 */
export function parsePrepositionList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === 'string')
      .map(normalizePreposition)
      .filter((value) => value.length > 0);
  } catch {
    return [];
  }
}

// ── Questions ────────────────────────────────────────────────────────

export interface VerbPrepositionButton {
  preposition: string;
  /** False for grid buttons that are not offered for this question. */
  enabled: boolean;
}

export interface VerbPrepositionQuestion {
  /** Cloze sentence containing the "____" blank. */
  sentence: string;
  /** English gloss of the sense being tested. */
  translation: string;
  /** The whole grid in its fixed order; only some buttons are enabled. */
  buttons: VerbPrepositionButton[];
  /** The primary answer, e.g. "auf". */
  primaryAnswer: string;
  /** Primary answer plus every accepted alternate; all are graded correct. */
  acceptedAnswers: string[];
  caseGoverned: VerbPrepositionCase;
  /** e.g. "+ Akk." */
  caseLabel: string;
  /** e.g. "warten auf + Akk." */
  patternLabel: string;
  /** The sentence with the primary answer filled in. */
  completedSentence: string;
}

/** The stored pattern fields a question is built from. */
export type VerbPrepositionPattern = Pick<
  DueVerbPrepCard,
  | 'verb'
  | 'is_reflexive'
  | 'preposition'
  | 'alt_prepositions'
  | 'case_governed'
  | 'sentence'
  | 'translation'
>;

export interface BuildQuestionOptions {
  /**
   * Primary prepositions of the other patterns of the same verb. They are
   * the most valuable distractors (the contrast between them is exactly
   * what is being learned), so they are offered first. Anything that is
   * also a valid answer for this sentence is ignored.
   */
  siblingPrepositions?: readonly string[];
  /** Random source in [0, 1), injectable for deterministic tests. */
  random?: () => number;
}

/**
 * Split a cloze sentence around its blank, e.g. "Ich warte ____ meine Frau."
 * -> { before: "Ich warte ", after: " meine Frau." }. Returns null when the
 * sentence has no blank. The UI uses it to render the blank and, in
 * feedback, to highlight the filled-in preposition within the completed
 * sentence (before + filled + after).
 */
export function splitSentenceAtBlank(
  sentence: string,
): { before: string; after: string } | null {
  const blank = BLANK_PATTERN.exec(sentence);
  if (!blank) return null;
  return {
    before: sentence.slice(0, blank.index),
    after: sentence.slice(blank.index + blank[0].length),
  };
}

function fillBlank(sentence: string, preposition: string): string {
  const blank = BLANK_PATTERN.exec(sentence);
  // A blank that opens the sentence is capitalised: "Auf wen wartest du?"
  const filled =
    blank && blank.index === 0
      ? preposition.charAt(0).toUpperCase() + preposition.slice(1)
      : preposition;
  return sentence.replace(BLANK_PATTERN, filled);
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/**
 * Choose which wrong grid buttons to offer alongside the accepted answers. Priority order:
 *   1. sibling patterns of the same verb
 *   2. the pattern's own English-interference traps
 *   3. prepositions generally confused with the answer
 *   4. random fill from the rest of the grid
 * A preposition that is a valid answer (primary or alternate) is never
 * offered, however it got into a list.
 */
function selectDistractors(
  pattern: VerbPrepositionPattern,
  acceptedAnswers: readonly string[],
  siblingPrepositions: readonly string[],
  random: () => number,
): string[] {
  const forbidden = new Set(acceptedAnswers);
  const onGrid = new Set(PREPOSITION_GRID);
  const chosen: string[] = [];

  // Accepted answers are enabled as buttons, so they take up option slots
  const distractorCount = Math.max(
    1,
    OPTIONS_PER_QUESTION - acceptedAnswers.length,
  );

  const take = (candidates: readonly string[]) => {
    for (const candidate of candidates) {
      if (chosen.length >= distractorCount) return;
      const preposition = normalizePreposition(candidate);
      if (
        onGrid.has(preposition) &&
        !forbidden.has(preposition) &&
        !chosen.includes(preposition)
      ) {
        chosen.push(preposition);
      }
    }
  };

  take(siblingPrepositions);
  take(PATTERN_CONFUSIONS[formatPatternName(pattern)] ?? []);
  take(PREPOSITION_CONFUSIONS[normalizePreposition(pattern.preposition)] ?? []);
  take(shuffled(PREPOSITION_GRID, random));

  return chosen;
}

/**
 * Build a cloze question from a stored pattern. Returns null when the
 * pattern can't be asked reliably: the sentence has no blank, or the
 * primary preposition has no button on the grid.
 */
export function buildVerbPrepositionQuestion(
  pattern: VerbPrepositionPattern,
  options: BuildQuestionOptions = {},
): VerbPrepositionQuestion | null {
  const { siblingPrepositions = [], random = Math.random } = options;

  const primaryAnswer = normalizePreposition(pattern.preposition);
  if (!BLANK_PATTERN.test(pattern.sentence)) return null;
  if (!PREPOSITION_GRID.includes(primaryAnswer)) return null;

  const acceptedAnswers = [
    primaryAnswer,
    ...parsePrepositionList(pattern.alt_prepositions).filter(
      (alternate) => alternate !== primaryAnswer,
    ),
  ];

  // Alternates are real answers, so they stay tappable; they are never
  // counted or chosen as distractors.
  const offered = new Set([
    ...acceptedAnswers,
    ...selectDistractors(pattern, acceptedAnswers, siblingPrepositions, random),
  ]);

  return {
    sentence: pattern.sentence,
    translation: pattern.translation,
    buttons: PREPOSITION_GRID.map((preposition) => ({
      preposition,
      enabled: offered.has(preposition),
    })),
    primaryAnswer,
    acceptedAnswers,
    caseGoverned: pattern.case_governed,
    caseLabel: formatCaseLabel(pattern.case_governed),
    patternLabel: formatPatternLabel({
      ...pattern,
      preposition: primaryAnswer,
    }),
    completedSentence: fillBlank(pattern.sentence, primaryAnswer),
  };
}

// ── Grading ──────────────────────────────────────────────────────────

/** True when `selected` is the primary preposition or any accepted alternate. */
export function isCorrectPreposition(
  question: Pick<VerbPrepositionQuestion, 'acceptedAnswers'>,
  selected: string,
): boolean {
  return question.acceptedAnswers.includes(normalizePreposition(selected));
}

// ── Case step (two-way prepositions) ─────────────────────────────────

/**
 * Two-way (Wechsel-) prepositions: they take the accusative or the dative
 * depending on the verb, so for these the case has to be memorised per
 * pattern (denken an + Akk. versus teilnehmen an + Dat.). Every other
 * preposition has one fixed case, so there is nothing to test.
 */
export const TWO_WAY_PREPOSITIONS: readonly string[] = [
  'an',
  'auf',
  'hinter',
  'in',
  'neben',
  'über',
  'unter',
  'vor',
  'zwischen',
];

/** The cases offered on the second tap, in button order. */
export const CASE_STEP_CHOICES: readonly VerbPrepositionCase[] = ['akk', 'dat'];

const CASE_NAMES: Record<VerbPrepositionCase, string> = {
  akk: 'Akkusativ',
  dat: 'Dativ',
  gen: 'Genitiv',
};

/** Full case name for buttons and prose, e.g. 'akk' -> 'Akkusativ'. */
export function formatCaseName(caseGoverned: VerbPrepositionCase): string {
  return CASE_NAMES[caseGoverned] ?? caseGoverned;
}

export function isTwoWayPreposition(preposition: string): boolean {
  return TWO_WAY_PREPOSITIONS.includes(normalizePreposition(preposition));
}

/**
 * Whether answering `selected` correctly should be followed by the
 * Akkusativ/Dativ tap: the pick is a two-way preposition and the pattern's
 * stored case is one of the two buttons. Checks the preposition the learner
 * actually picked, so an accepted alternate that is not two-way (or a
 * pattern that governs the genitive) skips the step.
 */
export function needsCaseStep(
  question: Pick<VerbPrepositionQuestion, 'acceptedAnswers' | 'caseGoverned'>,
  selected: string,
): boolean {
  return (
    isCorrectPreposition(question, selected) &&
    isTwoWayPreposition(selected) &&
    CASE_STEP_CHOICES.includes(question.caseGoverned)
  );
}

export function isCorrectCase(
  question: Pick<VerbPrepositionQuestion, 'caseGoverned'>,
  selectedCase: VerbPrepositionCase,
): boolean {
  return question.caseGoverned === selectedCase;
}

/** SM-2 treats quality below 3 as a failed review that resets the card. */
const MIN_PASSING_QUALITY = 3;

/**
 * The SM-2 quality of a card whose case step was answered. A wrong case
 * caps the quality at the lowest passing grade (3) rather than failing it:
 * the learner knew the preposition, so the card keeps its repetitions and
 * interval but earns a smaller ease boost. A right case leaves the quality
 * from the preposition answer untouched.
 */
export function applyCaseStepToQuality(
  quality: number,
  caseCorrect: boolean,
): number {
  return caseCorrect ? quality : Math.min(quality, MIN_PASSING_QUALITY);
}

// ── Session types ────────────────────────────────────────────────────

/**
 * A verb preposition card as loaded from SQLite: the due-card columns plus
 * the primary prepositions of the verb's other patterns (a JSON array
 * string, or null when the verb has only one pattern).
 */
export interface VerbPrepositionCardRow extends DueVerbPrepCard {
  sibling_prepositions: string | null;
}

/** A card whose pattern produced a sound question. */
export interface VerbPrepositionQuizCard extends DueVerbPrepCard {
  question: VerbPrepositionQuestion;
}

/** A verb preposition review session containing due cards and new cards */
export interface VerbPrepositionQuizSession {
  cards: VerbPrepositionQuizCard[];
  dueCount: number;
  newCount: number;
}

/**
 * Attach each card's question and drop the ones that can't be asked, so the
 * quiz never shows a pattern whose correct button isn't on the grid.
 */
export function buildVerbPrepositionCards(
  rows: VerbPrepositionCardRow[],
  random: () => number = Math.random,
): VerbPrepositionQuizCard[] {
  const cards: VerbPrepositionQuizCard[] = [];
  for (const { sibling_prepositions, ...card } of rows) {
    const question = buildVerbPrepositionQuestion(card, {
      siblingPrepositions: parsePrepositionList(sibling_prepositions),
      random,
    });
    if (question) cards.push({ ...card, question });
  }
  return cards;
}
