// Case cheat sheet for the Reference tab: the four cases, the article and
// pronoun tables, and the prepositions grouped by the case they take.
// Pure static data. Everything here is German, so it needs no translation;
// the explanations live in `app:case_sheet.*`.

export type CaseKey = 'nominative' | 'accusative' | 'dative' | 'genitive';

export interface CaseOverview {
  key: CaseKey;
  /** Short form used as a row header in the tables. */
  short: string;
  name: string;
  /** The question that finds this case. */
  question: string;
  example: string;
}

export const CASE_OVERVIEW: readonly CaseOverview[] = [
  {
    key: 'nominative',
    short: 'Nom.',
    name: 'Nominativ',
    question: 'Wer? Was?',
    example: 'Der Mann liest.',
  },
  {
    key: 'accusative',
    short: 'Akk.',
    name: 'Akkusativ',
    question: 'Wen? Was?',
    example: 'Ich sehe den Mann.',
  },
  {
    key: 'dative',
    short: 'Dat.',
    name: 'Dativ',
    question: 'Wem?',
    example: 'Ich helfe dem Mann.',
  },
  {
    key: 'genitive',
    short: 'Gen.',
    name: 'Genitiv',
    question: 'Wessen?',
    example: 'Das ist das Auto des Mannes.',
  },
];

/** Column order for article tables. */
export type ArticleColumn = 'masculine' | 'feminine' | 'neuter' | 'plural';
export const ARTICLE_COLUMNS: readonly ArticleColumn[] = [
  'masculine',
  'feminine',
  'neuter',
  'plural',
];

/** Short headers for the article columns (the grammar gender abbreviations). */
export const ARTICLE_COLUMN_HEADERS: Record<ArticleColumn, string> = {
  masculine: 'der',
  feminine: 'die',
  neuter: 'das',
  plural: 'die (Pl.)',
};

type ArticleRow = Record<ArticleColumn, string>;

/** der, die, das, die. */
export const DEFINITE_ARTICLES: Record<CaseKey, ArticleRow> = {
  nominative: {
    masculine: 'der',
    feminine: 'die',
    neuter: 'das',
    plural: 'die',
  },
  accusative: {
    masculine: 'den',
    feminine: 'die',
    neuter: 'das',
    plural: 'die',
  },
  dative: { masculine: 'dem', feminine: 'der', neuter: 'dem', plural: 'den' },
  genitive: { masculine: 'des', feminine: 'der', neuter: 'des', plural: 'der' },
};

/**
 * ein, kein, mein, dein... share these endings. Plural has no `ein`, so the
 * plural column shows the `kein-` forms (also what mein-, dein- take).
 */
export const INDEFINITE_ARTICLES: Record<CaseKey, ArticleRow> = {
  nominative: {
    masculine: 'ein',
    feminine: 'eine',
    neuter: 'ein',
    plural: 'keine',
  },
  accusative: {
    masculine: 'einen',
    feminine: 'eine',
    neuter: 'ein',
    plural: 'keine',
  },
  dative: {
    masculine: 'einem',
    feminine: 'einer',
    neuter: 'einem',
    plural: 'keinen',
  },
  genitive: {
    masculine: 'eines',
    feminine: 'einer',
    neuter: 'eines',
    plural: 'keiner',
  },
};

export interface PronounRow {
  /** Nominative form, also the row header. */
  nominative: string;
  accusative: string;
  dative: string;
}

export const PERSONAL_PRONOUNS: readonly PronounRow[] = [
  { nominative: 'ich', accusative: 'mich', dative: 'mir' },
  { nominative: 'du', accusative: 'dich', dative: 'dir' },
  { nominative: 'er', accusative: 'ihn', dative: 'ihm' },
  { nominative: 'sie', accusative: 'sie', dative: 'ihr' },
  { nominative: 'es', accusative: 'es', dative: 'ihm' },
  { nominative: 'wir', accusative: 'uns', dative: 'uns' },
  { nominative: 'ihr', accusative: 'euch', dative: 'euch' },
  { nominative: 'sie / Sie', accusative: 'sie / Sie', dative: 'ihnen / Ihnen' },
];

export type PrepositionGroupKey =
  | 'accusative'
  | 'dative'
  | 'two_way'
  | 'genitive';

export interface PrepositionGroup {
  key: PrepositionGroupKey;
  /** Case label shown as the group headline. */
  label: string;
  prepositions: readonly string[];
}

export const PREPOSITION_GROUPS: readonly PrepositionGroup[] = [
  {
    key: 'accusative',
    label: 'Akkusativ',
    prepositions: ['durch', 'für', 'gegen', 'ohne', 'um', 'bis', 'entlang'],
  },
  {
    key: 'dative',
    label: 'Dativ',
    prepositions: [
      'aus',
      'außer',
      'bei',
      'mit',
      'nach',
      'seit',
      'von',
      'zu',
      'gegenüber',
      'ab',
    ],
  },
  {
    key: 'two_way',
    label: 'Akkusativ / Dativ',
    prepositions: [
      'an',
      'auf',
      'hinter',
      'in',
      'neben',
      'über',
      'unter',
      'vor',
      'zwischen',
    ],
  },
  {
    key: 'genitive',
    label: 'Genitiv',
    prepositions: [
      'während',
      'wegen',
      'trotz',
      '(an)statt',
      'außerhalb',
      'innerhalb',
    ],
  },
];

export interface TwoWayExample {
  /** `motion` takes the accusative (wohin?), `location` the dative (wo?). */
  kind: 'motion' | 'location';
  question: string;
  sentence: string;
}

export const TWO_WAY_EXAMPLES: readonly TwoWayExample[] = [
  { kind: 'motion', question: 'Wohin?', sentence: 'Ich gehe in die Schule.' },
  { kind: 'location', question: 'Wo?', sentence: 'Ich bin in der Schule.' },
];
