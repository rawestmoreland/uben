// Generates the iPhone Duo App Store screenshots (outer cover + unfolded inner display).
// Same neo-brutalist look as the other store screenshots, laid out in HTML and rendered with Playwright.
//   outer: 1398x2034 portrait  -> headline band on top, UI stacked below
//   inner: 2670x1878 landscape -> headline panel on the left, UI in two columns on the right
// Usage: node duo.js [--only=3]   (see README.md)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const HERE = __dirname;
const SHOTS = path.resolve(HERE, '../../store/apple/screenshot');
const LOCALE = 'en-US';

const DEVICES = {
  APP_IPHONE_DUO_OUTER: { w: 1398, h: 2034, wide: false, u: 1.9 }, // u = starting UI scale, shrunk per screen until it fits
  APP_IPHONE_DUO_INNER: { w: 2670, h: 1878, wide: true, u: 2.1 },
};

const THEMES = {
  yellow: { bg: '#FFE500', ink: '#000' },
  blue: { bg: '#0066FF', ink: '#fff' },
  purple: { bg: '#9933FF', ink: '#fff' },
};

const btn = (label, cls = '') => `<div class="btn ${cls}">${label}</div>`;
const tile = (n, label, cls = '') => `<div class="tile ${cls}"><div class="num">${n}</div><div class="lbl">${label}</div></div>`;
const row = (label, kind) => `<div class="row"><div class="ico"><i class="${kind}"></i></div><span>${label}</span></div>`;

const ENDINGS = ['-', '¨-', '-e', '¨-e', '-er', '¨-er', '-n', '-en', '-s'];
const PREPS = ['an', 'auf', 'aus', 'bei', 'für', 'in', 'mit', 'nach', 'über', 'um', 'von', 'vor', 'zu'];
const PREP_ENABLED = ['an', 'auf', 'für', 'um', 'über', 'zu'];
const PAST_FORMS = [['ich', 'ging'], ['du', 'gingst'], ['er', 'ging'], ['wir', 'gingen'], ['ihr', 'gingt'], ['sie', 'gingen']];

// Each screen: headline lines, subtitle, theme, and body as [first block, second block]
// (stacked on the outer cover, side by side on the unfolded display).
const SCREENS = [
  {
    file: '01-master-articles', theme: 'yellow', t: ['MASTER', 'DER, DIE, DAS'], s: 'Finally remember German articles',
    body: [
      `<div class="card"><div class="word">Hund</div></div>`,
      `<div class="grid g3">${btn('DER', 'ok')}${btn('DIE')}${btn('DAS')}</div>`,
    ],
  },
  {
    file: '02-spaced-repetition', theme: 'yellow', t: ['SMART SPACED', 'REPETITION'], s: 'Practice at the perfect time',
    body: [
      `<div class="grid g2">${tile(47, 'CARDS')}${tile('92%', 'SUCCESS')}${tile(156, 'REVIEWS')}${tile(12, 'DUE TODAY')}</div>`,
      `<div class="bar"><div class="fill"><span>75% MASTERED</span></div></div>`,
    ],
  },
  {
    file: '03-streak', theme: 'yellow', t: ['BUILD YOUR', 'STREAK'], s: 'Keep the momentum going',
    body: [
      `<div class="card blue"><div class="big7">7</div><div class="lbl w">DAY STREAK</div></div>`,
      `<div class="list">${row('Daily practice tracking', 'flame')}${row('Detailed statistics', 'bars')}</div>`,
    ],
  },
  {
    file: '04-vocabulary', theme: 'yellow', t: ['BUILD YOUR', 'VOCABULARY'], s: 'Add words as you learn them',
    body: [
      `<div class="field"><label>GERMAN WORD</label><div class="input">Tisch</div></div>
       <div class="field"><label>ARTICLE</label><div class="grid g3">${btn('DER', 'sel')}${btn('DIE', 'flat')}${btn('DAS', 'flat')}</div></div>`,
      `<div class="field"><label>PLURAL</label><div class="input">Tische</div></div>${btn('ADD WORD', 'go')}`,
    ],
  },
  {
    file: '05-offline', theme: 'yellow', t: ['WORKS COMPLETELY', 'OFFLINE'], s: 'Your data stays on your device',
    body: [
      `<div class="list">${row('Local-first storage', 'box')}${row('Complete privacy', 'lock')}${row('Lightning fast', 'bolt')}</div>`,
      `<div class="list">${row('No internet needed', 'off')}${row('All data on-device', 'box')}</div>`,
    ],
  },
  {
    file: '06-daily', theme: 'yellow', t: ['JUST 5 MINUTES', 'DAILY'], s: 'Build your German skills every day',
    body: [
      `<div class="card blue"><div class="done">SESSION<br>COMPLETE!</div><div class="lbl w small">10 cards reviewed<br>Come back tomorrow</div></div>`,
      `<div class="grid g2">${tile(9, 'CORRECT', 'okbg')}${tile(1, 'WRONG', 'badbg')}</div>`,
    ],
  },
  {
    file: '07-plural-endings', theme: 'yellow', t: ['LEARN PLURAL', 'ENDINGS'], s: 'Pick the right ending every time',
    body: [
      `<div class="badge">Plural Endings</div>
       <div class="card"><div class="art">der</div><div class="word">Apfel</div><div class="prompt">Which plural ending?</div></div>`,
      `<div class="grid g3">${ENDINGS.map((e) => btn(e, e === '¨-' ? 'ok' : 'dim')).join('')}</div>
       <div class="panel ok"><div class="verdict">Correct</div><div class="bigtxt">die Äpfel &nbsp;·&nbsp; ¨-</div>${btn('Continue', 'go')}</div>`,
    ],
  },
  {
    file: '08-verb-prepositions', theme: 'blue', t: ['MASTER VERB', 'PREPOSITIONS'], s: 'Never guess auf, an or für again',
    body: [
      `<div class="badge">Verb + Preposition</div>
       <div class="card"><div class="sentence">Ich warte <span class="blank">auf</span> meine Frau.</div><div class="prompt">Which preposition?</div></div>
       <div class="panel ok"><div class="verdict">Correct</div><div class="bigtxt">warten auf + Akk.</div><div class="note">wait for (not "wait on")</div>${btn('Continue', 'go')}</div>`,
      `<div class="grid g4">${PREPS.map((p) => btn(p, p === 'auf' ? 'ok' : PREP_ENABLED.includes(p) ? 'dim' : 'off')).join('')}</div>`,
    ],
  },
  {
    file: '09-praeteritum', theme: 'purple', t: ['MASTER THE', 'PRÄTERITUM'], s: 'Type the past tense, get feedback',
    body: [
      `<div class="badge">Verb Präteritum</div>
       <div class="card"><div class="pron">er</div><div class="word">gehen</div><div class="prompt">to go</div><div class="input okbg">ging</div></div>`,
      `<div class="panel ok"><div class="verdict">Correct answer: er ging</div>${btn('Continue', 'go')}</div>
       <div class="grid g3 forms">${PAST_FORMS.map(([p, f]) => `<div class="form"><span>${p}</span>${f}</div>`).join('')}</div>`,
    ],
  },
];

function html(sc, dev, u) {
  const th = THEMES[sc.theme];
  const [a, b] = sc.body;
  const wide = dev.wide;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><link rel="stylesheet" href="fonts.css"><style>
  :root{--u:${u}px;--bg:${th.bg};--ink:${th.ink}}
  *{box-sizing:border-box;margin:0}
  body{width:${dev.w}px;height:${dev.h}px;font-family:WS,sans-serif;background:#FFF8E1;overflow:hidden;display:flex;flex-direction:${wide ? 'row' : 'column'}}
  .head{background:var(--bg);color:var(--ink);flex:none;${wide
    ? 'width:880px;border-right:14px solid #000;padding:150px 80px;display:flex;flex-direction:column;justify-content:center'
    : 'border-bottom:9px solid #000;padding:100px 96px 80px'}}
  h1{font-weight:900;font-size:${wide ? 132 : 138}px;line-height:1.06;letter-spacing:-.03em;text-transform:uppercase;white-space:nowrap}
  .sub{font-weight:700;font-size:${wide ? 56 : 54}px;margin-top:${wide ? 48 : 44}px;line-height:1.25}
  .main{flex:1;display:flex;${wide ? 'flex-direction:row;align-items:center;gap:calc(44*var(--u));padding:0 calc(44*var(--u))' : 'flex-direction:column;justify-content:center;padding:0 calc(70*var(--u))'}}
  .col{display:flex;flex-direction:column;gap:calc(30*var(--u));${wide ? 'flex:1;min-width:0' : 'width:100%;margin:calc(15*var(--u)) 0'}}
  .col>*,.grid>*{min-width:0}
  .badge{align-self:flex-start;background:#000;color:#fff;font-weight:800;font-size:calc(38*var(--u));padding:calc(12*var(--u)) calc(28*var(--u));text-transform:uppercase;letter-spacing:.03em}
  .card{background:#fff;border:calc(8*var(--u)) solid #000;box-shadow:calc(14*var(--u)) calc(14*var(--u)) 0 #000;padding:calc(44*var(--u));text-align:center;display:flex;flex-direction:column;align-items:center;gap:calc(14*var(--u))}
  .card.blue{background:#0066FF;color:#fff;padding:calc(60*var(--u))}
  .art{font-weight:800;font-size:calc(56*var(--u));color:#666}
  .pron{font-weight:800;font-size:calc(64*var(--u));color:#0066FF}
  .word{font-weight:900;font-size:calc(150*var(--u));line-height:1}
  .big7{font-weight:900;font-size:calc(300*var(--u));line-height:1;color:#FFE500;text-shadow:calc(8*var(--u)) calc(8*var(--u)) 0 #000}
  .done{font-weight:900;font-size:calc(100*var(--u));line-height:1.05;color:#fff;text-shadow:calc(6*var(--u)) calc(6*var(--u)) 0 #000}
  .prompt{font-weight:700;font-size:calc(42*var(--u))}
  .sentence{font-weight:800;font-size:calc(62*var(--u));line-height:1.3}
  .blank{background:#00CC66;border:calc(6*var(--u)) solid #000;padding:0 calc(18*var(--u))}
  .input{border:calc(8*var(--u)) solid #000;background:#fff;font-weight:800;font-size:calc(68*var(--u));padding:calc(22*var(--u)) calc(30*var(--u));width:100%}
  .okbg{background:#00CC66}.badbg{background:#FF3333}
  .grid{display:grid;gap:calc(22*var(--u))}
  .g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
  .btn{display:flex;align-items:center;justify-content:center;height:calc(118*var(--u));border:calc(7*var(--u)) solid #000;background:#fff;box-shadow:calc(9*var(--u)) calc(9*var(--u)) 0 #000;font-weight:900;font-size:calc(54*var(--u))}
  .g4 .btn{font-size:calc(44*var(--u))}
  .btn.ok{background:#00CC66}.btn.dim{background:#f2f2f2;color:#777;box-shadow:none}
  .btn.off{background:#ddd;color:#aaa;border-color:#999;box-shadow:none}
  .btn.sel{background:#0066FF;color:#fff}.btn.flat{box-shadow:none}
  .btn.go{background:#FFE500;text-transform:uppercase;height:calc(104*var(--u));font-size:calc(46*var(--u));margin-top:calc(10*var(--u))}
  .panel{border:calc(8*var(--u)) solid #000;box-shadow:calc(14*var(--u)) calc(14*var(--u)) 0 #000;padding:calc(30*var(--u)) calc(36*var(--u));display:flex;flex-direction:column;gap:calc(8*var(--u))}
  .panel.ok{background:#B6F2D0}
  .verdict{font-weight:900;font-size:calc(46*var(--u));text-transform:uppercase}
  .bigtxt{font-weight:900;font-size:calc(62*var(--u))}
  .note{font-weight:700;font-size:calc(38*var(--u))}
  .forms .form{background:#fff;border:calc(6*var(--u)) solid #000;padding:calc(14*var(--u)) calc(20*var(--u));font-weight:900;font-size:calc(46*var(--u))}
  .forms .form span{display:block;font-size:calc(30*var(--u));font-weight:700;color:#0066FF}
  .tile{background:#fff;border:calc(8*var(--u)) solid #000;box-shadow:calc(12*var(--u)) calc(12*var(--u)) 0 #000;padding:calc(40*var(--u)) 0;text-align:center}
  .tile .num{font-weight:900;font-size:calc(130*var(--u));line-height:1}
  .tile .lbl,.lbl{font-weight:800;font-size:calc(40*var(--u));margin-top:calc(14*var(--u));text-transform:uppercase}
  .lbl.w{color:#fff;font-size:calc(64*var(--u));margin-top:0}.lbl.small{font-size:calc(44*var(--u));text-transform:none;line-height:1.35;margin-top:calc(16*var(--u))}
  .tile.okbg{background:#00CC66}.tile.badbg{background:#FF3333}
  .bar{height:calc(96*var(--u));border:calc(8*var(--u)) solid #000;background:#fff}
  .fill{height:100%;width:75%;background:#00CC66;border-right:calc(8*var(--u)) solid #000;display:flex;align-items:center;padding-left:calc(28*var(--u))}
  .fill span{font-weight:900;font-size:calc(40*var(--u))}
  .field label{display:block;font-weight:900;font-size:calc(38*var(--u));margin-bottom:calc(14*var(--u))}
  .field{display:flex;flex-direction:column}
  .field .btn{box-shadow:none}
  .list{display:flex;flex-direction:column;gap:calc(30*var(--u))}
  .row{display:flex;align-items:center;gap:calc(36*var(--u));background:#fff;border:calc(8*var(--u)) solid #000;box-shadow:calc(10*var(--u)) calc(10*var(--u)) 0 #000;padding:calc(30*var(--u)) calc(36*var(--u));font-weight:900;font-size:calc(52*var(--u))}
  .ico{flex:none;width:calc(120*var(--u));height:calc(120*var(--u));background:#9933FF;border:calc(8*var(--u)) solid #000;position:relative}
  .ico i{position:absolute;inset:calc(26*var(--u));background:#FFE500;border:calc(5*var(--u)) solid #000}
  .ico i.flame{clip-path:polygon(50% 0,100% 70%,75% 100%,25% 100%,0 70%);border:0}
  .ico i.bars{background:linear-gradient(90deg,#FFE500 0 28%,transparent 28% 36%,#00CC66 36% 64%,transparent 64% 72%,#fff 72%);border:0;clip-path:polygon(0 60%,28% 60%,28% 100%,36% 100%,36% 20%,64% 20%,64% 100%,72% 100%,72% 0,100% 0,100% 100%,0 100%)}
  .ico i.lock{border-radius:0;inset:calc(40*var(--u)) calc(28*var(--u)) calc(24*var(--u))}
  .ico i.bolt{clip-path:polygon(60% 0,15% 55%,45% 55%,35% 100%,85% 40%,55% 40%);border:0}
  .ico i.off{background:#FF3333}
  </style><body>
  <div class="head"><h1>${sc.t.join('<br>')}</h1><div class="sub">${sc.s}</div></div>
  <div class="main"><div class="col">${a}</div><div class="col">${b}</div></div>
  <script>
  // shrink the headline if its longest line does not fit the header width
  document.fonts.ready.then(()=>{const h=document.querySelector('h1'),p=h.parentElement,cs=getComputedStyle(p);
    const max=p.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    if(h.scrollWidth>max)h.style.fontSize=(parseFloat(getComputedStyle(h).fontSize)*max/h.scrollWidth)+'px';
    // shrink the UI scale (--u) until both blocks fit inside the main area
    let u=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--u'));
    const main=document.querySelector('.main'),cols=[...main.querySelectorAll('.col')];
    const fits=()=>{const r=cols.map(c=>c.getBoundingClientRect());
      const need=${wide ? "Math.max(...r.map(x=>x.height))" : "r[1].bottom-r[0].top"};
      const spill=cols.some(c=>{const cr=c.getBoundingClientRect();return [...c.querySelectorAll('*')].some(e=>e.getBoundingClientRect().right>cr.right+2);});
      const textOver=[...main.querySelectorAll('*')].some(e=>e.scrollWidth>e.clientWidth+1&&e.clientWidth>0);
      const wideOk=!spill&&!textOver&&![...main.querySelectorAll('*')].some(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth-30||r.left<0||r.bottom>innerHeight-30||r.top<0;});
      return need<=main.clientHeight-${wide ? 120 : 100}&&wideOk;};
    while(!fits()&&u>0.6){u*=0.97;document.documentElement.style.setProperty('--u',u+'px');}
    document.body.dataset.u=u;document.body.dataset.ready=1;});
  </script></body></html>`;
}

async function main() {
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  const file = path.join(HERE, '.tmp-duo.html'); // next to fonts.css so the relative font urls resolve
  const load = async (sc, dev, u) => {
    fs.writeFileSync(file, html(sc, dev, u));
    await page.goto('file://' + file);
    await page.waitForSelector('body[data-ready]');
    return page.evaluate(() => parseFloat(document.body.dataset.u));
  };
  for (const [dir, dev] of Object.entries(DEVICES)) {
    await page.setViewportSize({ width: dev.w, height: dev.h });
    fs.mkdirSync(path.join(SHOTS, LOCALE, dir), { recursive: true });
    // each screen scales its UI up to the largest size that fits (--u shrinks from dev.u until nothing overflows)
    for (const [i, sc] of SCREENS.entries()) {
      if (only && String(i + 1) !== only) continue;
      const used = await load(sc, dev, dev.u);
      const png = await page.screenshot({ type: 'png' });
      // App Store Connect wants opaque images
      const flat = PNG.sync.write(PNG.sync.read(png), { colorType: 2, inputHasAlpha: true });
      fs.writeFileSync(path.join(SHOTS, LOCALE, dir, sc.file + '.png'), flat);
      console.log(dir, sc.file, 'ui scale', used.toFixed(2));
    }
  }
  fs.rmSync(file, { force: true });
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
