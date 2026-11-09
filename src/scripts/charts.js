// Interactive charts for the factor-portfolio article.
// Every element with [data-chart] on the page is rendered from the same dataset;
// a [data-currency] toggle switches all of them between USD and EUR.
import D from '../data/charts.json';

const lang = document.documentElement.lang === 'en' ? 'en' : 'ro';
const MINUS = '−';
const MON = lang === 'ro'
  ? ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sep.', 'oct.', 'nov.', 'dec.']
  : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nf0 = new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 0 });
const T = lang === 'ro' ? {
  mkt: 'VWCE', mix: '50/50', atHigh: 'la maxim', belowHigh: 'față de maxim', ratio: 'Raport',
  growthTitle: (c, d) => `Cât ar valora 100 ${c} investiți în ${d}`,
  startUSD: 'decembrie 1969', startEUR: 'ianuarie 1999',
  src: { us: ['SUA, portofolii academice', 'SUA'], dev: ['piețe dezvoltate, academic', 'dezv.'], msci: ['indici MSCI', 'MSCI'] },
  yearsAxis: 'ani de la vârful dinaintea crizei', recovered: (y) => `revenit după ${y} ani de la vârf`, stillBelow: (y) => `încă sub vârf după ${y} ani`,
  pp: 'puncte procentuale', ppYear: 'puncte procentuale pe an', diff: 'Diferență', perYear: ' pe an',
  wealth: (n, pct, less) => `după ${n} ani, avere cu ${pct} ${less ? 'mai mică' : 'mai mare'} decât cu VWCE`,
  data: 'date', months: 'luni', inMonth: 'în', stillUnder: 'încă sub vârf',
  cols: ['Criză', 'Scădere', 'Coborâre', 'Revenire', 'Scădere', 'Coborâre', 'Revenire', 'puncte'],
  grp: ['VWCE (piața globală)', '50% Value + 50% Quality', 'Diferență'],
  names: null,
} : {
  mkt: 'VWCE', mix: '50/50', atHigh: 'at a high', belowHigh: 'below high', ratio: 'Ratio',
  growthTitle: (c, d) => `What 100 ${c} invested in ${d} would be worth`,
  startUSD: 'December 1969', startEUR: 'January 1999',
  src: { us: ['US, academic portfolios', 'US'], dev: ['developed markets, academic', 'dev.'], msci: ['MSCI indices', 'MSCI'] },
  yearsAxis: 'years since the pre-crisis peak', recovered: (y) => `recovered ${y} years after the peak`, stillBelow: (y) => `still below the peak after ${y} years`,
  pp: 'percentage points', ppYear: 'percentage points per year', diff: 'Difference', perYear: ' per year',
  wealth: (n, pct, less) => `after ${n} years, ${pct} ${less ? 'less' : 'more'} wealth than with VWCE`,
  data: 'data', months: 'months', inMonth: 'in', stillUnder: 'still below peak',
  cols: ['Crisis', 'Drawdown', 'Decline', 'Recovery', 'Drawdown', 'Decline', 'Recovery', 'points'],
  grp: ['VWCE (global market)', '50% Value + 50% Quality', 'Difference'],
  names: {
    '1970': 'Recession of 1969-70', '1973-74': 'Oil shock, 1973-74', '1975': 'Correction of 1975', '1978': 'Correction of 1978',
    '1980': 'Correction of 1980', '1980-82': 'Recession of 1980-82', '1983-84': 'Correction of 1983-84', '1987': 'October 1987 crash',
    '1990': 'Gulf War, 1990', '1998': 'Russia and LTCM, 1998', '2000-03': 'Dot-com bust, 2000-03', '2007-09': 'Financial crisis, 2007-09',
    '2010': 'Sovereign debt scare, 2010', '2011': 'Euro area crisis, 2011', '2015-16': 'China and oil, 2015-16', '2018': 'Correction of 2018',
    '2020': 'COVID-19 pandemic, 2020', '2022': 'Inflation and rates, 2022', '2025': 'Trade tariffs, 2025',
  },
};
const SRC_TAG = lang === 'ro' ? { us: 'SUA', dev: 'dezvoltate', msci: 'MSCI' } : { us: 'US', dev: 'developed', msci: 'MSCI' };

const state = { cur: 'usd', th: '15' };
const nameOf = (r) => (T.names ? T.names[r.short] || r.name : r.name);

function base(ds) { return Math.floor(ds.start / 100) * 12 + (ds.start % 100 - 1); }
function ymOf(ds, i) { const t = base(ds) + i; return [Math.floor(t / 12), t % 12]; }
function idxOf(ds, ym) { return Math.floor(ym / 100) * 12 + (ym % 100 - 1) - base(ds); }
function mlabel(ds, i) { const a = ymOf(ds, i); return `${MON[a[1]]} ${a[0]}`; }
function dec(x, d) { return Math.abs(x).toFixed(d).replace('.', lang === 'ro' ? ',' : '.'); }
function pct(x, d = 1) { return (x < 0 ? MINUS : '') + dec(x * 100, d) + '%'; }
function pctS(x) { return (x < 0 ? MINUS : '+') + dec(x * 100, 1) + '%'; }
function signed(x, d) { return (x < 0 ? MINUS : '+') + dec(x, d); }
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }

function prep(ds) {
  if (ds.uwm) return ds;
  let pm = -1e9, px = -1e9; ds.uwm = []; ds.uwx = []; ds.ratio = [];
  for (let i = 0; i < ds.n; i++) {
    pm = Math.max(pm, ds.mkt[i]); px = Math.max(px, ds.mix[i]);
    ds.uwm.push(ds.mkt[i] / pm - 1); ds.uwx.push(ds.mix[i] / px - 1); ds.ratio.push(ds.mix[i] / ds.mkt[i] * 100);
  }
  return ds;
}
const data = () => prep(D[state.cur]);
const ccy = () => (state.cur === 'usd' ? 'USD' : 'EUR');

function logTicks(lo, hi) {
  for (const set of [[1, 2, 5], [1, 3], [1]]) {
    const out = [];
    for (let k = Math.floor(Math.log10(lo)) - 1; k <= Math.ceil(Math.log10(hi)); k++)
      for (const m of set) { const v = m * Math.pow(10, k); if (v >= lo && v <= hi) out.push(v); }
    if (out.length <= 7) return out;
  }
  return [];
}
function pathOf(arr, X, Y) { let s = ''; for (let i = 0; i < arr.length; i++) s += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(arr[i]).toFixed(1); return s; }
function tipRow(tip, cls, name, val, sub) {
  const r = el('div', 'r'); r.appendChild(el('i', cls === null ? '' : 'key ' + cls)); r.appendChild(el('span', 'n', name)); r.appendChild(el('span', 'v', val));
  if (sub) r.appendChild(el('span', 's', sub)); tip.appendChild(r);
}

/* ------------------------------------------------------------------ growth */
function growth(root) {
  const ds = data(), host = root.querySelector('.plot'), tip = root.querySelector('.tip'), title = root.querySelector('[data-title]');
  const W = Math.max(280, Math.floor(root.clientWidth)), narrow = W < 560, H = narrow ? 300 : 400;
  const m = { l: narrow ? 42 : 54, r: narrow ? 50 : 60, t: 22, b: 42 }, pw = W - m.l - m.r, bottom = H - m.b, ph = bottom - m.t;
  const X = (i) => m.l + i / (ds.n - 1) * pw;
  const all = ds.mkt.concat(ds.mix), lo = Math.min(...all) * 0.88, hi = Math.max(...all) * 1.12;
  const Y = (v) => m.t + (1 - (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * ph;
  if (title) title.textContent = T.growthTitle(ccy(), state.cur === 'usd' ? T.startUSD : T.startEUR);
  const first = ymOf(ds, 0)[0] + 1, last = ymOf(ds, ds.n - 1)[0], step = last - first > 40 ? 10 : 5;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`;
  const rows = ds.crises[state.th];
  for (const r of rows) { const x0 = X(r.mkt.p), x1 = X(r.mkt.t); s += `<rect x="${x0.toFixed(1)}" y="${m.t}" width="${Math.max(1.5, x1 - x0).toFixed(1)}" height="${ph}" fill="var(--band)"/>`; }
  const placed = [];
  rows.map((r, i) => i).sort((a, b) => rows[a].mkt.d - rows[b].mkt.d).forEach((i) => {
    const r = rows[i], cx = (X(r.mkt.p) + X(r.mkt.t)) / 2, w = r.short.length * 6.1 + 6, a = cx - w / 2, z = cx + w / 2;
    if (a < m.l - 4 || z > W - m.r + 4) return;
    for (const p of placed) if (a < p[1] && z > p[0]) return;
    placed.push([a, z]); s += `<text class="bl" x="${cx.toFixed(1)}" y="${m.t - 5}" text-anchor="middle">${r.short}</text>`;
  });
  for (const t of logTicks(lo, hi)) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="var(--grid)"/><text x="${m.l - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${nf0.format(t)}</text>`;
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${bottom}" y2="${bottom}" stroke="var(--axis)"/>`;
  for (let yr = Math.ceil(first / step) * step; yr <= last; yr += step) { const x = X(idxOf(ds, (yr - 1) * 100 + 12)).toFixed(1); s += `<line x1="${x}" x2="${x}" y1="${bottom}" y2="${bottom + 4}" stroke="var(--axis)"/><text x="${x}" y="${bottom + 16}" text-anchor="middle">${yr}</text>`; }
  const sy = bottom + 30;
  ds.seg.forEach((sg, k) => {
    const a = X(Math.max(0, idxOf(ds, sg[0]))), z = X(Math.min(ds.n - 1, idxOf(ds, sg[1]))), w = z - a;
    s += `<line x1="${a.toFixed(1)}" x2="${z.toFixed(1)}" y1="${sy}" y2="${sy}" stroke="var(--axis)"/><line x1="${a.toFixed(1)}" x2="${a.toFixed(1)}" y1="${sy - 3}" y2="${sy + 3}" stroke="var(--axis)"/>`;
    if (k === ds.seg.length - 1) s += `<line x1="${z.toFixed(1)}" x2="${z.toFixed(1)}" y1="${sy - 3}" y2="${sy + 3}" stroke="var(--axis)"/>`;
    let lab = T.src[sg[2]][0]; if (lab.length * 6.1 + 8 > w) lab = T.src[sg[2]][1];
    if (lab.length * 6.1 + 4 <= w) s += `<text class="bl" x="${((a + z) / 2).toFixed(1)}" y="${sy + 14}" text-anchor="middle">${lab}</text>`;
  });
  const series = [{ arr: ds.mkt, color: '--s1' }, { arr: ds.mix, color: '--s2' }];
  for (const sr of series) s += `<path d="${pathOf(sr.arr, X, Y)}" fill="none" stroke="var(${sr.color})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const ends = series.map((sr) => ({ y: Y(sr.arr[ds.n - 1]), v: sr.arr[ds.n - 1], color: sr.color })).sort((a, b) => a.y - b.y);
  if (ends[1].y - ends[0].y < 14) { const mid = (ends[0].y + ends[1].y) / 2; ends[0].ly = mid - 7; ends[1].ly = mid + 7; }
  for (const e of ends) { const xe = X(ds.n - 1); s += `<circle cx="${xe.toFixed(1)}" cy="${e.y.toFixed(1)}" r="4" fill="var(${e.color})" stroke="var(--surface)" stroke-width="2"/><text class="end" x="${(xe + 9).toFixed(1)}" y="${((e.ly ?? e.y) + 4).toFixed(1)}">${nf0.format(e.v)}</text>`; }
  s += `<g class="xh" visibility="hidden"><line y1="${m.t}" y2="${bottom}" stroke="var(--ink-2)"/><circle r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/><circle r="4.5" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/></g></svg>`;
  host.innerHTML = s;
  const xh = host.querySelector('.xh'), dots = xh.querySelectorAll('circle'), ln = xh.querySelector('line');
  const show = (i, py) => {
    const x = X(i); xh.setAttribute('visibility', 'visible'); ln.setAttribute('x1', x); ln.setAttribute('x2', x);
    dots[0].setAttribute('cx', x); dots[0].setAttribute('cy', Y(ds.mkt[i])); dots[1].setAttribute('cx', x); dots[1].setAttribute('cy', Y(ds.mix[i]));
    tip.textContent = ''; tip.className = 'tip'; tip.appendChild(el('div', 'd', mlabel(ds, i)));
    tipRow(tip, '', T.mkt, nf0.format(ds.mkt[i]), ds.uwm[i] < -0.0005 ? `${pct(ds.uwm[i])} ${T.belowHigh}` : T.atHigh);
    tipRow(tip, 'k2', T.mix, nf0.format(ds.mix[i]), ds.uwx[i] < -0.0005 ? `${pct(ds.uwx[i])} ${T.belowHigh}` : T.atHigh);
    tipRow(tip, 'k3', T.ratio, nf0.format(ds.ratio[i]));
    tip.hidden = false;
    let left = x + 14; if (left + tip.offsetWidth > W) left = x - 14 - tip.offsetWidth; if (left < 0) left = 0;
    tip.style.left = left + 'px'; tip.style.top = (py == null ? 40 : Math.max(0, Math.min(root.clientHeight - tip.offsetHeight, py - tip.offsetHeight - 14))) + 'px';
  };
  const hide = () => { xh.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  root._hover = { show, hide, n: ds.n, idx: (px) => Math.max(0, Math.min(ds.n - 1, Math.round((px - m.l) / pw * (ds.n - 1)))) };
}

/* ---------------------------------------------------------------- recovery */
function recovery(root) {
  const ds = data(), rows = ds.crises[state.th], host = root.querySelector('.plot'), tip = root.querySelector('.tip');
  const W = Math.max(280, Math.floor(root.clientWidth)), narrow = W < 560, H = narrow ? 320 : 430;
  const m = { l: narrow ? 42 : 54, r: narrow ? 12 : 22, t: 10, b: 42 }, pw = W - m.l - m.r, ph = H - m.t - m.b, bottom = m.t + ph;
  const lines = []; let maxM = 12, minD = -0.1;
  rows.forEach((r, ci) => {
    for (const [k, color] of [['mkt', '--s1'], ['mix', '--s2']]) {
      const c = r[k], lv = ds[k], end = c.r === null ? ds.n - 1 : c.r, pts = [];
      for (let i = c.p; i <= end; i++) { const y = Math.min(0, lv[i] / lv[c.p] - 1); pts.push(y); if (y < minD) minD = y; }
      maxM = Math.max(maxM, pts.length - 1);
      lines.push({ ci, color, pts, t: c.t - c.p, open: c.r === null });
    }
  });
  const years = Math.ceil(maxM / 12 + 0.15), xm = years * 12, st = minD < -0.3 ? 0.2 : 0.1, lo = Math.floor(minD / st - 0.05) * st;
  const X = (k) => m.l + k / xm * pw, Y = (v) => m.t + v / lo * ph;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img">`;
  for (let v = 0; v >= lo - 1e-9; v -= st) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(${v === 0 ? '--axis' : '--grid'})"/><text x="${m.l - 7}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${pct(v, 0)}</text>`;
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${bottom}" y2="${bottom}" stroke="var(--axis)"/>`;
  const stepY = years > 8 ? 2 : 1;
  for (let yr = 0; yr <= years; yr += stepY) { const xx = X(yr * 12).toFixed(1); s += `<line x1="${xx}" x2="${xx}" y1="${bottom}" y2="${bottom + 4}" stroke="var(--axis)"/><text x="${xx}" y="${bottom + 16}" text-anchor="middle">${yr}</text>`; }
  s += `<text class="ax" x="${(m.l + pw / 2).toFixed(1)}" y="${bottom + 34}" text-anchor="middle">${T.yearsAxis}</text>`;
  for (const l of lines) {
    let d = ''; for (let k = 0; k < l.pts.length; k++) d += (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(l.pts[k]).toFixed(1);
    s += `<path data-ci="${l.ci}" d="${d}" fill="none" stroke="var(${l.color})" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    if (!l.open) s += `<circle data-ci="${l.ci}" cx="${X(l.pts.length - 1).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="3.5" fill="var(${l.color})" stroke="var(--surface)" stroke-width="2"/>`;
  }
  const boxes = [];
  rows.map((r, i) => i).sort((a, b) => rows[a].mkt.d - rows[b].mkt.d).forEach((i) => {
    const r = rows[i], w = r.short.length * 6.2 + 8; let cx = X(r.mkt.t - r.mkt.p); const cy = Y(r.mkt.d) + 16;
    if (cx - w / 2 < m.l) cx = m.l + w / 2;
    const bx = [cx - w / 2, cx + w / 2, cy - 12, cy + 4];
    if (bx[1] > W - m.r || bx[3] > bottom - 2) return;
    for (const q of boxes) if (bx[0] < q[1] && bx[1] > q[0] && bx[2] < q[3] && bx[3] > q[2]) return;
    boxes.push(bx); s += `<text class="lb" data-lb="${i}" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle">${r.short}</text>`;
  });
  s += '<g class="hl"></g></svg>';
  host.innerHTML = s;
  const svg = host.querySelector('svg');
  const set = (ci, withTip) => {
    root._cr = ci;
    svg.querySelectorAll('[data-ci]').forEach((e) => { const on = ci === null || +e.getAttribute('data-ci') === ci; e.style.opacity = on ? '' : '0.14'; if (e.tagName.toLowerCase() === 'path') e.setAttribute('stroke-width', ci !== null && on ? 3 : 1.6); });
    svg.querySelectorAll('[data-lb]').forEach((e) => { e.style.opacity = ci === null ? '' : '0'; });
    let g = '';
    if (ci !== null) {
      const r = rows[ci];
      for (const l of lines) if (l.ci === ci) g += `<circle cx="${X(l.t).toFixed(1)}" cy="${Y(l.pts[l.t]).toFixed(1)}" r="4.5" fill="var(${l.color})" stroke="var(--surface)" stroke-width="2"/>`;
      const w = r.short.length * 6.2 + 8, cx = Math.max(m.l + w / 2, X(r.mkt.t - r.mkt.p)), cy = Math.min(bottom - 6, Y(Math.min(r.mkt.d, r.mix.d)) + 18);
      g += `<text class="lb" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle">${r.short}</text>`;
    }
    svg.querySelector('.hl').innerHTML = g;
    document.querySelectorAll('[data-chart="table"] tbody tr').forEach((tr, i) => tr.classList.toggle('on', i === ci));
    if (ci === null || !withTip) { tip.hidden = true; return; }
    const row = rows[ci]; tip.textContent = ''; tip.className = 'tip mini'; tip.appendChild(el('div', 'd', nameOf(row)));
    for (const [k, cls, name] of [['mkt', '', T.mkt], ['mix', 'k2', T.mix]]) {
      const c = row[k], yrs = dec(((c.r === null ? ds.n - 1 : c.r) - c.p) / 12, 1);
      tipRow(tip, cls, name, pct(c.d), c.r === null ? T.stillBelow(yrs) : T.recovered(yrs));
    }
    tip.hidden = false;
    tip.style.left = Math.max(0, W - m.r - tip.offsetWidth - 6) + 'px'; tip.style.top = Math.max(0, bottom - tip.offsetHeight - 8) + 'px';
  };
  set(null, false);
  root._rec = { set, rows, nearest(px, py) {
    let best = null, bd = 34 * 34; const k0 = Math.round((px - m.l) / (X(1) - X(0)));
    for (const l of lines) {
      for (let k = Math.max(0, k0 - 3); k <= Math.min(l.pts.length - 1, k0 + 3); k++) { const dx = X(k) - px, dy = Y(l.pts[k]) - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = l.ci; } }
      const ke = l.pts.length - 1, ex = X(ke) - px, ey = Y(l.pts[ke]) - py; if (k0 > ke && ex * ex + ey * ey < bd) { bd = ex * ex + ey * ey; best = l.ci; }
    }
    return best;
  } };
}

/* -------------------------------------------------------------- yearly diff */
function perfSeries(ds, N) {
  const ends = []; for (let i = 0; i < ds.n; i++) if (ymOf(ds, i)[1] === 11) ends.push(i);
  if (ends[0] !== 0) ends.unshift(0); if (ends[ends.length - 1] !== ds.n - 1) ends.push(ds.n - 1);
  const out = [];
  for (let k = 1; k < ends.length; k++) {
    const b = ends[k], a = N === 1 ? ends[k - 1] : b - 12 * N; if (a < 0) continue;
    const gm = ds.mkt[b] / ds.mkt[a], gx = ds.mix[b] / ds.mix[a];
    const rm = N === 1 ? gm - 1 : Math.pow(gm, 1 / N) - 1, rx = N === 1 ? gx - 1 : Math.pow(gx, 1 / N) - 1;
    out.push({ y: ymOf(ds, b)[0], a, b, rm, rx, d: rx - rm, cum: gx / gm - 1, partial: N === 1 && b - a < 12 });
  }
  return out;
}
function srcOfYear(ds, y) { for (const sg of ds.seg) if (Math.floor(sg[1] / 100) >= y) return sg[2]; return ds.seg[ds.seg.length - 1][2]; }
function perf(root) {
  const ds = data(), N = +(root.querySelector('input[name="hz"]:checked')?.value || 1), ser = perfSeries(ds, N);
  const host = root.querySelector('.plot'), tip = root.querySelector('.tip');
  const W = Math.max(280, Math.floor(root.clientWidth)), narrow = W < 560, H = narrow ? 300 : 380, strip = N === 1;
  const m = { l: narrow ? 40 : 50, r: 12, t: 24, b: strip ? 46 : 26 }, pw = W - m.l - m.r, ph = H - m.t - m.b, bottom = m.t + ph;
  const n = ser.length, slot = pw / n, bw = Math.max(2, Math.min(22, slot * 0.7));
  let lo = 0, hi = 0, iMin = 0, iMax = 0;
  ser.forEach((p, i) => { const v = p.d * 100; if (v < lo) { lo = v; iMin = i; } if (v > hi) { hi = v; iMax = i; } });
  const step = [0.5, 1, 2, 5, 10].find((q) => (hi - lo) / q <= 6) || 20;
  lo = Math.floor(lo / step - 0.35) * step; hi = Math.ceil(hi / step + 0.35) * step;
  const Y = (v) => m.t + (hi - v) / (hi - lo) * ph, Xc = (i) => m.l + (i + 0.5) * slot;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"><rect class="hov" y="${m.t}" height="${ph}" width="${slot.toFixed(1)}" fill="var(--wash)" visibility="hidden"/>`;
  for (let v = lo; v <= hi + 1e-9; v += step) { const vv = Math.round(v * 10) / 10; s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(vv).toFixed(1)}" y2="${Y(vv).toFixed(1)}" stroke="var(${vv === 0 ? '--axis' : '--grid'})"/><text x="${m.l - 7}" y="${(Y(vv) + 4).toFixed(1)}" text-anchor="end">${vv === 0 ? '0' : signed(vv, step < 1 ? 1 : 0)}</text>`; }
  s += `<text class="ax" x="${m.l}" y="${m.t - 10}">${N === 1 ? T.pp : T.ppYear}</text>`;
  const y0 = Y(0), stepY = n > 30 ? 10 : 5;
  ser.forEach((p, i) => {
    const x = Xc(i) - bw / 2, y1 = Y(p.d * 100), h = Math.abs(y1 - y0), r = Math.min(4, bw / 2, h), up = p.d >= 0, q = up ? r : -r;
    const d = h < 0.6 ? `M${x.toFixed(1)} ${(y0 - 0.6).toFixed(1)}h${bw.toFixed(1)}v1.2h${(-bw).toFixed(1)}Z`
      : `M${x.toFixed(1)} ${y0.toFixed(1)}L${x.toFixed(1)} ${(y1 + q).toFixed(1)}Q${x.toFixed(1)} ${y1.toFixed(1)} ${(x + r).toFixed(1)} ${y1.toFixed(1)}L${(x + bw - r).toFixed(1)} ${y1.toFixed(1)}Q${(x + bw).toFixed(1)} ${y1.toFixed(1)} ${(x + bw).toFixed(1)} ${(y1 + q).toFixed(1)}L${(x + bw).toFixed(1)} ${y0.toFixed(1)}Z`;
    s += `<path d="${d}" fill="var(${up ? '--s2' : '--s1'})"${p.partial ? ' opacity="0.5"' : ''}/>`;
    if (p.y % stepY === 0) s += `<line x1="${Xc(i).toFixed(1)}" x2="${Xc(i).toFixed(1)}" y1="${bottom}" y2="${bottom + 4}" stroke="var(--axis)"/><text x="${Xc(i).toFixed(1)}" y="${bottom + 16}" text-anchor="middle">${p.y}</text>`;
  });
  s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="var(--axis)"/>`;
  for (const i of [iMin, iMax]) {
    const p = ser[i], txt = `${p.y}: ${signed(p.d * 100, 1)}`, w = txt.length * 6.6 + 6;
    const cx = Math.max(m.l + w / 2, Math.min(W - m.r - w / 2, Xc(i))), cy = Y(p.d * 100) + (p.d < 0 ? 15 : -7);
    s += `<text class="lb strong" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle">${txt}</text>`;
  }
  if (strip) {
    const sy = bottom + 26; let i0 = 0;
    while (i0 < n) {
      const key = srcOfYear(ds, ser[i0].y); let i1 = i0; while (i1 + 1 < n && srcOfYear(ds, ser[i1 + 1].y) === key) i1++;
      const a = m.l + i0 * slot, z = m.l + (i1 + 1) * slot, wd = z - a; let lab = T.src[key][0];
      s += `<line x1="${a.toFixed(1)}" x2="${z.toFixed(1)}" y1="${sy}" y2="${sy}" stroke="var(--axis)"/><line x1="${a.toFixed(1)}" x2="${a.toFixed(1)}" y1="${sy - 3}" y2="${sy + 3}" stroke="var(--axis)"/>`;
      if (i1 === n - 1) s += `<line x1="${z.toFixed(1)}" x2="${z.toFixed(1)}" y1="${sy - 3}" y2="${sy + 3}" stroke="var(--axis)"/>`;
      if (lab.length * 6.1 + 8 > wd) lab = T.src[key][1];
      if (lab.length * 6.1 + 4 <= wd) s += `<text class="ax" x="${((a + z) / 2).toFixed(1)}" y="${sy + 14}" text-anchor="middle">${lab}</text>`;
      i0 = i1 + 1;
    }
  }
  host.innerHTML = s + '</svg>';
  const hov = host.querySelector('.hov');
  const set = (i) => {
    root._pf = i;
    if (i === null) { hov.setAttribute('visibility', 'hidden'); tip.hidden = true; return; }
    const p = ser[i], per = N === 1 ? '' : T.perYear;
    hov.setAttribute('x', (m.l + i * slot).toFixed(1)); hov.setAttribute('visibility', 'visible');
    const label = ymOf(ds, p.b)[1] !== 11 || p.partial ? `${mlabel(ds, p.a + 1)} - ${mlabel(ds, p.b)}` : N === 1 ? String(p.y) : `${p.y - N + 1} - ${p.y}`;
    tip.textContent = ''; tip.className = 'tip'; tip.appendChild(el('div', 'd', label));
    tipRow(tip, '', T.mkt, pctS(p.rm) + per); tipRow(tip, 'k2', T.mix, pctS(p.rx) + per);
    const sub = N === 1 ? (state.cur === 'usd' ? `${T.data}: ${T.src[srcOfYear(ds, p.y)][0]}` : null) : T.wealth(N, pct(Math.abs(p.cum)), p.cum < 0);
    tipRow(tip, null, T.diff, `${signed(p.d * 100, 1)} pp${per}`, sub);
    tip.hidden = false;
    const x = Xc(i); let left = x + 16; if (left + tip.offsetWidth > W) left = x - 16 - tip.offsetWidth; if (left < 0) left = 0;
    tip.style.left = left + 'px'; tip.style.top = (p.d >= 0 ? Math.max(6, bottom - tip.offsetHeight - 6) : 6) + 'px';
  };
  set(null);
  root._perf = { set, n, idx: (px) => { const i = Math.floor((px - m.l) / slot); return i < 0 || i >= n ? null : i; } };
}

/* ------------------------------------------------------------- crisis table */
function table(root) {
  const ds = data(), rows = ds.crises[state.th], tbl = root.querySelector('table'); tbl.textContent = '';
  const thead = el('thead'), g = el('tr', 'grp'); g.appendChild(el('th'));
  [['', T.grp[0], 3, ''], ['k2', T.grp[1], 3, 'sep'], [null, T.grp[2], 1, 'sep']].forEach((c) => {
    const th = el('th', c[3]); th.colSpan = c[2]; const sp = el('span', 'g'); if (c[0] !== null) sp.appendChild(el('i', 'key ' + c[0])); sp.appendChild(document.createTextNode(c[1])); th.appendChild(sp); g.appendChild(th);
  });
  thead.appendChild(g);
  const h = el('tr'); T.cols.forEach((t, i) => h.appendChild(el('th', i === 4 || i === 7 ? 'sep' : '', t))); thead.appendChild(h); tbl.appendChild(thead);
  const tb = el('tbody');
  rows.forEach((r, i) => {
    const tr = el('tr'), c0 = el('td');
    nameOf(r).split(/(\d{4}-\d{2})/).forEach((part) => { if (/^\d{4}-\d{2}$/.test(part)) c0.appendChild(el('span', 'nb', part)); else if (part) c0.appendChild(document.createTextNode(part)); });
    c0.appendChild(el('span', 'small', `${mlabel(ds, r.mkt.p)} - ${mlabel(ds, r.mkt.t)}${state.cur === 'usd' ? ' · ' + SRC_TAG[r.src] : ''}`));
    tr.appendChild(c0);
    [['mkt', ''], ['mix', 'b2']].forEach((k, j) => {
      const c = r[k[0]], d = el('td', 'depth' + (j ? ' sep' : '')); d.appendChild(el('b', '', pct(c.d)));
      const bar = el('span', 'bar ' + k[1]); bar.style.width = Math.max(2, Math.min(100, Math.abs(c.d) / 0.6 * 100)).toFixed(0) + '%'; d.appendChild(bar); tr.appendChild(d);
      tr.appendChild(el('td', '', `${c.t - c.p} ${T.months}`));
      const rec = el('td', '', c.r === null ? T.stillUnder : `${c.r - c.t} ${T.months}`); if (c.r !== null) rec.appendChild(el('span', 'small', `${T.inMonth} ${mlabel(ds, c.r)}`)); tr.appendChild(rec);
    });
    tr.appendChild(el('td', 'sep', signed((r.mix.d - r.mkt.d) * 100, 1)));
    tr.addEventListener('mouseenter', () => document.querySelectorAll('[data-chart="recovery"]').forEach((e) => e._rec?.set(i, false)));
    tr.addEventListener('mouseleave', () => document.querySelectorAll('[data-chart="recovery"]').forEach((e) => e._rec?.set(null, false)));
    tb.appendChild(tr);
  });
  tbl.appendChild(tb);
}

/* ------------------------------------------------------------------- wiring */
const RENDER = { growth, recovery, perf, table };
function renderAll() { document.querySelectorAll('[data-chart]').forEach((root) => RENDER[root.dataset.chart]?.(root)); }

document.querySelectorAll('[data-chart]').forEach((root) => {
  const kind = root.dataset.chart, wrap = root.querySelector('.plot-wrap');
  if (!wrap) return;
  const rect = (ev) => { const b = wrap.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  if (kind === 'growth') {
    wrap.addEventListener('pointermove', (ev) => { const [px, py] = rect(ev); root._hover.show(root._hover.idx(px), py); });
    wrap.addEventListener('pointerleave', () => { if (document.activeElement !== wrap) root._hover.hide(); });
    wrap.addEventListener('blur', () => root._hover.hide());
    wrap.addEventListener('keydown', (ev) => {
      const n = root._hover.n; let i = root._hi ?? n - 1; const st = ev.shiftKey ? 12 : 1;
      if (ev.key === 'ArrowLeft') i -= st; else if (ev.key === 'ArrowRight') i += st; else if (ev.key === 'Home') i = 0; else if (ev.key === 'End') i = n - 1; else if (ev.key === 'Escape') { root._hover.hide(); return; } else return;
      ev.preventDefault(); root._hi = Math.max(0, Math.min(n - 1, i)); root._hover.show(root._hi, null);
    });
  }
  if (kind === 'recovery') {
    wrap.addEventListener('pointermove', (ev) => { const [px, py] = rect(ev); const c = root._rec.nearest(px, py); if (c !== root._cr || root.querySelector('.tip').hidden !== (c === null)) root._rec.set(c, true); });
    wrap.addEventListener('pointerleave', () => { if (document.activeElement !== wrap) root._rec.set(null, false); });
    wrap.addEventListener('blur', () => root._rec.set(null, false));
    wrap.addEventListener('keydown', (ev) => {
      const n = root._rec.rows.length; let i = root._cr ?? null;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') i = i === null ? 0 : (i + 1) % n; else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') i = i === null ? n - 1 : (i + n - 1) % n;
      else if (ev.key === 'Home') i = 0; else if (ev.key === 'End') i = n - 1; else if (ev.key === 'Escape') { root._rec.set(null, false); return; } else return;
      ev.preventDefault(); root._rec.set(i, true);
    });
  }
  if (kind === 'perf') {
    wrap.addEventListener('pointermove', (ev) => { const [px] = rect(ev); const i = root._perf.idx(px); if (i !== root._pf) root._perf.set(i); });
    wrap.addEventListener('pointerleave', () => { if (document.activeElement !== wrap) root._perf.set(null); });
    wrap.addEventListener('blur', () => root._perf.set(null));
    wrap.addEventListener('keydown', (ev) => {
      const n = root._perf.n; let i = root._pf ?? n - 1;
      if (ev.key === 'ArrowLeft') i--; else if (ev.key === 'ArrowRight') i++; else if (ev.key === 'Home') i = 0; else if (ev.key === 'End') i = n - 1; else if (ev.key === 'Escape') { root._perf.set(null); return; } else return;
      ev.preventDefault(); root._perf.set(Math.max(0, Math.min(n - 1, i)));
    });
    root.querySelectorAll('input[name="hz"]').forEach((inp) => inp.addEventListener('change', () => perf(root)));
  }
  let last = 0, raf = 0;
  new ResizeObserver(() => { const w = Math.floor(root.clientWidth); if (w === last) return; last = w; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => RENDER[kind](root)); }).observe(root);
});
document.querySelectorAll('input[name="currency"]').forEach((inp) => inp.addEventListener('change', (ev) => { state.cur = ev.target.value; renderAll(); }));
document.querySelectorAll('input[name="threshold"]').forEach((inp) => inp.addEventListener('change', (ev) => { state.th = ev.target.value; renderAll(); }));
renderAll();
