import {
  PLURAL_ENDINGS,
  classifyPluralCards,
  getPluralEnding,
  getPluralEndingLabel,
  getPluralSegments,
  type PluralEnding,
} from '../pluralService';

describe('getPluralEnding()', () => {
  // One case per pattern, mirroring the textbook examples in the issue.
  const patterns: [string, string, PluralEnding][] = [
    ['Lehrer', 'Lehrer', 'none'],
    ['Zimmer', 'Zimmer', 'none'],
    ['Vater', 'Väter', 'umlaut'],
    ['Bruder', 'Brüder', 'umlaut'],
    ['Hund', 'Hunde', 'e'],
    ['Tag', 'Tage', 'e'],
    ['Stuhl', 'Stühle', 'umlaut_e'],
    ['Nacht', 'Nächte', 'umlaut_e'],
    ['Sohn', 'Söhne', 'umlaut_e'],
    ['Kind', 'Kinder', 'er'],
    ['Ei', 'Eier', 'er'],
    ['Haus', 'Häuser', 'umlaut_er'],
    ['Buch', 'Bücher', 'umlaut_er'],
    ['Wort', 'Wörter', 'umlaut_er'],
    ['Katze', 'Katzen', 'n'],
    ['See', 'Seen', 'n'],
    ['Frau', 'Frauen', 'en'],
    ['Herr', 'Herren', 'en'],
    ['Auto', 'Autos', 's'],
    ['Hotel', 'Hotels', 's'],
  ];

  it.each(patterns)('%s -> %s is %s', (singular, plural, expected) => {
    expect(getPluralEnding(singular, plural)).toBe(expected);
  });

  it('covers every one of the nine button patterns', () => {
    const covered = new Set(patterns.map(([, , ending]) => ending));
    expect(covered).toEqual(
      new Set(PLURAL_ENDINGS.map((option) => option.ending)),
    );
  });

  describe('edge cases', () => {
    it.each([
      // -e stems: the added "n" is the ending, not "en"
      ['Junge', 'Jungen', 'n'],
      ['Name', 'Namen', 'n'],
      // "äu" is an umlauted "au"
      ['Baum', 'Bäume', 'umlaut_e'],
      ['Maus', 'Mäuse', 'umlaut_e'],
      ['Raum', 'Räume', 'umlaut_e'],
      // Case differences between the stored strings don't matter
      ['apfel', 'ÄPFEL', 'umlaut'],
      ['KIND', 'kinder', 'er'],
      // Surrounding whitespace is ignored
      [' Hund ', 'Hunde ', 'e'],
      // Singular that already has an umlaut and keeps it unchanged
      ['Mädchen', 'Mädchen', 'none'],
      ['Schüler', 'Schüler', 'none'],
      // ß is just another letter for the diff
      ['Fuß', 'Füße', 'umlaut_e'],
      // Decomposed (NFD) umlauts are normalized before diffing
      ['Vater', 'Väter', 'umlaut'],
    ] as [string, string, PluralEnding][])(
      '%s -> %s is %s',
      (singular, plural, expected) => {
        expect(getPluralEnding(singular, plural)).toBe(expected);
      },
    );

    it.each([
      // Loan-word / Latin / Greek plurals
      ['Museum', 'Museen'],
      ['Thema', 'Themen'],
      ['Firma', 'Firmen'],
      ['Kaktus', 'Kakteen'],
      ['Visum', 'Visa'],
      // -in -> -innen
      ['Lehrerin', 'Lehrerinnen'],
      // -se (doubled consonant)
      ['Bus', 'Busse'],
      ['Zeugnis', 'Zeugnisse'],
      // -us / -o patterns
      ['Globus', 'Globen'],
      ['Konto', 'Konten'],
      // Umlaut combined with a suffix that has no umlaut button
      ['Bank', 'Bänken'],
      ['Wurst', 'Würsts'],
      // Multiple stem changes / irregular stems
      ['Saal', 'Säle'],
      ['Kaufmann', 'Kaufleute'],
      // Umlaut that doesn't correspond to the singular's stem vowel
      ['Hand', 'Hönde'],
      // Suffixes outside the accepted set
      ['Hund', 'Hundes'],
      ['Kind', 'Kinderchen'],
      // Not the same word at all
      ['Hund', 'Katzen'],
      // Plural shorter than the singular
      ['Katzen', 'Katze'],
      // Alternatives stored together
      ['Pizza', 'Pizzas, Pizzen'],
    ])('%s -> %s is excluded (null)', (singular, plural) => {
      expect(getPluralEnding(singular, plural)).toBeNull();
    });

    it.each([
      ['null plural', 'Appetit', null],
      ['undefined plural', 'Appetit', undefined],
      ['empty plural', 'Appetit', ''],
      ['whitespace plural', 'Appetit', '   '],
      ['empty singular', '', 'Hunde'],
    ])('%s is excluded (null)', (_label, singular, plural) => {
      expect(getPluralEnding(singular, plural)).toBeNull();
    });
  });
});

describe('PLURAL_ENDINGS', () => {
  it('lists the nine buttons in the fixed 3x3 order', () => {
    expect(PLURAL_ENDINGS.map((option) => option.label)).toEqual([
      '-',
      '¨-',
      '-e',
      '¨-e',
      '-er',
      '¨-er',
      '-n',
      '-en',
      '-s',
    ]);
  });

  it('has no duplicate endings', () => {
    const endings = PLURAL_ENDINGS.map((option) => option.ending);
    expect(new Set(endings).size).toBe(endings.length);
  });

  it('getPluralEndingLabel() returns the button notation', () => {
    expect(getPluralEndingLabel('umlaut_er')).toBe('¨-er');
    expect(getPluralEndingLabel('none')).toBe('-');
  });
});

describe('getPluralSegments()', () => {
  it('highlights only the suffix for plain endings', () => {
    expect(getPluralSegments('Kind', 'Kinder')).toEqual([
      { text: 'Kind', highlighted: false },
      { text: 'er', highlighted: true },
    ]);
  });

  it('highlights the umlauted vowel and the suffix for umlaut endings', () => {
    expect(getPluralSegments('Haus', 'Häuser')).toEqual([
      { text: 'H', highlighted: false },
      { text: 'ä', highlighted: true },
      { text: 'us', highlighted: false },
      { text: 'er', highlighted: true },
    ]);
  });

  it('highlights just the vowel for a bare umlaut plural', () => {
    expect(getPluralSegments('Vater', 'Väter')).toEqual([
      { text: 'V', highlighted: false },
      { text: 'ä', highlighted: true },
      { text: 'ter', highlighted: false },
    ]);
  });

  it('highlights a word-initial umlaut', () => {
    expect(getPluralSegments('Apfel', 'Äpfel')).toEqual([
      { text: 'Ä', highlighted: true },
      { text: 'pfel', highlighted: false },
    ]);
  });

  it('keeps the stored casing of the plural', () => {
    const text = getPluralSegments('kind', 'Kinder')
      .map((segment) => segment.text)
      .join('');
    expect(text).toBe('Kinder');
  });

  it('highlights nothing for a no-change plural', () => {
    expect(getPluralSegments('Lehrer', 'Lehrer')).toEqual([
      { text: 'Lehrer', highlighted: false },
    ]);
  });

  it('returns the whole plural unhighlighted when it does not classify', () => {
    expect(getPluralSegments('Museum', 'Museen')).toEqual([
      { text: 'Museen', highlighted: false },
    ]);
  });
});

describe('classifyPluralCards()', () => {
  it('attaches the ending and drops nouns that do not classify', () => {
    const rows = [
      { word_id: 1, german: 'Kind', plural: 'Kinder' },
      { word_id: 2, german: 'Museum', plural: 'Museen' },
      { word_id: 3, german: 'Stuhl', plural: 'Stühle' },
      { word_id: 4, german: 'Lehrerin', plural: 'Lehrerinnen' },
      { word_id: 5, german: 'Appetit', plural: '' },
    ];

    expect(classifyPluralCards(rows)).toEqual([
      { word_id: 1, german: 'Kind', plural: 'Kinder', ending: 'er' },
      { word_id: 3, german: 'Stuhl', plural: 'Stühle', ending: 'umlaut_e' },
    ]);
  });

  it('returns an empty list when nothing classifies', () => {
    expect(
      classifyPluralCards([{ german: 'Bus', plural: 'Busse' }]),
    ).toEqual([]);
  });
});
