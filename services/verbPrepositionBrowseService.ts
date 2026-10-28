// Cheat-sheet data for the verb preposition quiz: every stored pattern
// grouped by preposition ("an": denken an, glauben an, sich erinnern an, ...),
// with the learner's mastery where progress exists.
//
// Unlike the quiz, nothing is filtered here: a pattern the quiz can't ask
// (no blank, preposition missing from the button grid) is still a valid
// thing to read, so every seeded pattern is reachable from the screen.
//
// A pattern can have several example sentences, each its own quiz card. The
// cheat sheet lists the pattern once, with its first example and the progress
// of all its cards combined.

import { getDatabase } from '@/database/db';
import type { VerbPrepositionCase } from '@/types/database';
import {
  formatCaseLabel,
  parsePrepositionList,
  PREPOSITION_GRID,
  splitSentenceAtBlank,
} from './verbPrepositionService';

// ── Mastery ──────────────────────────────────────────────────────────

/** Interval in days from which a card counts as mastered (as in statisticsService). */
export const MASTERED_INTERVAL_DAYS = 21;

/** new = never reviewed; learning = reviewed but not yet long-term; mastered = interval >= 21 days. */
export type VerbPrepositionMastery = 'new' | 'learning' | 'mastered';

/** Mastery of one card from its card_progress values (null when it has no progress row). */
export function getMastery(
  progress: { total_reviews: number; interval: number } | null,
): VerbPrepositionMastery {
  if (!progress || progress.total_reviews === 0) return 'new';
  return progress.interval >= MASTERED_INTERVAL_DAYS ? 'mastered' : 'learning';
}

// ── Types ────────────────────────────────────────────────────────────

/** One verb_prepositions row left-joined with its card_progress row. */
export interface VerbPrepositionPatternRow {
  id: number;
  verb: string;
  is_reflexive: number;
  preposition: string;
  alt_prepositions: string | null;
  case_governed: VerbPrepositionCase;
  sentence: string;
  translation: string;
  total_reviews: number | null;
  correct_reviews: number | null;
  interval: number | null;
}

export interface VerbPrepositionBrowseItem {
  /** verb_prepositions.id */
  id: number;
  /** Unique within the whole list, even when a pattern shows under two prepositions. */
  key: string;
  /** e.g. "sich freuen auf" */
  pattern: string;
  /** e.g. "+ Akk." */
  caseLabel: string;
  /** The sense being illustrated, e.g. "to look forward to". */
  translation: string;
  /** Example sentence split around the preposition, which the UI highlights. */
  example: { before: string; preposition: string; after: string };
  /** True when this section is one of the pattern's accepted alternates, not its primary preposition. */
  isAlternate: boolean;
  /** The primary preposition when `isAlternate`, otherwise null. */
  primaryPreposition: string | null;
  /** Other patterns of the same verb, e.g. ["sich freuen über"], so the contrast is visible. */
  contrastPatterns: string[];
  mastery: VerbPrepositionMastery;
  totalReviews: number;
  correctReviews: number;
}

export interface VerbPrepositionBrowseSection {
  preposition: string;
  data: VerbPrepositionBrowseItem[];
}

export interface VerbPrepositionBrowseData {
  sections: VerbPrepositionBrowseSection[];
  /** Number of distinct patterns, not rows in the list (alternates repeat). */
  patternCount: number;
  /** Patterns with at least one review. */
  startedCount: number;
}

// ── Grouping ─────────────────────────────────────────────────────────

function patternName(row: {
  verb: string;
  is_reflexive: number;
  preposition: string;
}): string {
  return `${row.is_reflexive ? 'sich ' : ''}${row.verb} ${row.preposition}`;
}

function verbKey(row: { verb: string; is_reflexive: number }): string {
  return `${row.is_reflexive}:${row.verb}`;
}

/** Sections follow the quiz button grid; any other preposition comes after, alphabetically. */
function compareSections(first: string, second: string): number {
  const firstIndex = PREPOSITION_GRID.indexOf(first);
  const secondIndex = PREPOSITION_GRID.indexOf(second);
  if (firstIndex !== -1 && secondIndex !== -1) return firstIndex - secondIndex;
  if (firstIndex !== -1) return -1;
  if (secondIndex !== -1) return 1;
  return first.localeCompare(second, 'de');
}

function buildExample(
  sentence: string,
  preposition: string,
): VerbPrepositionBrowseItem['example'] {
  const parts = splitSentenceAtBlank(sentence);
  if (!parts) return { before: sentence, preposition: '', after: '' };
  // A blank that opens the sentence needs a capital: "Auf wen wartest du?"
  const filled =
    parts.before === ''
      ? preposition.charAt(0).toUpperCase() + preposition.slice(1)
      : preposition;
  return { ...parts, preposition: filled };
}

/** One pattern: its first example row plus the progress of every example. */
interface PatternGroup {
  row: VerbPrepositionPatternRow;
  masteries: VerbPrepositionMastery[];
  totalReviews: number;
  correctReviews: number;
}

/** New or mastered only when every example is; anything in between is learning. */
function combineMastery(
  masteries: readonly VerbPrepositionMastery[],
): VerbPrepositionMastery {
  if (masteries.every((mastery) => mastery === 'new')) return 'new';
  if (masteries.every((mastery) => mastery === 'mastered')) return 'mastered';
  return 'learning';
}

/** Collapse example rows to one entry per pattern; the first row (lowest id) is the one shown. */
function groupExamplesByPattern(
  rows: readonly VerbPrepositionPatternRow[],
): PatternGroup[] {
  const groups = new Map<string, PatternGroup>();
  for (const row of rows) {
    const key = `${verbKey(row)}:${row.preposition.trim().toLowerCase()}`;
    const mastery = getMastery(
      row.total_reviews === null
        ? null
        : { total_reviews: row.total_reviews, interval: row.interval ?? 0 },
    );
    const group = groups.get(key) ?? {
      row,
      masteries: [],
      totalReviews: 0,
      correctReviews: 0,
    };
    group.masteries.push(mastery);
    group.totalReviews += row.total_reviews ?? 0;
    group.correctReviews += row.correct_reviews ?? 0;
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Group pattern rows by preposition. A pattern appears under its primary
 * preposition and, for genuine synonyms, under each accepted alternate too.
 * Verbs with several patterns (sich freuen auf / über) list their siblings
 * on every row, so the contrast is visible from either section.
 */
export function groupPatternsByPreposition(
  rows: readonly VerbPrepositionPatternRow[],
): VerbPrepositionBrowseData {
  const patterns = groupExamplesByPattern(rows);

  const patternsByVerb = new Map<string, string[]>();
  for (const { row } of patterns) {
    const key = verbKey(row);
    patternsByVerb.set(key, [
      ...(patternsByVerb.get(key) ?? []),
      patternName(row),
    ]);
  }

  const sections = new Map<string, VerbPrepositionBrowseItem[]>();
  let startedCount = 0;

  for (const { row, masteries, totalReviews, correctReviews } of patterns) {
    const primary = row.preposition.trim().toLowerCase();
    const alternates = parsePrepositionList(row.alt_prepositions).filter(
      (alternate) => alternate !== primary,
    );
    const mastery = combineMastery(masteries);
    if (mastery !== 'new') startedCount += 1;

    const ownName = patternName(row);
    const contrastPatterns = (patternsByVerb.get(verbKey(row)) ?? []).filter(
      (name) => name !== ownName,
    );

    for (const preposition of [primary, ...new Set(alternates)]) {
      const isAlternate = preposition !== primary;
      const item: VerbPrepositionBrowseItem = {
        id: row.id,
        key: `${preposition}-${row.id}`,
        pattern: isAlternate ? patternName({ ...row, preposition }) : ownName,
        caseLabel: formatCaseLabel(row.case_governed),
        translation: row.translation,
        example: buildExample(row.sentence, preposition),
        isAlternate,
        primaryPreposition: isAlternate ? primary : null,
        contrastPatterns,
        mastery,
        totalReviews,
        correctReviews,
      };
      sections.set(preposition, [...(sections.get(preposition) ?? []), item]);
    }
  }

  return {
    sections: [...sections.entries()]
      .sort(([first], [second]) => compareSections(first, second))
      .map(([preposition, data]) => ({
        preposition,
        data: data.sort((first, second) =>
          first.pattern.localeCompare(second.pattern, 'de'),
        ),
      })),
    patternCount: patterns.length,
    startedCount,
  };
}

// ── Service ──────────────────────────────────────────────────────────

export class VerbPrepositionBrowseService {
  private get db() {
    return getDatabase();
  }

  /** Every stored pattern grouped by preposition, with mastery where progress exists. */
  async getPatternsByPreposition(): Promise<VerbPrepositionBrowseData> {
    const rows = await this.db.getAllAsync<VerbPrepositionPatternRow>(
      `SELECT
         vp.id,
         vp.verb,
         vp.is_reflexive,
         vp.preposition,
         vp.alt_prepositions,
         vp.case_governed,
         vp.sentence,
         vp.translation,
         cp.total_reviews,
         cp.correct_reviews,
         cp.interval
       FROM verb_prepositions vp
       LEFT JOIN card_progress cp
         ON cp.word_type = 'verb_prep' AND cp.word_id = vp.id
       ORDER BY vp.verb, vp.is_reflexive, vp.id`,
    );
    return groupPatternsByPreposition(rows);
  }
}

export const verbPrepositionBrowseService = new VerbPrepositionBrowseService();
