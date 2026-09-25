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

/**
 * Append a declension ending to an adjective's base form. A handful of
 * common adjectives (leise, müde, ...) already end in an unstressed "e" in
 * their base form; since every possible ending also starts with "e", that
 * trailing "e" is elided first — "leise" + "en" → "leisen", not "leiseen".
 */
function inflect(adjectiveBase: string, ending: string): string {
  const stem = adjectiveBase.endsWith('e')
    ? adjectiveBase.slice(0, -1)
    : adjectiveBase;
  return `${stem}${ending}`;
}

// ── Curated noun contexts ────────────────────────────────────────────
// Deliberately a small, hand-picked list rather than the full `nouns` table:
// a handful of common masculine nouns follow "N-declension" (der Junge →
// den Jungen, der Name → den Namen, ...), which would silently produce
// grammatically wrong accusative sentences if we pulled a random noun.
// Every noun below inflects regularly.
//
// `animate` marks people/animals, so emotion/health adjectives ("traurig",
// "müde", ...) only ever get paired with a noun that can plausibly feel or
// be described that way — see ADJECTIVE_CONTEXTS below.

export interface DeclensionNoun {
  german: string;
  article: 'der' | 'die' | 'das';
  animate: boolean;
}

export const DECLENSION_NOUNS: DeclensionNoun[] = [
  { german: 'Mann', article: 'der', animate: true },
  { german: 'Tisch', article: 'der', animate: false },
  { german: 'Hund', article: 'der', animate: true },
  { german: 'Apfel', article: 'der', animate: false },
  { german: 'Garten', article: 'der', animate: false },
  { german: 'Frau', article: 'die', animate: true },
  { german: 'Katze', article: 'die', animate: true },
  { german: 'Lampe', article: 'die', animate: false },
  { german: 'Blume', article: 'die', animate: false },
  { german: 'Straße', article: 'die', animate: false },
  { german: 'Haus', article: 'das', animate: false },
  { german: 'Kind', article: 'das', animate: true },
  { german: 'Auto', article: 'das', animate: false },
  { german: 'Buch', article: 'das', animate: false },
  { german: 'Fenster', article: 'das', animate: false },
];

// Bare mass nouns — the only nouns "strong" declension (no determiner at
// all) reads naturally with in a simple sentence. German doesn't drop the
// article for a singular countable noun ("Ich sehe traurige Straße" is
// wrong; it needs "die"/"eine"), but it does for uncountable nouns like
// these ("Ich trinke kalten Kaffee").
export interface MassNoun {
  german: string;
  gender: GermanGender;
}

export const MASS_NOUNS: MassNoun[] = [
  { german: 'Kaffee', gender: 'masculine' },
  { german: 'Tee', gender: 'masculine' },
  { german: 'Wein', gender: 'masculine' },
  { german: 'Wasser', gender: 'neuter' },
  { german: 'Bier', gender: 'neuter' },
  { german: 'Milch', gender: 'feminine' },
];

// ── Adjective → noun-context compatibility ───────────────────────────
// Which kinds of nouns a given adjective can sensibly modify. Prevents
// nonsensical pairings like "sad street" (emotion words should only get
// animate nouns) and "important coffee" (abstract/social adjectives
// shouldn't get bare mass nouns). Adjectives not listed default to
// ['object', 'animate'] — safe with any curated noun, but never with a
// mass noun unless explicitly opted in.
type NounContext = 'object' | 'animate' | 'drink';

const DEFAULT_CONTEXTS: NounContext[] = ['object', 'animate'];

const ADJECTIVE_CONTEXTS: Record<string, NounContext[]> = {
  groß: ['object', 'animate', 'drink'],
  klein: ['object', 'animate', 'drink'],
  neu: ['object', 'animate'],
  alt: ['object', 'animate', 'drink'],
  gut: ['object', 'animate', 'drink'],
  schön: ['object', 'animate'],
  jung: ['animate'],
  lang: ['object'],
  kurz: ['object'],
  warm: ['object', 'drink'],
  kalt: ['object', 'drink'],
  schnell: ['object', 'animate'],
  langsam: ['object', 'animate'],
  billig: ['object', 'drink'],
  hell: ['object', 'drink'],
  laut: ['object', 'animate'],
  leise: ['object', 'animate'],
  stark: ['object', 'animate', 'drink'],
  schwach: ['object', 'animate', 'drink'],
  breit: ['object'],
  schmal: ['object'],
  schmutzig: ['object'],
  voll: ['object'],
  leer: ['object'],
  offen: ['object'],
  frisch: ['object', 'drink'],
  reich: ['animate'],
  arm: ['animate'],
  glücklich: ['animate'],
  traurig: ['animate'],
  müde: ['animate'],
  krank: ['animate'],
  gesund: ['animate'],
  freundlich: ['animate'],
  nett: ['animate'],
  wichtig: ['object', 'animate'],
  einfach: ['object'],
  schwierig: ['object', 'animate'],
  interessant: ['object', 'animate'],
  modern: ['object'],
};

function getContextsFor(adjectiveGerman: string): NounContext[] {
  return ADJECTIVE_CONTEXTS[adjectiveGerman] ?? DEFAULT_CONTEXTS;
}

// ── Sentence templates ───────────────────────────────────────────────
// Nominative templates put the blank at the start of the sentence, so they
// only pair with weak/mixed declension (determiner is always present —
// "Der ___ Mann ..." / "Ein ___ Mann ..."), never with strong declension,
// which would leave a bare, uncapitalized adjective as the first word.
// Accusative templates put the blank mid-sentence, so all three declension
// types work cleanly there — but strong declension there always pairs with
// a MASS_NOUNS entry (via ACCUSATIVE_MASS_NOUN_TEMPLATES), never a
// DECLENSION_NOUNS one, since a countable noun always needs its article.

const BLANK = '\u0000';

const NOMINATIVE_TEMPLATES: ((det: string, noun: string) => string)[] = [
  (det, noun) => `${capitalize(det)} ${BLANK} ${noun} ist hier.`,
  (det, noun) => `${capitalize(det)} ${BLANK} ${noun} gefällt mir.`,
];

// "kaufen" (buy) only makes sense with an object — never use it with an
// animate noun ("Wir kaufen die arme Frau" reads as buying a person).
const ACCUSATIVE_OBJECT_TEMPLATES: ((det: string, noun: string) => string)[] = [
  (det, noun) => `Ich sehe ${det ? det + ' ' : ''}${BLANK} ${noun}.`,
  (det, noun) => `Wir kaufen ${det ? det + ' ' : ''}${BLANK} ${noun}.`,
];

const ACCUSATIVE_ANIMATE_TEMPLATES: ((det: string, noun: string) => string)[] = [
  (det, noun) => `Ich sehe ${det ? det + ' ' : ''}${BLANK} ${noun}.`,
  (det, noun) => `Ich kenne ${det ? det + ' ' : ''}${BLANK} ${noun}.`,
];

const ACCUSATIVE_MASS_NOUN_TEMPLATES: ((det: string, noun: string) => string)[] = [
  (_det, noun) => `Ich trinke ${BLANK} ${noun}.`,
  (_det, noun) => `Wir kaufen ${BLANK} ${noun}.`,
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
  /** Plain-language explanation of why correctAnswer takes this ending */
  explanation: string;
}

const GENDER_LABELS: Record<GermanGender, string> = {
  masculine: 'masculine',
  feminine: 'feminine',
  neuter: 'neuter',
  plural: 'plural',
};

const CASE_LABELS: Record<'nominative' | 'accusative', string> = {
  nominative: 'nominative (the subject)',
  accusative: 'accusative (the direct object)',
};

/**
 * Build a plain-language explanation of why `ending` is correct here, tied
 * to the actual grammatical trigger (determiner type + case + gender) so it
 * reinforces the rule rather than just restating the answer.
 */
function explainEnding(
  declensionType: DeclensionType,
  germanCase: 'nominative' | 'accusative',
  gender: GermanGender,
  determiner: string,
  ending: string,
): string {
  const genderLabel = GENDER_LABELS[gender];
  const caseLabel = CASE_LABELS[germanCase];

  if (declensionType === 'weak') {
    return `"${determiner}" is a der-word, and it already marks the ${genderLabel} ${caseLabel} — so the adjective just takes the weak ending "-${ending}".`;
  }
  if (declensionType === 'mixed') {
    return `After the ein-word "${determiner}", the adjective takes "-${ending}" here: ${genderLabel} ${caseLabel}.`;
  }
  return `With no article at all, the adjective itself has to show the gender and case — that's why it takes the strong ending "-${ending}" (${genderLabel} ${caseLabel}).`;
}

/**
 * Generate one adjective-declension quiz question for the given adjective,
 * picking a random noun context, case, and declension type each time so the
 * same adjective is drilled in varied grammatical contexts across reviews.
 *
 * The noun (and, for strong declension, whether a bare mass noun is even an
 * option) is chosen based on which contexts this adjective is tagged for —
 * see ADJECTIVE_CONTEXTS — so the generator never produces a nonsensical
 * pairing like "sad street" or a grammatically bare "important coffee".
 */
export function generateDeclensionQuestion(adjective: {
  german: string;
  english: string;
}): AdjectiveDeclensionQuestion {
  const contexts = getContextsFor(adjective.german);

  const germanCase: 'nominative' | 'accusative' =
    Math.random() < 0.5 ? 'nominative' : 'accusative';

  const candidateTypes: DeclensionType[] =
    germanCase === 'nominative'
      ? ['weak', 'mixed']
      : ['weak', 'mixed', 'strong'];
  // Only offer strong declension if this adjective is tagged for drink
  // contexts — it's the only pool strong declension can grammatically draw
  // from (see MASS_NOUNS above).
  const availableTypes = candidateTypes.filter(
    (t) => t !== 'strong' || contexts.includes('drink'),
  );
  const declensionType = pickRandom(availableTypes);

  let gender: GermanGender;
  let nounGerman: string;
  let templateFn: (det: string, noun: string) => string;

  if (declensionType === 'strong') {
    const massNoun = pickRandom(MASS_NOUNS);
    gender = massNoun.gender;
    nounGerman = massNoun.german;
    templateFn = pickRandom(ACCUSATIVE_MASS_NOUN_TEMPLATES);
  } else {
    // A noun is only eligible if this adjective is tagged for its category —
    // an inanimate noun needs 'object', an animate one needs 'animate'.
    // (Not an OR: an adjective tagged only ['object'] must never land on an
    // animate noun like "Mann", e.g. "billig" describing a person.)
    const eligibleNouns = DECLENSION_NOUNS.filter((n) =>
      n.animate ? contexts.includes('animate') : contexts.includes('object'),
    );
    const noun = pickRandom(eligibleNouns);
    gender = genderFromArticle(noun.article);
    nounGerman = noun.german;
    if (germanCase === 'nominative') {
      templateFn = pickRandom(NOMINATIVE_TEMPLATES);
    } else {
      templateFn = pickRandom(
        noun.animate ? ACCUSATIVE_ANIMATE_TEMPLATES : ACCUSATIVE_OBJECT_TEMPLATES,
      );
    }
  }

  const ending = getAdjectiveEnding(declensionType, germanCase, gender);
  const determiner = DETERMINERS[declensionType][germanCase][gender];
  const correctAnswer = inflect(adjective.german, ending);

  const rawSentence = templateFn(determiner, nounGerman);
  const [before, after] = rawSentence.split(BLANK);

  return {
    before: before.trim(),
    after: after.trim(),
    correctAnswer,
    options: getEndingOptions(ending).map((e) => inflect(adjective.german, e)),
    adjectiveBase: adjective.german,
    english: adjective.english,
    germanCase,
    gender,
    declensionType,
    explanation: explainEnding(declensionType, germanCase, gender, determiner, ending),
  };
}
