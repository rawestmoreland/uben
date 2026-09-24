// German adjective declension: pure rule engine + quiz question generator.
// No database access here — this is deliberately testable in isolation.
//
// Adjective endings depend on three things: which case the phrase is in,
// the noun's gender/number, and which of the three "declension types" is in
// play (determined by what precedes the adjective):
//   - weak:   after a der-word (der, die, das, dieser, jede, ...)
//   - mixed:  after an ein-word (ein, kein, mein, dein, ...)
//   - strong: no determiner at all — the adjective itself carries the
//             case/gender marking that a determiner would otherwise carry.

export type GermanCase = 'nominative' | 'accusative' | 'dative' | 'genitive';
export type GermanGender = 'masculine' | 'feminine' | 'neuter' | 'plural';
export type DeclensionType = 'weak' | 'mixed' | 'strong';

type EndingTable = Record<
  DeclensionType,
  Record<GermanCase, Record<GermanGender, string>>
>;

// Standard German adjective ending tables. Dative/genitive and the plural
// gender are included for completeness even though v1's quiz content only
// exercises nominative/accusative singular — see generateDeclensionQuestion.
const ENDINGS: EndingTable = {
  weak: {
    nominative: { masculine: 'e', feminine: 'e', neuter: 'e', plural: 'en' },
    accusative: { masculine: 'en', feminine: 'e', neuter: 'e', plural: 'en' },
    dative: { masculine: 'en', feminine: 'en', neuter: 'en', plural: 'en' },
    genitive: { masculine: 'en', feminine: 'en', neuter: 'en', plural: 'en' },
  },
  mixed: {
    nominative: { masculine: 'er', feminine: 'e', neuter: 'es', plural: 'en' },
    accusative: { masculine: 'en', feminine: 'e', neuter: 'es', plural: 'en' },
    dative: { masculine: 'en', feminine: 'en', neuter: 'en', plural: 'en' },
    genitive: { masculine: 'en', feminine: 'en', neuter: 'en', plural: 'en' },
  },
  strong: {
    nominative: { masculine: 'er', feminine: 'e', neuter: 'es', plural: 'e' },
    accusative: { masculine: 'en', feminine: 'e', neuter: 'es', plural: 'e' },
    dative: { masculine: 'em', feminine: 'er', neuter: 'em', plural: 'en' },
    genitive: { masculine: 'en', feminine: 'er', neuter: 'en', plural: 'er' },
  },
};

/** Look up the correct adjective ending for a given grammatical context. */
export function getAdjectiveEnding(
  declensionType: DeclensionType,
  germanCase: GermanCase,
  gender: GermanGender,
): string {
  return ENDINGS[declensionType][germanCase][gender];
}

// The five endings an adjective can ever take — used as the pool for
// building multiple-choice options (mirrors how these exercises are
// commonly presented: pick the right ending from the full set).
const ALL_ENDINGS = ['e', 'en', 'er', 'es', 'em'] as const;

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Build a shuffled set of ending options containing the correct one plus 3 distractors. */
export function getEndingOptions(correctEnding: string): string[] {
  const wrongPool = ALL_ENDINGS.filter((e) => e !== correctEnding);
  const distractors = shuffle(wrongPool).slice(0, 3);
  return shuffle([correctEnding, ...distractors]);
}

function genderFromArticle(article: 'der' | 'die' | 'das'): GermanGender {
  if (article === 'der') return 'masculine';
  if (article === 'die') return 'feminine';
  return 'neuter';
}

// ── Determiners ──────────────────────────────────────────────────────
// Only nominative/accusative are populated — v1 quiz content is scoped to
// these two cases (the ones A1/A2 learners meet first).

const DETERMINERS: Record<
  DeclensionType,
  Record<'nominative' | 'accusative', Record<GermanGender, string>>
> = {
  weak: {
    nominative: { masculine: 'der', feminine: 'die', neuter: 'das', plural: 'die' },
    accusative: { masculine: 'den', feminine: 'die', neuter: 'das', plural: 'die' },
  },
  mixed: {
    nominative: { masculine: 'ein', feminine: 'eine', neuter: 'ein', plural: 'meine' },
    accusative: { masculine: 'einen', feminine: 'eine', neuter: 'ein', plural: 'meine' },
  },
  strong: {
    nominative: { masculine: '', feminine: '', neuter: '', plural: '' },
    accusative: { masculine: '', feminine: '', neuter: '', plural: '' },
  },
};

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Curated noun contexts ────────────────────────────────────────────
// Deliberately a small, hand-picked list rather than the full `nouns` table:
// a handful of common masculine nouns follow "N-declension" (der Junge →
// den Jungen, der Name → den Namen, ...), which would silently produce
// grammatically wrong accusative sentences if we pulled a random noun.
// Every noun below inflects regularly.

export interface DeclensionNoun {
  german: string;
  article: 'der' | 'die' | 'das';
}

export const DECLENSION_NOUNS: DeclensionNoun[] = [
  { german: 'Mann', article: 'der' },
  { german: 'Tisch', article: 'der' },
  { german: 'Hund', article: 'der' },
  { german: 'Apfel', article: 'der' },
  { german: 'Garten', article: 'der' },
  { german: 'Frau', article: 'die' },
  { german: 'Katze', article: 'die' },
  { german: 'Lampe', article: 'die' },
  { german: 'Blume', article: 'die' },
  { german: 'Straße', article: 'die' },
  { german: 'Haus', article: 'das' },
  { german: 'Kind', article: 'das' },
  { german: 'Auto', article: 'das' },
  { german: 'Buch', article: 'das' },
  { german: 'Fenster', article: 'das' },
];

// ── Sentence templates ───────────────────────────────────────────────
// Nominative templates put the blank at the start of the sentence, so they
// only pair with weak/mixed declension (determiner is always present —
// "Der ___ Mann ..." / "Ein ___ Mann ..."), never with strong declension,
// which would leave a bare, uncapitalized adjective as the first word.
// Accusative templates put the blank mid-sentence, so all three declension
// types (including strong, with no determiner at all) work cleanly there.

const BLANK = '\u0000';

const NOMINATIVE_TEMPLATES: ((det: string, noun: string) => string)[] = [
  (det, noun) => `${capitalize(det)} ${BLANK} ${noun} ist hier.`,
  (det, noun) => `${capitalize(det)} ${BLANK} ${noun} gefällt mir.`,
];

const ACCUSATIVE_TEMPLATES: ((det: string, noun: string) => string)[] = [
  (det, noun) => `Ich sehe ${det ? det + ' ' : ''}${BLANK} ${noun}.`,
  (det, noun) => `Wir kaufen ${det ? det + ' ' : ''}${BLANK} ${noun}.`,
];

export interface AdjectiveDeclensionQuestion {
  /** Sentence text before the blank */
  before: string;
  /** Sentence text after the blank (includes the noun and rest of the sentence) */
  after: string;
  /** The correct fully-inflected adjective, e.g. "kleine" */
  correctAnswer: string;
  /** Shuffled multiple-choice options, always including correctAnswer */
  options: string[];
  adjectiveBase: string;
  english: string;
  germanCase: GermanCase;
  gender: GermanGender;
  declensionType: DeclensionType;
}

/**
 * Generate one adjective-declension quiz question for the given adjective,
 * picking a random noun context, case, and declension type each time so the
 * same adjective is drilled in varied grammatical contexts across reviews.
 */
export function generateDeclensionQuestion(adjective: {
  german: string;
  english: string;
}): AdjectiveDeclensionQuestion {
  const noun = pickRandom(DECLENSION_NOUNS);
  const gender = genderFromArticle(noun.article);

  const germanCase: 'nominative' | 'accusative' =
    Math.random() < 0.5 ? 'nominative' : 'accusative';

  const declensionType: DeclensionType =
    germanCase === 'nominative'
      ? pickRandom<DeclensionType>(['weak', 'mixed'])
      : pickRandom<DeclensionType>(['weak', 'mixed', 'strong']);

  const ending = getAdjectiveEnding(declensionType, germanCase, gender);
  const determiner = DETERMINERS[declensionType][germanCase][gender];
  const correctAnswer = `${adjective.german}${ending}`;

  const templateFn = pickRandom(
    germanCase === 'nominative' ? NOMINATIVE_TEMPLATES : ACCUSATIVE_TEMPLATES,
  );
  const rawSentence = templateFn(determiner, noun.german);
  const [before, after] = rawSentence.split(BLANK);

  return {
    before: before.trim(),
    after: after.trim(),
    correctAnswer,
    options: getEndingOptions(ending).map((e) => `${adjective.german}${e}`),
    adjectiveBase: adjective.german,
    english: adjective.english,
    germanCase,
    gender,
    declensionType,
  };
}
