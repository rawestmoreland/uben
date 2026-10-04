import type { SeedVerb } from '@/types/database';

/**
 * A1/A2 verbs for the Präteritum (simple past) quiz feature.
 *
 * Every pronoun's form is spelled out explicitly rather than derived at
 * runtime. The "ich"/"er" form (stored in `past_tense`) and the "wir"/"sie"
 * forms are mechanically regular (bare stem; stem + "-n" or "-en"), but
 * "du" and "ihr" aren't: German inserts an epenthetic "-e-" after stems
 * ending in a dental (d/t) — finden -> "fandest", not "fandst" — while
 * stems ending in a sibilant (s/ß/z) drop the "-s-" instead — essen ->
 * "aßt", not "aßst"/"aßest". Getting that wrong silently at runtime felt
 * worse than just storing the correct form once.
 *
 * Separable verbs store every form as "stem prefix" (e.g. "stand auf"),
 * matching how the infinitive's prefix detaches in a main clause.
 */
export const verbsV1: SeedVerb[] = [
  { infinitive: 'sein', past_tense: 'war', past_du: 'warst', past_wir: 'waren', past_ihr: 'wart', past_sie: 'waren', english: 'to be', level: 'A1' },
  { infinitive: 'haben', past_tense: 'hatte', past_du: 'hattest', past_wir: 'hatten', past_ihr: 'hattet', past_sie: 'hatten', english: 'to have', level: 'A1' },
  { infinitive: 'werden', past_tense: 'wurde', past_du: 'wurdest', past_wir: 'wurden', past_ihr: 'wurdet', past_sie: 'wurden', english: 'to become', level: 'A1' },
  { infinitive: 'können', past_tense: 'konnte', past_du: 'konntest', past_wir: 'konnten', past_ihr: 'konntet', past_sie: 'konnten', english: 'to be able to / can', level: 'A1' },
  { infinitive: 'müssen', past_tense: 'musste', past_du: 'musstest', past_wir: 'mussten', past_ihr: 'musstet', past_sie: 'mussten', english: 'to have to / must', level: 'A1' },
  { infinitive: 'wollen', past_tense: 'wollte', past_du: 'wolltest', past_wir: 'wollten', past_ihr: 'wolltet', past_sie: 'wollten', english: 'to want', level: 'A1' },
  { infinitive: 'sollen', past_tense: 'sollte', past_du: 'solltest', past_wir: 'sollten', past_ihr: 'solltet', past_sie: 'sollten', english: 'to be supposed to', level: 'A1' },
  { infinitive: 'dürfen', past_tense: 'durfte', past_du: 'durftest', past_wir: 'durften', past_ihr: 'durftet', past_sie: 'durften', english: 'to be allowed to', level: 'A1' },
  { infinitive: 'mögen', past_tense: 'mochte', past_du: 'mochtest', past_wir: 'mochten', past_ihr: 'mochtet', past_sie: 'mochten', english: 'to like', level: 'A1' },
  { infinitive: 'gehen', past_tense: 'ging', past_du: 'gingst', past_wir: 'gingen', past_ihr: 'gingt', past_sie: 'gingen', english: 'to go', level: 'A1' },
  { infinitive: 'kommen', past_tense: 'kam', past_du: 'kamst', past_wir: 'kamen', past_ihr: 'kamt', past_sie: 'kamen', english: 'to come', level: 'A1' },
  { infinitive: 'machen', past_tense: 'machte', past_du: 'machtest', past_wir: 'machten', past_ihr: 'machtet', past_sie: 'machten', english: 'to make / do', level: 'A1' },
  { infinitive: 'sagen', past_tense: 'sagte', past_du: 'sagtest', past_wir: 'sagten', past_ihr: 'sagtet', past_sie: 'sagten', english: 'to say', level: 'A1' },
  { infinitive: 'sehen', past_tense: 'sah', past_du: 'sahst', past_wir: 'sahen', past_ihr: 'saht', past_sie: 'sahen', english: 'to see', level: 'A1' },
  { infinitive: 'geben', past_tense: 'gab', past_du: 'gabst', past_wir: 'gaben', past_ihr: 'gabt', past_sie: 'gaben', english: 'to give', level: 'A1' },
  { infinitive: 'nehmen', past_tense: 'nahm', past_du: 'nahmst', past_wir: 'nahmen', past_ihr: 'nahmt', past_sie: 'nahmen', english: 'to take', level: 'A1' },
  { infinitive: 'finden', past_tense: 'fand', past_du: 'fandest', past_wir: 'fanden', past_ihr: 'fandet', past_sie: 'fanden', english: 'to find', level: 'A1' },
  { infinitive: 'wissen', past_tense: 'wusste', past_du: 'wusstest', past_wir: 'wussten', past_ihr: 'wusstet', past_sie: 'wussten', english: 'to know (a fact)', level: 'A1' },
  { infinitive: 'denken', past_tense: 'dachte', past_du: 'dachtest', past_wir: 'dachten', past_ihr: 'dachtet', past_sie: 'dachten', english: 'to think', level: 'A1' },
  { infinitive: 'bringen', past_tense: 'brachte', past_du: 'brachtest', past_wir: 'brachten', past_ihr: 'brachtet', past_sie: 'brachten', english: 'to bring', level: 'A1' },
  { infinitive: 'kennen', past_tense: 'kannte', past_du: 'kanntest', past_wir: 'kannten', past_ihr: 'kanntet', past_sie: 'kannten', english: 'to know (a person/place)', level: 'A1' },
  { infinitive: 'stehen', past_tense: 'stand', past_du: 'standest', past_wir: 'standen', past_ihr: 'standet', past_sie: 'standen', english: 'to stand', level: 'A1' },
  { infinitive: 'sitzen', past_tense: 'saß', past_du: 'saßt', past_wir: 'saßen', past_ihr: 'saßt', past_sie: 'saßen', english: 'to sit', level: 'A1' },
  { infinitive: 'liegen', past_tense: 'lag', past_du: 'lagst', past_wir: 'lagen', past_ihr: 'lagt', past_sie: 'lagen', english: 'to lie (be positioned)', level: 'A1' },
  { infinitive: 'bleiben', past_tense: 'blieb', past_du: 'bliebst', past_wir: 'blieben', past_ihr: 'bliebt', past_sie: 'blieben', english: 'to stay', level: 'A1' },
  { infinitive: 'fahren', past_tense: 'fuhr', past_du: 'fuhrst', past_wir: 'fuhren', past_ihr: 'fuhrt', past_sie: 'fuhren', english: 'to drive / travel', level: 'A1' },
  { infinitive: 'laufen', past_tense: 'lief', past_du: 'liefst', past_wir: 'liefen', past_ihr: 'lieft', past_sie: 'liefen', english: 'to run / walk', level: 'A1' },
  { infinitive: 'fliegen', past_tense: 'flog', past_du: 'flogst', past_wir: 'flogen', past_ihr: 'flogt', past_sie: 'flogen', english: 'to fly', level: 'A2' },
  { infinitive: 'schreiben', past_tense: 'schrieb', past_du: 'schriebst', past_wir: 'schrieben', past_ihr: 'schriebt', past_sie: 'schrieben', english: 'to write', level: 'A1' },
  { infinitive: 'lesen', past_tense: 'las', past_du: 'last', past_wir: 'lasen', past_ihr: 'last', past_sie: 'lasen', english: 'to read', level: 'A1' },
  { infinitive: 'sprechen', past_tense: 'sprach', past_du: 'sprachst', past_wir: 'sprachen', past_ihr: 'spracht', past_sie: 'sprachen', english: 'to speak', level: 'A1' },
  { infinitive: 'essen', past_tense: 'aß', past_du: 'aßt', past_wir: 'aßen', past_ihr: 'aßt', past_sie: 'aßen', english: 'to eat', level: 'A1' },
  { infinitive: 'trinken', past_tense: 'trank', past_du: 'trankst', past_wir: 'tranken', past_ihr: 'trankt', past_sie: 'tranken', english: 'to drink', level: 'A1' },
  { infinitive: 'schlafen', past_tense: 'schlief', past_du: 'schliefst', past_wir: 'schliefen', past_ihr: 'schlieft', past_sie: 'schliefen', english: 'to sleep', level: 'A1' },
  { infinitive: 'arbeiten', past_tense: 'arbeitete', past_du: 'arbeitetest', past_wir: 'arbeiteten', past_ihr: 'arbeitetet', past_sie: 'arbeiteten', english: 'to work', level: 'A1' },
  { infinitive: 'spielen', past_tense: 'spielte', past_du: 'spieltest', past_wir: 'spielten', past_ihr: 'spieltet', past_sie: 'spielten', english: 'to play', level: 'A1' },
  { infinitive: 'lernen', past_tense: 'lernte', past_du: 'lerntest', past_wir: 'lernten', past_ihr: 'lerntet', past_sie: 'lernten', english: 'to learn', level: 'A1' },
  { infinitive: 'wohnen', past_tense: 'wohnte', past_du: 'wohntest', past_wir: 'wohnten', past_ihr: 'wohntet', past_sie: 'wohnten', english: 'to live (reside)', level: 'A1' },
  { infinitive: 'leben', past_tense: 'lebte', past_du: 'lebtest', past_wir: 'lebten', past_ihr: 'lebtet', past_sie: 'lebten', english: 'to live (be alive)', level: 'A1' },
  { infinitive: 'kaufen', past_tense: 'kaufte', past_du: 'kauftest', past_wir: 'kauften', past_ihr: 'kauftet', past_sie: 'kauften', english: 'to buy', level: 'A1' },
  { infinitive: 'verkaufen', past_tense: 'verkaufte', past_du: 'verkauftest', past_wir: 'verkauften', past_ihr: 'verkauftet', past_sie: 'verkauften', english: 'to sell', level: 'A2' },
  { infinitive: 'brauchen', past_tense: 'brauchte', past_du: 'brauchtest', past_wir: 'brauchten', past_ihr: 'brauchtet', past_sie: 'brauchten', english: 'to need', level: 'A1' },
  { infinitive: 'suchen', past_tense: 'suchte', past_du: 'suchtest', past_wir: 'suchten', past_ihr: 'suchtet', past_sie: 'suchten', english: 'to search', level: 'A1' },
  { infinitive: 'fragen', past_tense: 'fragte', past_du: 'fragtest', past_wir: 'fragten', past_ihr: 'fragtet', past_sie: 'fragten', english: 'to ask', level: 'A1' },
  { infinitive: 'antworten', past_tense: 'antwortete', past_du: 'antwortetest', past_wir: 'antworteten', past_ihr: 'antwortetet', past_sie: 'antworteten', english: 'to answer', level: 'A1' },
  { infinitive: 'hören', past_tense: 'hörte', past_du: 'hörtest', past_wir: 'hörten', past_ihr: 'hörtet', past_sie: 'hörten', english: 'to hear', level: 'A1' },
  { infinitive: 'helfen', past_tense: 'half', past_du: 'halfst', past_wir: 'halfen', past_ihr: 'halft', past_sie: 'halfen', english: 'to help', level: 'A1' },
  { infinitive: 'lieben', past_tense: 'liebte', past_du: 'liebtest', past_wir: 'liebten', past_ihr: 'liebtet', past_sie: 'liebten', english: 'to love', level: 'A1' },
  { infinitive: 'beginnen', past_tense: 'begann', past_du: 'begannst', past_wir: 'begannen', past_ihr: 'begannt', past_sie: 'begannen', english: 'to begin', level: 'A2' },
  { infinitive: 'öffnen', past_tense: 'öffnete', past_du: 'öffnetest', past_wir: 'öffneten', past_ihr: 'öffnetet', past_sie: 'öffneten', english: 'to open', level: 'A1' },
  { infinitive: 'schließen', past_tense: 'schloss', past_du: 'schlosst', past_wir: 'schlossen', past_ihr: 'schlosst', past_sie: 'schlossen', english: 'to close', level: 'A2' },
  { infinitive: 'aufstehen', past_tense: 'stand auf', past_du: 'standest auf', past_wir: 'standen auf', past_ihr: 'standet auf', past_sie: 'standen auf', english: 'to get up', is_separable: true, level: 'A1' },
  { infinitive: 'anrufen', past_tense: 'rief an', past_du: 'riefst an', past_wir: 'riefen an', past_ihr: 'rieft an', past_sie: 'riefen an', english: 'to call (phone)', is_separable: true, level: 'A1' },
  { infinitive: 'einkaufen', past_tense: 'kaufte ein', past_du: 'kauftest ein', past_wir: 'kauften ein', past_ihr: 'kauftet ein', past_sie: 'kauften ein', english: 'to shop', is_separable: true, level: 'A1' },
  { infinitive: 'ankommen', past_tense: 'kam an', past_du: 'kamst an', past_wir: 'kamen an', past_ihr: 'kamt an', past_sie: 'kamen an', english: 'to arrive', is_separable: true, level: 'A2' },
  { infinitive: 'anfangen', past_tense: 'fing an', past_du: 'fingst an', past_wir: 'fingen an', past_ihr: 'fingt an', past_sie: 'fingen an', english: 'to start', is_separable: true, level: 'A2' },
  { infinitive: 'mitkommen', past_tense: 'kam mit', past_du: 'kamst mit', past_wir: 'kamen mit', past_ihr: 'kamt mit', past_sie: 'kamen mit', english: 'to come along', is_separable: true, level: 'A2' },
];
