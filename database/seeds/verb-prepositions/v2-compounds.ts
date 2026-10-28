import type { SeedVerbPrepositionCompound } from '@/types/database';

/**
 * da(r)- and wo(r)- questions for the verb preposition quiz (#151).
 *
 * Each entry belongs to a pattern in `v2-core.ts`, matched by
 * (verb, is_reflexive, preposition). Authoring rules:
 *
 * - Only patterns whose preposition takes a *thing* get an entry. People take
 *   the preposition + a pronoun (`Ich warte auf ihn`), never `darauf`, so
 *   patterns that are about people (`bedanken bei`, `verlieben in`,
 *   `telefonieren mit`) have none. `person_example` shows that form where the
 *   verb also takes a person, and is shown in feedback.
 * - `da_sentence` / `wo_sentence` have exactly one "____" blank, and exactly
 *   one da(r)-/wo(r)- compound fits it. A short lead-in gives `da` something
 *   to refer back to. Verbs with several prepositions need a cue so only one
 *   fits (`freuen auf`: a future event; `freuen über`: something already
 *   happened).
 * - Ambiguous pairs are left out, as in the preposition seed: `helfen bei`
 *   (dabei / damit), `sprechen über` (darüber / davon), `entscheiden für`
 *   (wofür / wozu), `streiten über/um`.
 * - The answer is never stored: it is derived from the pattern's
 *   preposition (+ `alt_prepositions`), so it can't drift from the pattern.
 * - Fixing a sentence later needs a new seed version, so row IDs and card
 *   progress stay intact.
 */
export const verbPrepositionCompoundsV1: SeedVerbPrepositionCompound[] = [
  // ── auf ─────────────────────────────────────────────────────────────
  {
    verb: 'warten',
    preposition: 'auf',
    da_sentence: 'Der Bus kommt gleich. Ich warte ____.',
    da_translation: "I'm waiting for it.",
    wo_sentence: '____ wartest du?',
    wo_translation: 'What are you waiting for?',
    person_example: 'Ich warte auf ihn.',
  },
  {
    verb: 'freuen',
    is_reflexive: true,
    preposition: 'auf',
    da_sentence: 'Nächste Woche beginnt der Urlaub. Ich freue mich schon ____.',
    da_translation: "I'm already looking forward to it.",
    wo_sentence: '____ freust du dich nächste Woche am meisten?',
    wo_translation: 'What are you most looking forward to next week?',
    person_example: 'Ich freue mich auf ihn.',
  },
  {
    verb: 'hoffen',
    preposition: 'auf',
    da_sentence: 'Morgen soll die Sonne scheinen. Wir hoffen ____.',
    da_translation: "We're hoping for it.",
    wo_sentence: '____ hoffst du?',
    wo_translation: 'What are you hoping for?',
    person_example: 'Wir hoffen auf ihn.',
  },
  {
    verb: 'achten',
    preposition: 'auf',
    da_sentence: 'Die Straße ist glatt. Bitte achte ____!',
    da_translation: 'Please watch out for it.',
    wo_sentence: '____ achtest du beim Einkaufen?',
    wo_translation: 'What do you pay attention to when shopping?',
    person_example: 'Bitte achte auf ihn!',
  },
  {
    verb: 'konzentrieren',
    is_reflexive: true,
    preposition: 'auf',
    da_sentence: 'Die Prüfung ist wichtig. Ich muss mich ____ konzentrieren.',
    da_translation: 'I have to concentrate on it.',
    wo_sentence: '____ konzentrierst du dich gerade?',
    wo_translation: 'What are you concentrating on right now?',
  },
  {
    verb: 'vorbereiten',
    is_reflexive: true,
    preposition: 'auf',
    da_sentence: 'Morgen ist die Prüfung. Ich bereite mich ____ vor.',
    da_translation: "I'm preparing for it.",
    wo_sentence: '____ bereitest du dich vor?',
    wo_translation: 'What are you preparing for?',
  },
  {
    verb: 'verzichten',
    preposition: 'auf',
    da_sentence: 'Ich esse zu viel Zucker. Ich verzichte jetzt ____.',
    da_translation: "I'm doing without it now.",
    wo_sentence: '____ würdest du nie verzichten?',
    wo_translation: 'What would you never do without?',
    person_example: 'Ich verzichte nicht auf ihn.',
  },

  // ── über ────────────────────────────────────────────────────────────
  {
    verb: 'freuen',
    is_reflexive: true,
    preposition: 'über',
    da_sentence: 'Das Geschenk ist wirklich toll. Ich freue mich sehr ____.',
    da_translation: "I'm really happy about it.",
    wo_sentence: '____ hast du dich gestern so gefreut?',
    wo_translation: 'What were you so happy about yesterday?',
  },
  {
    verb: 'ärgern',
    is_reflexive: true,
    preposition: 'über',
    da_sentence: 'Der Lärm nervt. Ich ärgere mich ____.',
    da_translation: "I'm annoyed about it.",
    wo_sentence: '____ ärgerst du dich so?',
    wo_translation: 'What are you so annoyed about?',
    person_example: 'Ich ärgere mich über ihn.',
  },
  {
    verb: 'beschweren',
    is_reflexive: true,
    preposition: 'über',
    da_sentence: 'Das Essen war kalt. Die Gäste beschweren sich ____.',
    da_translation: 'The guests are complaining about it.',
    wo_sentence: '____ beschweren sich die Kunden?',
    wo_translation: 'What are the customers complaining about?',
    person_example: 'Die Gäste beschweren sich über ihn.',
  },
  {
    verb: 'diskutieren',
    preposition: 'über',
    da_sentence: 'Die Regel ist neu. Wir diskutieren schon lange ____.',
    da_translation: "We've been discussing it for a long time.",
    wo_sentence: '____ diskutiert ihr?',
    wo_translation: 'What are you discussing?',
    person_example: 'Wir diskutieren über ihn.',
  },
  {
    verb: 'lachen',
    preposition: 'über',
    da_sentence: 'Der Witz war richtig gut. Alle lachen ____.',
    da_translation: 'Everyone is laughing about it.',
    wo_sentence: '____ lacht ihr?',
    wo_translation: 'What are you laughing about?',
    person_example: 'Alle lachen über ihn.',
  },
  {
    verb: 'unterhalten',
    is_reflexive: true,
    preposition: 'über',
    da_sentence: 'Der Urlaub war wunderbar. Wir unterhalten uns oft ____.',
    da_translation: 'We often chat about it.',
    wo_sentence: '____ unterhaltet ihr euch?',
    wo_translation: 'What are you chatting about?',
    person_example: 'Wir unterhalten uns über ihn.',
  },

  // ── um ──────────────────────────────────────────────────────────────
  {
    verb: 'bewerben',
    is_reflexive: true,
    preposition: 'um',
    da_sentence: 'Die Stelle ist noch frei. Ich bewerbe mich ____.',
    da_translation: "I'm applying for it.",
    wo_sentence: '____ bewirbst du dich?',
    wo_translation: 'What are you applying for?',
  },
  {
    verb: 'bitten',
    preposition: 'um',
    da_sentence: 'Ich brauche Hilfe. Ich möchte dich ____ bitten.',
    da_translation: "I'd like to ask you for it.",
    wo_sentence: '____ darf ich dich bitten?',
    wo_translation: 'What may I ask you for?',
  },
  {
    verb: 'kümmern',
    is_reflexive: true,
    preposition: 'um',
    da_sentence: 'Die Katze braucht Futter. Wer kümmert sich ____?',
    da_translation: 'Who is taking care of it?',
    wo_sentence: '____ musst du dich noch kümmern?',
    wo_translation: 'What do you still have to take care of?',
    person_example: 'Ich kümmere mich um ihn.',
  },
  {
    verb: 'gehen',
    preposition: 'um',
    da_sentence:
      'Das Treffen ist wichtig. Es geht ____, eine Lösung zu finden.',
    da_translation: 'The point is to find a solution.',
    wo_sentence: '____ geht es in dem Film?',
    wo_translation: 'What is the film about?',
    person_example: 'In dem Film geht es um ihn.',
  },

  // ── für ─────────────────────────────────────────────────────────────
  {
    verb: 'interessieren',
    is_reflexive: true,
    preposition: 'für',
    da_sentence:
      'Geschichte ist spannend. Mein Bruder interessiert sich sehr ____.',
    da_translation: 'My brother is very interested in it.',
    wo_sentence: '____ interessierst du dich?',
    wo_translation: 'What are you interested in?',
    person_example: 'Ich interessiere mich für ihn.',
  },
  {
    verb: 'sorgen',
    preposition: 'für',
    da_sentence:
      'Wir feiern heute Abend. Wer sorgt ____, dass es genug Getränke gibt?',
    da_translation: 'Who makes sure there are enough drinks?',
    wo_sentence: '____ sorgst du heute Abend?',
    wo_translation: 'What are you providing tonight?',
    person_example: 'Er sorgt für ihn.',
  },

  // ── an ──────────────────────────────────────────────────────────────
  {
    verb: 'denken',
    preposition: 'an',
    da_sentence: 'Es ist dein Geburtstag. Ich denke den ganzen Tag ____.',
    da_translation: "I'm thinking of it all day.",
    wo_sentence: '____ denkst du gerade?',
    wo_translation: 'What are you thinking of right now?',
    person_example: 'Ich denke jeden Tag an ihn.',
  },
  {
    verb: 'erinnern',
    is_reflexive: true,
    preposition: 'an',
    da_sentence: 'Der Urlaub war schön. Ich erinnere mich gern ____.',
    da_translation: 'I like remembering it.',
    wo_sentence: '____ erinnerst du dich?',
    wo_translation: 'What do you remember?',
    person_example: 'Ich erinnere mich gern an ihn.',
  },
  {
    verb: 'halten',
    is_reflexive: true,
    preposition: 'an',
    da_sentence: 'Die Regeln sind klar. Bitte halten Sie sich ____!',
    da_translation: 'Please stick to them.',
    wo_sentence: '____ halten Sie sich?',
    wo_translation: 'What do you stick to?',
  },
  {
    verb: 'teilnehmen',
    preposition: 'an',
    da_sentence: 'Morgen gibt es einen Deutschkurs. Ich nehme ____ teil.',
    da_translation: "I'm taking part in it.",
    wo_sentence: '____ nimmst du teil?',
    wo_translation: 'What are you taking part in?',
  },

  // ── mit ─────────────────────────────────────────────────────────────
  {
    verb: 'aufhören',
    preposition: 'mit',
    da_sentence: 'Der Lärm nervt. Hör bitte ____ auf!',
    da_translation: 'Please stop it.',
    wo_sentence: '____ soll ich aufhören?',
    wo_translation: 'What should I stop?',
  },

  // ── von ─────────────────────────────────────────────────────────────
  {
    verb: 'träumen',
    preposition: 'von',
    da_sentence: 'Ein eigenes Haus wäre schön. Sie träumt schon lange ____.',
    da_translation: "She's long dreamed of it.",
    wo_sentence: '____ träumst du?',
    wo_translation: 'What do you dream of?',
    person_example: 'Ich träume von ihm.',
  },

  // ── zu ──────────────────────────────────────────────────────────────
  {
    verb: 'einladen',
    preposition: 'zu',
    da_sentence: 'Ich gebe eine Party. Ich lade dich ____ ein.',
    da_translation: "I'm inviting you to it.",
    wo_sentence: '____ lädst du uns ein?',
    wo_translation: 'What are you inviting us to?',
  },

  // ── nach ────────────────────────────────────────────────────────────
  {
    verb: 'fragen',
    preposition: 'nach',
    da_sentence: 'Der Weg ist unklar. Ich frage ____.',
    da_translation: "I'm asking about it.",
    wo_sentence: '____ fragst du?',
    wo_translation: 'What are you asking about?',
    person_example: 'Ich frage nach ihm.',
  },
  {
    verb: 'suchen',
    preposition: 'nach',
    da_sentence: 'Der Schlüssel ist weg. Sie sucht schon lange ____.',
    da_translation: "She's been searching for it for a long time.",
    wo_sentence: '____ suchst du?',
    wo_translation: 'What are you searching for?',
    person_example: 'Sie sucht nach ihm.',
  },
  {
    verb: 'riechen',
    preposition: 'nach',
    da_sentence: 'Der Kaffee ist frisch. Das Zimmer riecht ____.',
    da_translation: 'The room smells of it.',
    wo_sentence: '____ riecht es hier?',
    wo_translation: 'What does it smell of here?',
  },
  {
    verb: 'schmecken',
    preposition: 'nach',
    da_sentence: 'Die Suppe hat Zimt. Sie schmeckt ____.',
    da_translation: 'It tastes of it.',
    wo_sentence: '____ schmeckt die Suppe?',
    wo_translation: 'What does the soup taste of?',
  },
  {
    verb: 'sehnen',
    is_reflexive: true,
    preposition: 'nach',
    da_sentence: 'Ruhe wäre schön. Er sehnt sich ____.',
    da_translation: 'He longs for it.',
    wo_sentence: '____ sehnst du dich?',
    wo_translation: 'What do you long for?',
    person_example: 'Er sehnt sich nach ihr.',
  },

  // ── aus ─────────────────────────────────────────────────────────────
  {
    verb: 'bestehen',
    preposition: 'aus',
    da_sentence:
      'Das Frühstück ist einfach: Brot, Käse und Obst. Es besteht ____.',
    da_translation: 'It consists of that.',
    wo_sentence: '____ besteht das Frühstück?',
    wo_translation: 'What does breakfast consist of?',
  },

  // ── vor ─────────────────────────────────────────────────────────────
  {
    verb: 'Angst haben',
    preposition: 'vor',
    da_sentence: 'Spinnen sind eklig. Ich habe Angst ____.',
    da_translation: "I'm afraid of them.",
    wo_sentence: '____ hast du Angst?',
    wo_translation: 'What are you afraid of?',
    person_example: 'Ich habe Angst vor ihm.',
  },
  {
    verb: 'fürchten',
    is_reflexive: true,
    preposition: 'vor',
    da_sentence: 'Der Hund ist riesig. Das Kind fürchtet sich ____.',
    da_translation: 'The child is scared of it.',
    wo_sentence: '____ fürchtest du dich?',
    wo_translation: 'What are you scared of?',
    person_example: 'Das Kind fürchtet sich vor ihm.',
  },
];
