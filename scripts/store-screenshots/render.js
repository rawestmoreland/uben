// Generates localized App Store screenshots from the en-US originals.
// Usage: see README.md in this folder.
const { chromium } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PNG } = require('pngjs');
const S = require('./spec');

const HERE = __dirname;
const REPO = path.resolve(HERE, '../..');
const SHOTS = path.join(REPO, 'store/apple/screenshot');
const SRC = path.join(SHOTS, 'en-US');

// Runs in the browser. Detects the English text boxes in the original PNG, paints over them
// and re-sets the translated copy with Work Sans at the same size/position/colour/shadow.
async function processImage({ b64, layout, idx, device, copy, ref, debug }) {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const orig = ctx.getImageData(0, 0, W, H);
  const d = orig.data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  const log = [];

  const darkFrac = (y, x0, x1) => {
    let c = 0;
    for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; if (d[i] + d[i + 1] + d[i + 2] < 90) c++; }
    return c / (x1 - x0);
  };
  const firstDarkRow = (from, x0, x1) => { for (let y = from; y < H; y++) if (darkFrac(y, x0, x1) > 0.9) return y; return H; };

  const bandBottom = firstDarkRow(layout.bandSearchFrom, layout.bandBottomX[0], layout.bandBottomX[1]);
  const clipY = layout.clipFrom ? firstDarkRow(layout.clipFrom, layout.bandBottomX[0], layout.bandBottomX[1]) : H;

  // unit ink width (per 1px of font size) for calibration + fitting
  const mctx = document.createElement('canvas').getContext('2d');
  const inkUnit = (text, w, ls) => {
    mctx.font = `${w} 200px "WS"`; mctx.letterSpacing = (ls * 200) + 'px';
    const m = mctx.measureText(text);
    return (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 200;
  };
  const capRatio = (w) => { mctx.font = `${w} 200px "WS"`; mctx.letterSpacing = '0px'; return mctx.measureText('H').actualBoundingBoxAscent / 200; };

  function analyze(rect, inkMode, minGap = 8) {
    const [x0, y0, x1, y1] = rect;
    const bg = px(x0, y0);
    const nb = (i) => Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 90;
    const ink = inkMode === 'white'
      ? (i) => d[i] > 215 && d[i + 1] > 215 && d[i + 2] > 215
      : (i) => d[i] + d[i + 1] + d[i + 2] < 150;
    const rowHas = new Uint8Array(y1 - y0);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) if (nb((y * W + x) * 4)) { rowHas[y - y0] = 1; break; }
    }
    let runs = [];
    let s = -1;
    for (let k = 0; k <= rowHas.length; k++) {
      const v = k < rowHas.length ? rowHas[k] : 0;
      if (v && s < 0) s = k;
      if (!v && s >= 0) { runs.push([s + y0, k - 1 + y0]); s = -1; }
    }
    const merged = [];
    for (const r of runs) {
      if (merged.length && r[0] - merged[merged.length - 1][1] < minGap) merged[merged.length - 1][1] = r[1];
      else merged.push([...r]);
    }
    const lines = merged.map(([ya, yb]) => {
      let nx0 = 1e9, nx1 = -1, ix0 = 1e9, ix1 = -1, iy0 = 1e9, iy1 = -1;
      const cnt = new Array(yb - ya + 2).fill(0);
      for (let y = ya; y <= yb; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4;
          if (nb(i)) { if (x < nx0) nx0 = x; if (x > nx1) nx1 = x; }
          if (ink(i) && nb(i)) { cnt[y - ya]++; if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
        }
      }
      // baseline = row after which ink count drops the most (lower half of the run)
      let best = -1, by = iy1;
      for (let y = Math.floor((iy0 + iy1) / 2); y <= iy1; y++) {
        const drop = cnt[y - ya] - cnt[y - ya + 1];
        if (drop > best) { best = drop; by = y; }
      }
      const cut = yb >= clipY - 3 || yb >= y1 - 1;
      return { ya, yb, nb: [nx0, nx1], ink: [ix0, ix1, iy0, iy1], baseline: by + 1, cut };
    });
    // sample ink colour: darkest / brightest pixel in the first line
    return { bg, lines, inkMode };
  }

  function fillBg(box, bg) {
    ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
    ctx.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  }

  // Draw one detected element with new text lines.
  function render(an, rect, newLines, refLines, o) {
    // o: {w, ls, mode, textRight, clearAll}
    const { lines, bg, inkMode } = an;
    if (lines.length !== newLines.length || lines.length !== refLines.length) {
      throw new Error(`line mismatch idx=${idx} el=${o.key} detected=${lines.length} new=${newLines.length}`);
    }
    // calibrate size from the detected English ink widths (skip cut-off/short ones via median)
    const fits = lines.map((l, k) => (l.ink[1] - l.ink[0] + 1) / inkUnit(refLines[k], o.w, o.ls));
    fits.sort((a, b) => a - b);
    const size = fits[Math.floor(fits.length / 2)];
    // available width per line
    const avail = lines.map((l) => {
      if (o.mode === 'left') return o.textRight - l.ink[0];
      const cx = (l.ink[0] + l.ink[1]) / 2;
      return 2 * Math.min(cx - rect[0], rect[2] - cx) - 24;
    });
    let scale = 1;
    newLines.forEach((t, k) => { const need = inkUnit(t, o.w, o.ls) * size; if (need > avail[k]) scale = Math.min(scale, avail[k] / need); });
    const S2 = size * scale;
    // shadow offset (white text with black hard shadow)
    let sdx = 0, sdy = 0;
    const l0 = lines.find((l) => !l.cut) || lines[0];
    if (inkMode === 'white') {
      sdx = l0.nb[1] - l0.ink[1];
      sdy = (l0.yb) - (l0.ink[3]);
      if (sdx < 2 && sdy < 2) { sdx = 0; sdy = 0; }
    }
    // clear
    if (o.clearAll) fillBg(rect, bg);
    else {
      const x0 = Math.max(rect[0], Math.min(...lines.map((l) => l.nb[0])) - 10);
      const x1 = Math.min(rect[2], Math.max(...lines.map((l) => l.nb[1])) + 10);
      const y0 = Math.max(rect[1], lines[0].ya - 10);
      const y1 = Math.min(rect[3], lines[lines.length - 1].yb + 10);
      fillBg([x0, y0, x1, y1], bg);
    }
    const inkColor = inkMode === 'white' ? '#ffffff' : '#000000';
    const cr = capRatio(o.w);
    // shared left origin: undo each English line's own glyph bearing so all lines start on the same x
    let originX = 0;
    if (o.mode === 'left') {
      ctx.font = `${o.w} ${size}px "WS"`; ctx.letterSpacing = (o.ls * size) + 'px';
      const origins = lines.map((l, k) => l.ink[0] + ctx.measureText(refLines[k]).actualBoundingBoxLeft).sort((a, b) => a - b);
      originX = origins[Math.floor(origins.length / 2)];
    }
    newLines.forEach((t, k) => {
      const l = lines[k];
      ctx.font = `${o.w} ${S2}px "WS"`;
      ctx.letterSpacing = (o.ls * S2) + 'px';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      const m = ctx.measureText(t);
      const abl = m.actualBoundingBoxLeft, abr = m.actualBoundingBoxRight;
      let x;
      if (o.mode === 'left') x = originX;
      else x = (l.ink[0] + l.ink[1]) / 2 - (abr - abl) / 2;
      // cut-off lines: baseline from cap top instead of the (invisible) baseline
      const baseline = l.cut ? l.ink[2] + cr * size : l.baseline;
      if (sdx || sdy) { ctx.fillStyle = '#000'; ctx.fillText(t, x + sdx, baseline + sdy); }
      ctx.fillStyle = inkColor;
      ctx.fillText(t, x, baseline);
    });
    log.push({ key: o.key, size: +size.toFixed(1), used: +S2.toFixed(1), scale: +scale.toFixed(3), lines: lines.map((l) => [l.ink[0], l.ink[1], l.baseline, l.cut ? 'cut' : '']), shadow: [sdx, sdy] });
    if (debug) {
      ctx.strokeStyle = 'red'; ctx.lineWidth = 2;
      lines.forEach((l) => ctx.strokeRect(l.ink[0], l.ink[2], l.ink[1] - l.ink[0], l.ink[3] - l.ink[2]));
    }
  }

  // ---- header ----
  const hdr = layout.hdr;
  const nTitle = hdr.nTitle[idx];
  const hInk = hdr.ink[idx];
  const hRect = [hdr.x0, hdr.top, hdr.x1, bandBottom - 14];
  const an = analyze(hRect, hInk);
  if (an.lines.length !== nTitle + 1) throw new Error(`header lines idx=${idx} found ${an.lines.length} expected ${nTitle + 1}`);
  const mk = (arr) => ({ bg: an.bg, inkMode: hInk, lines: arr });
  const titleAn = mk(an.lines.slice(0, nTitle));
  const subAn = mk(an.lines.slice(nTitle));
  const dev = device === 'pad' ? 'd' : 'p';
  const refT = Array.isArray(ref[idx].t) ? ref[idx].t : ref[idx].t[dev];
  const newT = Array.isArray(copy[idx].t) ? copy[idx].t : copy[idx].t[dev];
  // clear whole header text area once, then draw both blocks
  fillBg(hRect, an.bg);
  render(titleAn, hRect, newT, refT, { key: 'title', w: 900, ls: -0.05, mode: 'left', textRight: hdr.textRight, clearAll: false });
  render(subAn, hRect, [copy[idx].s], [ref[idx].s], { key: 'sub', w: 700, ls: 0, mode: 'left', textRight: hdr.textRight, clearAll: false });

  // ---- body elements ----
  for (const el of layout.els[idx]) {
    if (el.rect[3] === -1) el.rect[3] = clipY - 2;
    const a = analyze(el.rect, el.ink);
    if (!a.lines.length) throw new Error(`no ink found idx=${idx} el=${el.key}`);
    const r = ref[idx].e[el.key], n = copy[idx].e[el.key];
    render(a, el.rect, [].concat(n), [].concat(r), { key: el.key, w: el.w, ls: 0, mode: el.mode, textRight: el.rect[2] - 10, clearAll: false });
  }

  // restore frame/bottom area that clips the content (iPad)
  if (clipY < H) ctx.putImageData(orig, 0, 0, 0, clipY, W, H - clipY);

  return { png: cv.toDataURL('image/png').split(',')[1], log, bandBottom, clipY };
}

async function main() {
  const args = process.argv.slice(2);
  const validate = args.includes('--validate');
  const debug = args.includes('--debug');
  const only = args.find((a) => a.startsWith('--locale='))?.split('=')[1];
  const outRoot = validate ? path.join(os.tmpdir(), 'uben-screenshots-validate') : SHOTS;

  // CHROMIUM_PATH overrides Playwright's own browser (handy where it is preinstalled)
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  await page.goto('file://' + HERE + '/page.html');
  await page.evaluate(() => Promise.all([700, 800, 900].map((w) => document.fonts.load(`${w} 100px WS`, 'aÄŁĄĘŚŻĞİŞÇÖÜé¡'))));

  const locales = validate ? ['en-US'] : Object.keys(S.COPY).filter((l) => !only || l === only);
  for (const loc of locales) {
    const copy = validate ? S.EN : S.COPY[loc];
    for (const dir of [S.PHONE_DIR, S.PAD_DIR]) {
      const layout = JSON.parse(JSON.stringify(S.LAYOUT[dir]));
      layout.hdr.textRight = dir === S.PHONE_DIR ? 1150 : 1794;
      const device = dir === S.PHONE_DIR ? 'phone' : 'pad';
      fs.mkdirSync(path.join(outRoot, loc, dir), { recursive: true });
      for (let idx = 0; idx < 6; idx++) {
        const b64 = fs.readFileSync(path.join(SRC, dir, S.FILES[dir][idx])).toString('base64');
        const res = await page.evaluate(processImage, { b64, layout, idx, device, copy, ref: S.EN, debug });
        const out = path.join(outRoot, loc, dir, S.OUT_NAMES[idx]);
        // App Store Connect wants opaque images: drop the (fully opaque) alpha channel
        const flat = PNG.sync.write(PNG.sync.read(Buffer.from(res.png, 'base64')), { colorType: 2, inputHasAlpha: true });
        fs.writeFileSync(validate ? path.join(outRoot, loc, dir, S.FILES[dir][idx]) : out, flat);
        console.log(loc, device, idx + 1, 'band', res.bandBottom, 'clip', res.clipY, res.log.map((l) => `${l.key}:${l.used}${l.scale < 1 ? '(x' + l.scale + ')' : ''}`).join(' '));
            }
    }
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
