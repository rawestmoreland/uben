// Layout spec (coordinates in original en-US screenshot pixels) + copy for every locale.
// Detection of the real text boxes happens at render time; rects only tell the detector where to look.

const PHONE_DIR = 'APP_IPHONE_65';
const PAD_DIR = 'APP_IPAD_PRO_3GEN_129';

// Order = sorted filename order = visual order (hero, SRS, streak, vocab, offline, daily)
const FILES = {
  [PHONE_DIR]: [
    'CleanShot 2026-02-07 at 22.13.26@2x.png',
    'CleanShot 2026-02-07 at 22.15.05@2x.png',
    'CleanShot 2026-02-07 at 22.16.30@2x.png',
    'CleanShot 2026-02-07 at 22.17.35@2x.png',
    'CleanShot 2026-02-07 at 22.18.36@2x.png',
    'CleanShot 2026-02-07 at 22.19.34@2x.png',
  ],
  [PAD_DIR]: [
    'CleanShot 2026-02-11 at 15.40.37@2x.png',
    'CleanShot 2026-02-11 at 15.42.07@2x.png',
    'CleanShot 2026-02-11 at 15.43.07@2x.png',
    'CleanShot 2026-02-11 at 15.43.36@2x.png',
    'CleanShot 2026-02-11 at 15.44.13@2x.png',
    'CleanShot 2026-02-11 at 15.44.57@2x.png',
  ],
};

const OUT_NAMES = [
  '01-master-articles.png',
  '02-spaced-repetition.png',
  '03-streak.png',
  '04-vocabulary.png',
  '05-offline.png',
  '06-daily.png',
];

// Header: title lines (ink color per image) + subtitle. hdr.ink: 'dark' | 'white'
// Elements: key, rect [x0,y0,x1,y1], w (font weight), mode (left|center), ink, ref (English lines)
const LAYOUT = {
  [PHONE_DIR]: {
    hdr: { x0: 60, x1: 1182, top: 60, nTitle: [3, 3, 2, 2, 3, 3], ink: ['dark', 'dark', 'dark', 'dark', 'dark', 'dark'] },
    els: [
      [],
      [
        { key: 'cards', rect: [120, 1600, 560, 1710], w: 800, mode: 'center', ink: 'dark' },
        { key: 'success', rect: [670, 1600, 1185, 1710], w: 800, mode: 'center', ink: 'dark' },
        { key: 'reviews', rect: [120, 2090, 560, 2210], w: 800, mode: 'center', ink: 'dark' },
        { key: 'due', rect: [670, 2090, 1185, 2210], w: 800, mode: 'center', ink: 'dark' },
        { key: 'mastered', rect: [120, 2420, 860, 2490], w: 800, mode: 'center', ink: 'dark' },
      ],
      [
        { key: 'streak', rect: [130, 1500, 1100, 1650], w: 900, mode: 'center', ink: 'white' },
        { key: 'i1', rect: [370, 2040, 1120, 2150], w: 800, mode: 'left', ink: 'dark' },
        { key: 'i2', rect: [370, 2390, 1120, 2510], w: 800, mode: 'left', ink: 'dark' },
      ],
      [
        { key: 'word', rect: [80, 850, 700, 925], w: 800, mode: 'left', ink: 'dark' },
        { key: 'article', rect: [80, 1265, 700, 1340], w: 800, mode: 'left', ink: 'dark' },
        { key: 'plural', rect: [80, 1675, 700, 1750], w: 800, mode: 'left', ink: 'dark' },
        { key: 'add', rect: [150, 2240, 1080, 2335], w: 900, mode: 'center', ink: 'dark' },
      ],
      [
        { key: 'o1', rect: [370, 1164, 1120, 1284], w: 800, mode: 'left', ink: 'dark' },
        { key: 'o2', rect: [370, 1515, 1120, 1635], w: 800, mode: 'left', ink: 'dark' },
        { key: 'o3', rect: [370, 1869, 1120, 1989], w: 800, mode: 'left', ink: 'dark' },
        { key: 'o4', rect: [370, 2221, 1120, 2341], w: 800, mode: 'left', ink: 'dark' },
        { key: 'o5', rect: [370, 2574, 1120, 2687], w: 800, mode: 'left', ink: 'dark' },
      ],
      [
        { key: 'session', rect: [140, 1620, 1100, 1900], w: 900, mode: 'center', ink: 'white' },
        { key: 'reviewed', rect: [140, 1905, 1100, 2090], w: 800, mode: 'center', ink: 'dark' },
        { key: 'correct', rect: [115, 2640, 570, 2688], w: 800, mode: 'center', ink: 'dark' },
        { key: 'wrong', rect: [670, 2640, 1130, 2688], w: 800, mode: 'center', ink: 'dark' },
      ],
    ],
    bandBottomX: [60, 1182],
    bandSearchFrom: 400,
    clipFrom: null,
  },
  [PAD_DIR]: {
    hdr: { x0: 200, x1: 1864, top: 170, nTitle: [2, 3, 2, 2, 3, 3], ink: ['dark', 'white', 'dark', 'white', 'white', 'dark'] },
    els: [
      [],
      [
        { key: 'cards', rect: [300, 1810, 890, 1990], w: 800, mode: 'center', ink: 'dark' },
        { key: 'success', rect: [1050, 1810, 1740, 1990], w: 800, mode: 'center', ink: 'dark' },
      ],
      [{ key: 'streak', rect: [400, 2100, 1680, 2340], w: 900, mode: 'center', ink: 'white' }],
      [
        { key: 'word', rect: [250, 1180, 1000, 1310], w: 800, mode: 'left', ink: 'dark' },
        { key: 'article', rect: [250, 1700, 1000, 1840], w: 800, mode: 'left', ink: 'dark' },
        { key: 'plural', rect: [250, 2250, 1000, 2385], w: 800, mode: 'left', ink: 'dark' },
      ],
      [
        { key: 'o1', rect: [640, 1500, 1760, 1730], w: 800, mode: 'left', ink: 'dark' },
        { key: 'o2', rect: [640, 2000, 1760, 2230], w: 800, mode: 'left', ink: 'dark' },
        { key: 'o3', rect: [640, 2480, 1760, -1], w: 800, mode: 'left', ink: 'dark' },
      ],
      [{ key: 'session', rect: [330, 2250, 1740, -1], w: 900, mode: 'center', ink: 'white' }],
    ],
    bandBottomX: [170, 1894],
    bandSearchFrom: 250,
    clipFrom: 2560,
  },
};

// ---------- copy ----------
const EN = [
  { t: { p: ['MASTER', 'DER, DIE,', 'DAS'], d: ['MASTER', 'DER, DIE, DAS'] }, s: 'Finally remember German articles', e: {} },
  { t: ['SMART', 'SPACED', 'REPETITION'], s: 'Practice at the perfect time', e: { cards: 'CARDS', success: 'SUCCESS', reviews: 'REVIEWS', due: 'DUE TODAY', mastered: '75% MASTERED' } },
  { t: ['BUILD YOUR', 'STREAK'], s: 'Keep the momentum going', e: { streak: 'DAY STREAK', i1: 'Daily practice tracking', i2: 'Detailed statistics' } },
  { t: ['BUILD YOUR', 'VOCABULARY'], s: 'Add words as you learn them', e: { word: 'GERMAN WORD', article: 'ARTICLE', plural: 'PLURAL', add: 'ADD WORD' } },
  { t: ['WORKS', 'COMPLETELY', 'OFFLINE'], s: 'Your data stays on your device', e: { o1: 'Local-first storage', o2: 'Complete privacy', o3: 'Lightning fast', o4: 'No internet needed', o5: 'All data on-device' } },
  { t: ['JUST 5', 'MINUTES', 'DAILY'], s: 'Build your German skills every day', e: { session: ['SESSION', 'COMPLETE!'], reviewed: ['10 cards reviewed', 'Come back tomorrow'], correct: 'CORRECT', wrong: 'WRONG' } },
];

const NB = ' ';
const COPY = {
  'de-DE': [
    { t: { p: ['MEISTERE', 'DER, DIE,', 'DAS'], d: ['MEISTERE', 'DER, DIE, DAS'] }, s: 'Endlich die Artikel sicher merken', e: {} },
    { t: ['SMARTE', 'SPACED', 'REPETITION'], s: 'Üben zum perfekten Zeitpunkt', e: { cards: 'KARTEN', success: 'ERFOLG', reviews: 'ÜBUNGEN', due: 'HEUTE FÄLLIG', mastered: '75% GEMEISTERT' } },
    { t: ['BAUE DEINE', 'SERIE AUF'], s: 'Bleib im Schwung', e: { streak: 'TAGE IN FOLGE', i1: 'Tägliches Üben im Blick', i2: 'Detaillierte Statistiken' } },
    { t: ['DEIN', 'WORTSCHATZ'], s: 'Füge Wörter hinzu, während du lernst', e: { word: 'WORT', article: 'ARTIKEL', plural: 'PLURAL', add: 'WORT HINZUFÜGEN' } },
    { t: ['LÄUFT', 'KOMPLETT', 'OFFLINE'], s: 'Deine Daten bleiben auf dem Gerät', e: { o1: 'Lokale Speicherung', o2: 'Volle Privatsphäre', o3: 'Blitzschnell', o4: 'Kein Internet nötig', o5: 'Alle Daten auf dem Gerät' } },
    { t: ['NUR 5', 'MINUTEN', 'PRO TAG'], s: 'Verbessere dein Deutsch jeden Tag', e: { session: ['SITZUNG', 'BEENDET!'], reviewed: ['10 Karten wiederholt', 'Komm morgen wieder'], correct: 'RICHTIG', wrong: 'FALSCH' } },
  ],
  pl: [
    { t: { p: ['OPANUJ', 'DER, DIE,', 'DAS'], d: ['OPANUJ', 'DER, DIE, DAS'] }, s: 'Wreszcie zapamiętasz rodzajniki', e: {} },
    { t: ['MĄDRE', 'POWTÓRKI', 'W ODSTĘPACH'], s: 'Ćwicz w idealnym momencie', e: { cards: 'KARTY', success: 'SKUTECZNOŚĆ', reviews: 'POWTÓRKI', due: 'NA DZIŚ', mastered: '75% OPANOWANE' } },
    { t: ['BUDUJ SWOJĄ', 'SERIĘ'], s: 'Utrzymaj tempo nauki', e: { streak: 'DNI Z RZĘDU', i1: 'Śledzenie codziennej nauki', i2: 'Szczegółowe statystyki' } },
    { t: ['BUDUJ SWOJE', 'SŁOWNICTWO'], s: 'Dodawaj słowa w trakcie nauki', e: { word: 'NIEMIECKIE SŁOWO', article: 'RODZAJNIK', plural: 'LICZBA MNOGA', add: 'DODAJ SŁOWO' } },
    { t: ['DZIAŁA', 'CAŁKIEM', 'OFFLINE'], s: 'Twoje dane zostają na urządzeniu', e: { o1: 'Dane zapisane lokalnie', o2: 'Pełna prywatność', o3: 'Błyskawiczna', o4: 'Internet zbędny', o5: 'Wszystko na urządzeniu' } },
    { t: ['TYLKO 5', 'MINUT', 'DZIENNIE'], s: 'Ucz się niemieckiego codziennie', e: { session: ['SESJA', 'ZAKOŃCZONA!'], reviewed: ['Powtórzone karty: 10', 'Wróć jutro'], correct: 'DOBRZE', wrong: 'ŹLE' } },
  ],
  'fr-FR': [
    { t: { p: ['MAÎTRISEZ', 'DER, DIE,', 'DAS'], d: ['MAÎTRISEZ', 'DER, DIE, DAS'] }, s: 'Retenez enfin les articles', e: {} },
    { t: ['RÉPÉTITION', 'ESPACÉE', 'EFFICACE'], s: 'Révisez au moment idéal', e: { cards: 'CARTES', success: 'SUCCÈS', reviews: 'RÉVISIONS', due: 'À FAIRE', mastered: '75' + NB + '% MAÎTRISÉ' } },
    { t: ['ENCHAÎNEZ', 'LES JOURS'], s: "Gardez l'élan", e: { streak: 'JOURS DE SUITE', i1: 'Suivi quotidien', i2: 'Statistiques détaillées' } },
    { t: ['VOTRE', 'VOCABULAIRE'], s: 'Ajoutez des mots en apprenant', e: { word: 'MOT ALLEMAND', article: 'ARTICLE', plural: 'PLURIEL', add: 'AJOUTER' } },
    { t: ['FONCTIONNE', 'TOTALEMENT', 'HORS LIGNE'], s: "Vos données restent sur l'appareil", e: { o1: 'Stockage local', o2: 'Confidentialité totale', o3: 'Ultra rapide', o4: 'Sans internet', o5: "Données sur l'appareil" } },
    { t: ['SEULEMENT', '5 MINUTES', 'PAR JOUR'], s: 'Progressez en allemand chaque jour', e: { session: ['SÉANCE', 'TERMINÉE' + NB + '!'], reviewed: ['10 cartes révisées', 'Revenez demain'], correct: 'JUSTES', wrong: 'FAUSSES' } },
  ],
  'es-ES': [
    { t: { p: ['DOMINA', 'DER, DIE,', 'DAS'], d: ['DOMINA', 'DER, DIE, DAS'] }, s: 'Memoriza por fin los artículos', e: {} },
    { t: ['REPETICIÓN', 'ESPACIADA', 'EFICAZ'], s: 'Practica en el momento justo', e: { cards: 'TARJETAS', success: 'ÉXITO', reviews: 'REPASOS', due: 'PARA HOY', mastered: '75' + NB + '% DOMINADO' } },
    { t: ['CREA TU', 'RACHA'], s: 'Mantén el ritmo', e: { streak: 'DÍAS DE RACHA', i1: 'Seguimiento diario', i2: 'Estadísticas detalladas' } },
    { t: ['AMPLÍA TU', 'VOCABULARIO'], s: 'Añade palabras mientras aprendes', e: { word: 'PALABRA ALEMANA', article: 'ARTÍCULO', plural: 'PLURAL', add: 'AÑADIR PALABRA' } },
    { t: ['FUNCIONA', 'TOTALMENTE', 'OFFLINE'], s: 'Tus datos se quedan en tu móvil', e: { o1: 'Almacenamiento local', o2: 'Privacidad total', o3: 'Ultrarrápida', o4: 'Sin internet', o5: 'Datos en tu dispositivo' } },
    { t: ['SOLO 5', 'MINUTOS', 'AL DÍA'], s: 'Mejora tu alemán cada día', e: { session: ['¡SESIÓN', 'COMPLETADA!'], reviewed: ['10 tarjetas repasadas', 'Vuelve mañana'], correct: 'ACIERTOS', wrong: 'FALLOS' } },
  ],
  tr: [
    { t: { p: ['DER, DIE,', "DAS'TA", 'USTALAŞ'], d: ["DER, DIE, DAS'TA", 'USTALAŞ'] }, s: 'Artikelleri artık unutma', e: {} },
    { t: ['AKILLI', 'ARALIKLI', 'TEKRAR'], s: 'Tam zamanında çalış', e: { cards: 'KART', success: 'BAŞARI', reviews: 'TEKRAR', due: 'BUGÜN', mastered: '%75 ÖĞRENİLDİ' } },
    { t: ['SERİNİ', 'OLUŞTUR'], s: 'Ritmini kaybetme', e: { streak: 'GÜNLÜK SERİ', i1: 'Günlük pratik takibi', i2: 'Ayrıntılı istatistikler' } },
    { t: ['KELİME', 'DAĞARCIĞIN'], s: 'Öğrendikçe kelime ekle', e: { word: 'ALMANCA KELİME', article: 'ARTİKEL', plural: 'ÇOĞUL', add: 'KELİME EKLE' } },
    { t: ['TAMAMEN', 'ÇEVRİMDIŞI', 'ÇALIŞIR'], s: 'Verilerin cihazında kalır', e: { o1: 'Yerel depolama', o2: 'Tam gizlilik', o3: 'Yıldırım hızında', o4: 'İnternet gerekmez', o5: 'Tüm veriler cihazda' } },
    { t: ['GÜNDE', 'SADECE', '5 DAKİKA'], s: 'Almancanı her gün geliştir', e: { session: ['OTURUM', 'TAMAMLANDI!'], reviewed: ['10 kart tekrarlandı', 'Yarın tekrar gel'], correct: 'DOĞRU', wrong: 'YANLIŞ' } },
  ],
};

module.exports = { PHONE_DIR, PAD_DIR, FILES, OUT_NAMES, LAYOUT, EN, COPY };
