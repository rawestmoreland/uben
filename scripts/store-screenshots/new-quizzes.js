// Generates the plural / verb-preposition / Präteritum App Store screenshots for every locale.
// Unlike render.js (which re-letters the en-US originals) these frames have no English original,
// so they are laid out from scratch in HTML in the same neo-brutalist style and rendered with Playwright.
// Usage: node new-quizzes.js [--locale=pl] — see README.md.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const HERE = __dirname;
const SHOTS = path.resolve(HERE, '../../store/apple/screenshot');

const DEVICES = {
  APP_IPHONE_65: { w: 1242, h: 2688, pad: false },
  APP_IPAD_PRO_3GEN_129: { w: 2064, h: 2752, pad: true },
};

const SCREENS = ['07-plural-endings', '08-verb-prepositions', '09-praeteritum'];
// Header band colour + ink per screen
const THEMES = [
  { bg: '#FFE500', ink: '#000' },
  { bg: '#0066FF', ink: '#fff' },
  { bg: '#9933FF', ink: '#fff' },
];

// UI copy mirrors locales/*.json (verb_quiz, verb_preposition_quiz, plural_quiz); de/es have no app locale, so they are written here.
const COPY = {
  'en-US': {
    lang: 'en',
    t: [['LEARN PLURAL', 'ENDINGS'], ['MASTER VERB', 'PREPOSITIONS'], ['MASTER THE', 'PRÄTERITUM']],
    s: ['Pick the right ending every time', 'Never guess auf, an or für again', 'Type the past tense, get feedback'],
    plural: { badge: 'Plural Endings', prompt: 'Which plural ending?', ok: 'Correct', next: 'Continue' },
    prep: { badge: 'Verb + Preposition', prompt: 'Which preposition?', ok: 'Correct', next: 'Continue', hint: 'wait for (not "wait on")' },
    past: { badge: 'Verb Präteritum', hint: 'to go', check: 'Check', ok: 'Correct answer: er ging', next: 'Continue' },
  },
  'de-DE': {
    lang: 'de',
    t: [['LERNE PLURAL-', 'ENDUNGEN'], ['MEISTERE VERB-', 'PRÄPOSITIONEN'], ['MEISTERE DAS', 'PRÄTERITUM']],
    s: ['Immer die richtige Endung', 'Nie wieder raten: auf, an oder für?', 'Tippe die Form, sofort Feedback'],
    plural: { badge: 'Pluralendungen', prompt: 'Welche Pluralendung?', ok: 'Richtig', next: 'Weiter' },
    prep: { badge: 'Verb + Präposition', prompt: 'Welche Präposition?', ok: 'Richtig', next: 'Weiter', hint: 'Merke: warten AUF, nicht "warten für"' },
    past: { badge: 'Verb Präteritum', hint: 'unregelmäßig', check: 'Prüfen', ok: 'Richtige Antwort: er ging', next: 'Weiter' },
  },
  pl: {
    lang: 'pl',
    t: [['KOŃCÓWKI LICZBY', 'MNOGIEJ'], ['PRZYIMKI PRZY', 'CZASOWNIKACH'], ['OPANUJ', 'PRÄTERITUM']],
    s: ['Wybierz właściwą końcówkę', 'Koniec zgadywania: auf, an czy für?', 'Wpisz formę, dostań natychmiastową ocenę'],
    plural: { badge: 'Liczba mnoga', prompt: 'Jaka końcówka liczby mnogiej?', ok: 'Dobrze', next: 'Dalej' },
    prep: { badge: 'Czasownik + przyimek', prompt: 'Jaki przyimek?', ok: 'Dobrze', next: 'Dalej', hint: 'czekać na (nie "czekać dla")' },
    past: { badge: 'Czas Präteritum', hint: 'iść', check: 'Sprawdź', ok: 'Poprawna odpowiedź: er ging', next: 'Dalej' },
  },
  'fr-FR': {
    lang: 'fr',
    t: [['MAÎTRISEZ LES', 'PLURIELS'], ['VERBES ET', 'PRÉPOSITIONS'], ['MAÎTRISEZ LE', 'PRÄTERITUM']],
    s: ['Choisissez la bonne terminaison', 'Fini de deviner : auf, an ou für ?', 'Tapez la forme, retour immédiat'],
    plural: { badge: 'Terminaisons du pluriel', prompt: 'Quelle terminaison ?', ok: 'Correct', next: 'Continuer' },
    prep: { badge: 'Verbe + Préposition', prompt: 'Quelle préposition ?', ok: 'Correct', next: 'Continuer', hint: 'attendre (sans préposition en français)' },
    past: { badge: 'Verbes au Präteritum', hint: 'aller', check: 'Vérifier', ok: 'Bonne réponse : er ging', next: 'Continuer' },
  },
  'es-ES': {
    lang: 'es',
    t: [['DOMINA EL', 'PLURAL'], ['VERBOS Y', 'PREPOSICIONES'], ['DOMINA EL', 'PRÄTERITUM']],
    s: ['Elige la terminación correcta', 'Deja de adivinar: ¿auf, an o für?', 'Escribe la forma, respuesta al instante'],
    plural: { badge: 'Terminaciones del plural', prompt: '¿Qué terminación de plural?', ok: 'Correcto', next: 'Continuar' },
    prep: { badge: 'Verbo + Preposición', prompt: '¿Qué preposición?', ok: 'Correcto', next: 'Continuar', hint: 'esperar (sin preposición en español)' },
    past: { badge: 'Verbo Präteritum', hint: 'ir', check: 'Comprobar', ok: 'Respuesta correcta: er ging', next: 'Continuar' },
  },
  tr: {
    lang: 'tr',
    t: [['ÇOĞUL EKLERİNİ', 'ÖĞREN'], ['FİİL VE', 'EDATLAR'], ['PRÄTERITUM’DA', 'USTALAŞ']],
    s: ['Her seferinde doğru eki seç', 'Tahmin etme: auf, an, für?', 'Biçimi yaz, anında geri bildirim al'],
    plural: { badge: 'Çoğul ekleri', prompt: 'Hangi çoğul eki?', ok: 'Doğru', next: 'Devam' },
    prep: { badge: 'Fiil + Edat', prompt: 'Hangi edat?', ok: 'Doğru', next: 'Devam', hint: 'beklemek (Türkçede edat yok)' },
    past: { badge: 'Fiil Präteritum', hint: 'gitmek', check: 'Kontrol et', ok: 'Doğru cevap: er ging', next: 'Devam' },
  },
};

const ENDINGS = ['-', '¨-', '-e', '¨-e', '-er', '¨-er', '-n', '-en', '-s'];
const PREPS = ['an', 'auf', 'aus', 'bei', 'für', 'in', 'mit', 'nach', 'über', 'um', 'von', 'vor', 'zu'];
const PREP_ENABLED = ['an', 'auf', 'für', 'um', 'über', 'zu']; // answer + distractors for this question
const PAST_FORMS = [['ich', 'ging'], ['du', 'gingst'], ['er', 'ging'], ['wir', 'gingen'], ['ihr', 'gingt'], ['sie', 'gingen']];

const btn = (label, cls = '') => `<div class="btn ${cls}">${label}</div>`;

function body(idx, c) {
  if (idx === 0) {
    const k = c.plural;
    return `
      <div class="badge">${k.badge}</div>
      <div class="card"><div class="art">der</div><div class="word">Apfel</div><div class="prompt">${k.prompt}</div></div>
      <div class="grid g3">${ENDINGS.map((e) => btn(e, e === '¨-' ? 'ok' : 'dim')).join('')}</div>
      <div class="panel ok"><div class="verdict">${k.ok}</div><div class="big">die Äpfel &nbsp;·&nbsp; ¨-</div>
        <div class="btn go">${k.next}</div></div>`;
  }
  if (idx === 1) {
    const k = c.prep;
    return `
      <div class="badge">${k.badge}</div>
      <div class="card"><div class="sentence">Ich warte <span class="blank">auf</span> meine Frau.</div><div class="prompt">${k.prompt}</div></div>
      <div class="grid g4">${PREPS.map((p) => btn(p, p === 'auf' ? 'ok' : PREP_ENABLED.includes(p) ? 'dim' : 'off')).join('')}</div>
      <div class="panel ok"><div class="verdict">${k.ok}</div><div class="big">warten auf + Akk.</div>
        <div class="note">${k.hint}</div><div class="btn go">${k.next}</div></div>`;
  }
  const k = c.past;
  return `
    <div class="badge">${k.badge}</div>
    <div class="card"><div class="pron">er</div><div class="word">gehen</div><div class="prompt">${k.hint}</div>
      <div class="input ok">ging</div></div>
    <div class="panel ok"><div class="verdict">${k.ok}</div><div class="btn go">${k.next}</div></div>
    <div class="grid g3 forms">${PAST_FORMS.map(([p, f]) => `<div class="form"><span>${p}</span>${f}</div>`).join('')}</div>`;
}

function html(idx, loc, dev) {
  const c = COPY[loc];
  const th = THEMES[idx];
  const u = dev.pad ? 1.15 : 1.4;// everything is designed at phone scale and multiplied
  const content = body(idx, c);
  const titleSize = dev.pad ? 170 : 140;
  return `<!doctype html><html lang="${c.lang}"><meta charset="utf-8"><link rel="stylesheet" href="fonts.css"><style>
  :root{--u:${u}px;--bg:${th.bg};--ink:${th.ink}}
  *{box-sizing:border-box;margin:0}
  body{width:${dev.w}px;height:${dev.h}px;font-family:WS,sans-serif;background:${dev.pad ? '#fff' : '#FFF8E1'};overflow:hidden;position:relative}
  .frame{position:absolute;${dev.pad ? 'inset:110px 110px;border:14px solid #000;border-radius:44px;overflow:hidden;background:#FFF8E1' : 'inset:0'}}
  .head{background:var(--bg);color:var(--ink);border-bottom:${dev.pad ? 14 : 9}px solid #000;padding:${dev.pad ? '80px 130px 70px' : '80px 96px 70px'}}
  h1{font-weight:900;font-size:${titleSize}px;line-height:1.06;letter-spacing:-.03em;text-transform:uppercase;white-space:nowrap}
  .sub{font-weight:700;font-size:${dev.pad ? 66 : 50}px;margin-top:${dev.pad ? 56 : 40}px}
  .main{padding:calc(70*var(--u)) calc(80*var(--u));display:flex;flex-direction:column;gap:calc(30*var(--u))}
  .badge{align-self:flex-start;background:#000;color:#fff;font-weight:800;font-size:calc(38*var(--u));padding:calc(12*var(--u)) calc(28*var(--u));text-transform:uppercase;letter-spacing:.03em}
  .card{background:#fff;border:calc(8*var(--u)) solid #000;box-shadow:calc(14*var(--u)) calc(14*var(--u)) 0 #000;padding:calc(40*var(--u));text-align:center;display:flex;flex-direction:column;align-items:center;gap:calc(14*var(--u))}
  .art{font-weight:800;font-size:calc(56*var(--u));color:#666}
  .pron{font-weight:800;font-size:calc(64*var(--u));color:#0066FF}
  .word{font-weight:900;font-size:calc(150*var(--u));line-height:1}
  .prompt{font-weight:700;font-size:calc(42*var(--u))}
  .sentence{font-weight:800;font-size:calc(66*var(--u));line-height:1.25}
  .blank{background:#00CC66;border:calc(6*var(--u)) solid #000;padding:0 calc(18*var(--u))}
  .input{margin-top:calc(14*var(--u));width:100%;border:calc(8*var(--u)) solid #000;background:#fff;font-weight:800;font-size:calc(68*var(--u));padding:calc(20*var(--u));text-align:left}
  .input.ok{background:#00CC66}
  .grid{display:grid;gap:calc(22*var(--u))}
  .g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
  .btn{display:flex;align-items:center;justify-content:center;height:calc(${'118'}*var(--u));border:calc(7*var(--u)) solid #000;background:#fff;box-shadow:calc(9*var(--u)) calc(9*var(--u)) 0 #000;font-weight:900;font-size:calc(56*var(--u));text-transform:none}
  .btn.ok{background:#00CC66}.btn.dim{background:#f2f2f2;color:#777;box-shadow:none}
  .btn.off{background:#ddd;color:#aaa;border-color:#999;box-shadow:none}
  .btn.go{background:#FFE500;text-transform:uppercase;height:calc(104*var(--u));font-size:calc(46*var(--u));margin-top:calc(10*var(--u))}
  .panel{border:calc(8*var(--u)) solid #000;box-shadow:calc(14*var(--u)) calc(14*var(--u)) 0 #000;padding:calc(30*var(--u)) calc(36*var(--u));display:flex;flex-direction:column;gap:calc(8*var(--u))}
  .panel.ok{background:#B6F2D0}
  .verdict{font-weight:900;font-size:calc(50*var(--u));text-transform:uppercase}
  .big{font-weight:900;font-size:calc(64*var(--u))}
  .note{font-weight:700;font-size:calc(38*var(--u))}
  .forms .form{background:#fff;border:calc(6*var(--u)) solid #000;padding:calc(14*var(--u)) calc(20*var(--u));font-weight:900;font-size:calc(46*var(--u))}
  .forms .form span{display:block;font-size:calc(30*var(--u));font-weight:700;color:#0066FF}
  </style><body><div class="frame"><div class="head"><h1>${c.t[idx].join('<br>')}</h1><div class="sub">${c.s[idx]}</div></div>
  <div class="main">${content}</div></div>
  <script>
  // shrink headline lines that don't fit the header width (long words in pl/fr/tr)
  document.fonts.ready.then(()=>{const h=document.querySelector('h1');const max=h.parentElement.clientWidth-parseFloat(getComputedStyle(h.parentElement).paddingLeft)*2;
    if(h.scrollWidth>max)h.style.fontSize=(parseFloat(getComputedStyle(h).fontSize)*max/h.scrollWidth)+'px';document.body.dataset.ready=1;});
  </script></body></html>`;
}

async function main() {
  const only = process.argv.find((a) => a.startsWith('--locale='))?.split('=')[1];
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  for (const loc of Object.keys(COPY).filter((l) => !only || l === only)) {
    for (const [dir, dev] of Object.entries(DEVICES)) {
      await page.setViewportSize({ width: dev.w, height: dev.h });
      fs.mkdirSync(path.join(SHOTS, loc, dir), { recursive: true });
      for (let idx = 0; idx < SCREENS.length; idx++) {
        const file = path.join(HERE, '.tmp-page.html'); // next to fonts.css so the relative font urls resolve
        fs.writeFileSync(file, html(idx, loc, dev));
        await page.goto('file://' + file);
        await page.waitForSelector('body[data-ready]');
        const png = await page.screenshot({ type: 'png' });
        // App Store Connect wants opaque images
        const flat = PNG.sync.write(PNG.sync.read(png), { colorType: 2, inputHasAlpha: true });
        const out = path.join(SHOTS, loc, dir, SCREENS[idx] + '.png');
        fs.writeFileSync(out, flat);
        console.log(loc, dir, SCREENS[idx]);
      }
    }
  }
  fs.rmSync(path.join(HERE, '.tmp-page.html'), { force: true });
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
