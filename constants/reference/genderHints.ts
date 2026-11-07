// Gender hints for the Reference tab: endings and meaning groups that predict
// a German noun's article. Pure static data, no database access.
//
// Every example and exception is a German noun written with its article, so
// the data is language independent. Only the group labels and the strength
// tags are translated (`app:gender_hints.*`).

export type HintArticle = 'der' | 'die' | 'das';

/**
 * `rule` holds with very few exceptions. `tendency` is the way to bet, but
 * learners should expect to meet exceptions.
 */
export type HintStrength = 'rule' | 'tendency';

export interface GenderHint {
  /** Stable id; also the key of the translated label in `gender_hints.hints`. */
  id: string;
  article: HintArticle;
  /** Ending or prefix shown as the headline, e.g. `-ung`. Absent for meaning groups. */
  pattern?: string;
  /** True when `gender_hints.hints.<id>` holds a translated label to show. */
  hasLabel: boolean;
  strength: HintStrength;
  examples: readonly string[];
  exceptions?: readonly string[];
}

export const GENDER_HINTS: readonly GenderHint[] = [
  // ── die ────────────────────────────────────────────────────────────
  {
    id: 'ung',
    article: 'die',
    pattern: '-ung',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Zeitung', 'die Wohnung', 'die Übung'],
  },
  {
    id: 'heit_keit',
    article: 'die',
    pattern: '-heit / -keit',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Gesundheit', 'die Möglichkeit', 'die Freiheit'],
  },
  {
    id: 'schaft',
    article: 'die',
    pattern: '-schaft',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Freundschaft', 'die Gesellschaft', 'die Landschaft'],
  },
  {
    id: 'tion',
    article: 'die',
    pattern: '-tion',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Information', 'die Station', 'die Lektion'],
  },
  {
    id: 'taet',
    article: 'die',
    pattern: '-tät',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Universität', 'die Qualität', 'die Realität'],
  },
  {
    id: 'ei',
    article: 'die',
    pattern: '-ei',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Bäckerei', 'die Polizei', 'die Partei'],
  },
  {
    id: 'ik',
    article: 'die',
    pattern: '-ik',
    hasLabel: false,
    strength: 'rule',
    examples: ['die Musik', 'die Politik', 'die Grammatik'],
    exceptions: ['das Mosaik'],
  },
  {
    id: 'in',
    article: 'die',
    pattern: '-in',
    hasLabel: true,
    strength: 'rule',
    examples: ['die Lehrerin', 'die Freundin', 'die Ärztin'],
  },
  {
    id: 'e',
    article: 'die',
    pattern: '-e',
    hasLabel: true,
    strength: 'tendency',
    examples: ['die Lampe', 'die Blume', 'die Straße'],
    exceptions: ['der Name', 'der Junge', 'das Ende', 'der Käse'],
  },
  {
    id: 'flowers_trees',
    article: 'die',
    hasLabel: true,
    strength: 'tendency',
    examples: ['die Rose', 'die Tulpe', 'die Eiche', 'die Tanne'],
    exceptions: ['der Ahorn'],
  },

  // ── der ────────────────────────────────────────────────────────────
  {
    id: 'days_months_seasons',
    article: 'der',
    hasLabel: true,
    strength: 'rule',
    examples: ['der Montag', 'der Januar', 'der Sommer'],
  },
  {
    id: 'directions',
    article: 'der',
    hasLabel: true,
    strength: 'rule',
    examples: ['der Norden', 'der Süden', 'der Osten', 'der Westen'],
  },
  {
    id: 'male_persons',
    article: 'der',
    hasLabel: true,
    strength: 'rule',
    examples: ['der Mann', 'der Vater', 'der Bruder', 'der Student'],
  },
  {
    id: 'ling',
    article: 'der',
    pattern: '-ling',
    hasLabel: false,
    strength: 'rule',
    examples: ['der Frühling', 'der Schmetterling', 'der Lehrling'],
  },
  {
    id: 'ismus',
    article: 'der',
    pattern: '-ismus',
    hasLabel: false,
    strength: 'rule',
    examples: ['der Tourismus', 'der Realismus', 'der Optimismus'],
  },
  {
    id: 'or',
    article: 'der',
    pattern: '-or',
    hasLabel: false,
    strength: 'tendency',
    examples: ['der Motor', 'der Autor', 'der Professor'],
  },
  {
    id: 'er',
    article: 'der',
    pattern: '-er',
    hasLabel: true,
    strength: 'tendency',
    examples: ['der Lehrer', 'der Computer', 'der Fahrer'],
    exceptions: ['die Mutter', 'die Schwester', 'das Zimmer'],
  },
  {
    id: 'weather',
    article: 'der',
    hasLabel: true,
    strength: 'tendency',
    examples: ['der Regen', 'der Schnee', 'der Wind', 'der Nebel'],
    exceptions: ['das Wetter', 'das Gewitter'],
  },
  {
    id: 'alcohol',
    article: 'der',
    hasLabel: true,
    strength: 'tendency',
    examples: ['der Wein', 'der Schnaps', 'der Wodka'],
    exceptions: ['das Bier'],
  },
  {
    id: 'cars',
    article: 'der',
    hasLabel: true,
    strength: 'rule',
    examples: ['der Mercedes', 'der BMW', 'der Golf'],
  },

  // ── das ────────────────────────────────────────────────────────────
  {
    id: 'chen_lein',
    article: 'das',
    pattern: '-chen / -lein',
    hasLabel: false,
    strength: 'rule',
    examples: ['das Mädchen', 'das Häuschen', 'das Fräulein'],
  },
  {
    id: 'verbs_as_nouns',
    article: 'das',
    hasLabel: true,
    strength: 'rule',
    examples: ['das Essen', 'das Lernen', 'das Leben'],
  },
  {
    id: 'adjectives_as_nouns',
    article: 'das',
    hasLabel: true,
    strength: 'rule',
    examples: ['das Gute', 'das Neue', 'das Beste'],
  },
  {
    id: 'ment',
    article: 'das',
    pattern: '-ment',
    hasLabel: false,
    strength: 'tendency',
    examples: ['das Dokument', 'das Instrument', 'das Medikament'],
    exceptions: ['der Moment', 'der Zement'],
  },
  {
    id: 'um',
    article: 'das',
    pattern: '-um',
    hasLabel: false,
    strength: 'tendency',
    examples: ['das Zentrum', 'das Museum', 'das Datum'],
    exceptions: ['der Reichtum', 'der Irrtum'],
  },
  {
    id: 'ma',
    article: 'das',
    pattern: '-ma',
    hasLabel: false,
    strength: 'tendency',
    examples: ['das Thema', 'das Klima', 'das Drama'],
    exceptions: ['die Firma'],
  },
  {
    id: 'o',
    article: 'das',
    pattern: '-o',
    hasLabel: false,
    strength: 'tendency',
    examples: ['das Auto', 'das Foto', 'das Büro', 'das Kino'],
    exceptions: ['der Euro', 'die Disco'],
  },
  {
    id: 'ge',
    article: 'das',
    pattern: 'Ge-',
    hasLabel: false,
    strength: 'tendency',
    examples: ['das Gebäude', 'das Gemüse', 'das Gepäck', 'das Gebirge'],
    exceptions: ['der Gedanke', 'der Geruch', 'die Gebühr'],
  },
  {
    id: 'metals',
    article: 'das',
    hasLabel: true,
    strength: 'tendency',
    examples: ['das Gold', 'das Silber', 'das Eisen', 'das Kupfer'],
    exceptions: ['der Stahl'],
  },
  {
    id: 'languages',
    article: 'das',
    hasLabel: true,
    strength: 'rule',
    examples: ['das Deutsch', 'das Englisch', 'das Französisch'],
  },
  {
    id: 'venues',
    article: 'das',
    hasLabel: true,
    strength: 'tendency',
    examples: ['das Hotel', 'das Café', 'das Kino', 'das Restaurant'],
  },
];

export const HINT_ARTICLES: readonly HintArticle[] = ['die', 'der', 'das'];

/** Hints for one article, in display order. */
export function getHintsForArticle(article: HintArticle): GenderHint[] {
  return GENDER_HINTS.filter((hint) => hint.article === article);
}
