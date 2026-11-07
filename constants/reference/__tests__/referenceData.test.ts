/**
 * referenceData.test.ts
 *
 * Static data behind the Reference tab's gender hints and case cheat sheet:
 * every example carries the article its group claims, suffix examples really
 * end in the suffix, and every translated label exists in every locale.
 */

import fs from 'fs';
import path from 'path';

import {
  ARTICLE_COLUMNS,
  CASE_OVERVIEW,
  DEFINITE_ARTICLES,
  INDEFINITE_ARTICLES,
  PERSONAL_PRONOUNS,
  PREPOSITION_GROUPS,
} from '@/constants/reference/cases';
import {
  GENDER_HINTS,
  HINT_ARTICLES,
  getHintsForArticle,
} from '@/constants/reference/genderHints';
import { applyGermanTextPreference } from '@/utils/germanText';

const LOCALES_DIR = path.join(__dirname, '../../../locales');
const locales = fs
  .readdirSync(LOCALES_DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    code: file.replace('.json', ''),
    app: JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8')).app,
  }));

describe('gender hints', () => {
  it('has unique ids and at least one hint per article', () => {
    const ids = GENDER_HINTS.map((hint) => hint.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const article of HINT_ARTICLES) {
      expect(getHintsForArticle(article).length).toBeGreaterThan(0);
    }
  });

  it('writes every example with the article of its group', () => {
    for (const hint of GENDER_HINTS) {
      expect(hint.examples.length).toBeGreaterThan(0);
      for (const example of hint.examples) {
        expect(example.startsWith(`${hint.article} `)).toBe(true);
      }
    }
  });

  it('writes every exception with an article that differs from its group', () => {
    for (const hint of GENDER_HINTS) {
      for (const exception of hint.exceptions ?? []) {
        expect(exception.startsWith(`${hint.article} `)).toBe(false);
        expect(/^(der|die|das) /.test(exception)).toBe(true);
      }
    }
  });

  it('keeps suffix examples ending in the suffix they illustrate', () => {
    for (const hint of GENDER_HINTS) {
      if (!hint.pattern || hint.pattern === 'Ge-') continue;
      const suffixes = hint.pattern
        .split('/')
        .map((part) => part.trim().replace(/^-/, '').toLowerCase());
      for (const example of hint.examples) {
        const noun = example.split(' ')[1].toLowerCase();
        expect(suffixes.some((suffix) => noun.endsWith(suffix))).toBe(true);
      }
    }
  });

  it('keeps Ge- examples starting with Ge', () => {
    const ge = GENDER_HINTS.find((hint) => hint.pattern === 'Ge-');
    for (const example of ge?.examples ?? []) {
      expect(example.split(' ')[1].startsWith('Ge')).toBe(true);
    }
  });
});

describe('case tables', () => {
  it('fills every case and column of both article tables', () => {
    for (const { key } of CASE_OVERVIEW) {
      for (const column of ARTICLE_COLUMNS) {
        expect(DEFINITE_ARTICLES[key][column]).toBeTruthy();
        expect(INDEFINITE_ARTICLES[key][column]).toBeTruthy();
      }
    }
  });

  it('matches the known definite article forms', () => {
    expect(DEFINITE_ARTICLES.accusative.masculine).toBe('den');
    expect(DEFINITE_ARTICLES.dative.plural).toBe('den');
    expect(DEFINITE_ARTICLES.genitive.neuter).toBe('des');
  });

  it('lists all eight personal pronoun rows', () => {
    expect(PERSONAL_PRONOUNS).toHaveLength(8);
  });
});

describe('reference locale strings', () => {
  const hintLabelIds = GENDER_HINTS.filter((hint) => hint.hasLabel).map(
    (hint) => hint.id,
  );

  it.each(locales)(
    '$code has every gender hint and case sheet string',
    ({ app }) => {
      expect(app.reference_screen.tab_label).toBeTruthy();
      expect(app.reference_screen.title).toBeTruthy();
      expect(app.reference_screen.close).toBeTruthy();
      for (const id of hintLabelIds) {
        expect(app.gender_hints.hints[id]).toBeTruthy();
      }
      for (const key of ['die', 'der', 'das']) {
        expect(app.gender_hints.gender[key]).toBeTruthy();
      }
      for (const key of ['rule', 'tendency']) {
        expect(app.gender_hints.strength[key]).toBeTruthy();
      }
      for (const { key } of CASE_OVERVIEW) {
        expect(app.case_sheet.roles[key]).toBeTruthy();
      }
      for (const key of [
        'cases',
        'definite',
        'indefinite',
        'pronouns',
        'prepositions',
      ]) {
        expect(app.case_sheet.sections[key]).toBeTruthy();
      }
    },
  );
});

describe('ß / ss spelling preference', () => {
  const allGermanStrings = [
    ...GENDER_HINTS.flatMap((hint) => [
      hint.pattern ?? '',
      ...hint.examples,
      ...(hint.exceptions ?? []),
    ]),
    ...PREPOSITION_GROUPS.flatMap((group) => [
      group.label,
      ...group.prepositions,
    ]),
  ];

  it('has reference data that contains ß, so the preference matters', () => {
    expect(allGermanStrings.some((text) => text.includes('ß'))).toBe(true);
  });

  it('leaves no ß in any reference string when the ss preference is on', () => {
    for (const text of allGermanStrings) {
      expect(applyGermanTextPreference(text, 'ss')).not.toContain('ß');
    }
  });

  it('keeps ß unchanged for the standard preference', () => {
    expect(applyGermanTextPreference('die Straße', 'eszett')).toBe(
      'die Straße',
    );
    expect(applyGermanTextPreference('die Straße', 'ss')).toBe('die Strasse');
    expect(applyGermanTextPreference('außerhalb', 'ss')).toBe('ausserhalb');
  });
});
