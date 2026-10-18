/* Heat Transfer Virtual Lab — core engine
   Each experiment registers a definition object (see README.md). The engine provides the
   eight-stage workflow: Pre-test → Theory → Operate → Experiment → Validation → Numericals → Post-test → Report. */
(function () {
  'use strict';
  const LAB = (window.LAB = { exps: {}, list: [] });
  LAB.register = function (e) { LAB.exps[e.id] = e; LAB.list.push(e); };
  LAB.CATS = [
    ['cond', 'Conduction', 'Steady and transient heat flow through solids, insulation and liquids'],
    ['fin', 'Extended surfaces', 'Fins: temperature distribution, efficiency and effectiveness'],
    ['conv', 'Convection', 'Free and forced convection coefficients and their correlations'],
    ['rad', 'Radiation', 'Emissivity and the Stefan–Boltzmann law'],
    ['phase', 'Boiling & condensation', 'Heat transfer with phase change'],
    ['hx', 'Heat exchangers & devices', 'LMTD, effectiveness–NTU and passive two-phase devices'],
    ['sys', 'Thermal systems & processing', 'Refrigeration, air conditioning and quenching']
  ];
  const STAGES = [
    ['pre', 'Pre-test', 'Check readiness'],
    ['theory', 'Theory', 'Principles & standard'],
    ['operate', 'Operate', 'Set up & run'],
    ['experiment', 'Experiment', 'Observe & calculate'],
    ['validation', 'Validation', 'Check results'],
    ['num', 'Numericals', 'Randomised problems'],
    ['post', 'Post-test', 'Assess learning'],
    ['report', 'Report', 'Compile & export']
  ];
  LAB.STAGES = STAGES;
  LAB.EMBED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const EMBED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();

  /* ------------------------------------------------------------------ utilities */
  const U = (LAB.U = {
    rng(seed) { let a = seed >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    q(x, res) { return Math.round(x / res) * res; },
    f(x, d) { if (x == null || !isFinite(x)) return '—'; const s = (+x).toFixed(d == null ? 2 : d); return s === '-0' || /^-0\.0*$/.test(s) ? s.slice(1) : s; },
    sig(x, n) { if (!isFinite(x)) return '—'; if (x === 0) return '0'; const d = Math.max(0, n - 1 - Math.floor(Math.log10(Math.abs(x)))); return U.f(x, Math.min(d, 8)); },
    sci(x, n) { if (!isFinite(x)) return '—'; if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); if (e >= -2 && e < 5) return U.sig(x, n || 3); const m = x / Math.pow(10, e); return U.f(m, (n || 3) - 1) + '×10' + U.sup(e); },
    sup(n) { const m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(n).split('').map(c => m[c] || c).join(''); },
    lin(a, b, n) { const o = []; for (let i = 0; i < n; i++) o.push(a + (b - a) * i / (n - 1)); return o; },
    mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; },
    sd(a) { if (a.length < 2) return 0; const m = U.mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) * (v - m), 0) / (a.length - 1)); },
    clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
    linfit(x, y) { const n = x.length, mx = U.mean(x), my = U.mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } const m = sxy / sxx; return { m, c: my - m * mx, r2: syy ? (sxy * sxy) / (sxx * syy) : 1 }; },
    interp(xs, ys, x) { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]); return ys[i - 1] + t * (ys[i] - ys[i - 1]); } return ys[ys.length - 1]; },
    inv(xs, ys, y) { for (let i = 1; i < xs.length; i++) { const a = ys[i - 1], b = ys[i]; if ((a - y) * (b - y) <= 0 && a !== b) return xs[i - 1] + (y - a) / (b - a) * (xs[i] - xs[i - 1]); } return NaN; },
    bisect(fn, a, b, it) { let fa = fn(a); for (let i = 0; i < (it || 80); i++) { const m = (a + b) / 2, fm = fn(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; },
    esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
    pick(r, arr) { return arr[Math.floor(r() * arr.length)]; },
    pct(a, b) { return b === 0 ? NaN : (a - b) / Math.abs(b) * 100; },
    ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    seg(f, a, b) { return U.clamp((f - a) / (b - a), 0, 1); }
  });
  const $ = (s, el) => (el || document).querySelector(s);
  const h = (tag, attrs, html) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; };
  LAB.h = h;

  /* ------------------------------------------------------------------ storage */
  const Store = (LAB.Store = {
    get(k, d) { try { const v = localStorage.getItem('htl:' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('htl:' + k, JSON.stringify(v)); } catch (e) { } }
  });
  const memState = {};
  function st(id) { if (!memState[id]) memState[id] = Store.get('exp:' + id, {}) || {}; return memState[id]; }
  function save(id) { Store.set('exp:' + id, memState[id]); }
  LAB.state = st;
  LAB.save = id => save(id);

  /* ------------------------------------------------------------------ palette & plotter */
  const PAPER = { bg: '#ffffff', ink: '#141c24', muted: '#55606b', line: '#c9d0d7', grid: '#e9edf1', s1: '#1d5a91', s2: '#c0661c', s3: '#2c7a4b', s4: '#8a3f9a', s5: '#b23b2a', s6: '#4c7c86', straw: '#a8741f', accent: '#1d5a91', ok: '#2c7a4b', bad: '#b23b2a', surface: '#ffffff' };
  function themePal() { const cs = getComputedStyle(document.documentElement); const g = n => cs.getPropertyValue('--' + n).trim(); const p = {}; ['ink', 'muted', 'line', 'grid', 's1', 's2', 's3', 's4', 's5', 's6', 'straw', 'accent', 'ok', 'bad', 'surface'].forEach(k => p[k] = g(k)); p.bg = g('surface'); return p; }
  LAB.pal = themePal;
  function niceStep(span, n) { const raw = span / n; const mag = Math.pow(10, Math.floor(Math.log10(raw))); const r = raw / mag; return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag; }
  function axis(min, max, log, n) {
    if (log) { const lo = Math.floor(Math.log10(min)), hi = Math.ceil(Math.log10(max)); const t = []; for (let k = lo; k <= hi; k++) t.push(Math.pow(10, k)); return { min: Math.pow(10, lo), max: Math.pow(10, hi), ticks: t, log: true, fmt: v => '10' + U.sup(Math.round(Math.log10(v))) }; }
    if (max === min) { max = min + 1; }
    const step = niceStep(max - min, n || 6); const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step; const t = []; for (let v = lo; v <= hi + step * 1e-6; v += step) t.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9)); return { min: lo, max: hi, ticks: t, log: false, fmt: v => (Math.abs(v) >= 1e5 ? v.toExponential(1) : U.f(v, dec)) };
  }
  LAB.plot = function (canvas, cfg, opt) {
    opt = opt || {}; const pal = opt.pal || themePal(); const dpr = opt.dpr || window.devicePixelRatio || 1;
    const W = opt.w || canvas.clientWidth || 640, H = opt.h || canvas.clientHeight || 340;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = opt.bg || pal.bg; g.fillRect(0, 0, W, H);
    const series = (cfg.series || []).filter(s => s && s.x && s.x.length);
    const col = c => (c && pal[c]) || c || pal.s1;
    // ranges
    let xs = [], ys = []; series.forEach(s => { if (s.noscale) return; s.x.forEach((v, i) => { if (isFinite(v) && isFinite(s.y[i]) && (!cfg.xlog || v > 0) && (!cfg.ylog || s.y[i] > 0)) { xs.push(v); ys.push(s.y[i]); } }); });
    (cfg.hlines || []).forEach(l => ys.push(l.y)); (cfg.vlines || []).forEach(l => xs.push(l.x));
    let xmin = cfg.xmin != null ? cfg.xmin : Math.min(...xs), xmax = cfg.xmax != null ? cfg.xmax : Math.max(...xs);
    let ymin = cfg.ymin != null ? cfg.ymin : Math.min(...ys), ymax = cfg.ymax != null ? cfg.ymax : Math.max(...ys);
    if (!xs.length) { xmin = 0; xmax = 1; } if (!ys.length) { ymin = 0; ymax = 1; }
    if (!cfg.xlog && cfg.xmin == null && xmin >= 0 && xmin < 0.35 * xmax && cfg.xzero !== false) xmin = 0;
    if (!cfg.ylog && cfg.ymin == null && ymin >= 0 && ymin < 0.35 * ymax && cfg.yzero !== false) ymin = 0;
    if (!cfg.ylog && cfg.ymax == null) ymax += (ymax - ymin) * 0.04;
    const ax = axis(xmin, xmax, cfg.xlog, opt.xt || 7), ay = axis(ymin, ymax, cfg.ylog, opt.yt || 6);
    if (cfg.xmin != null && !cfg.xlog) ax.min = cfg.xmin; if (cfg.xmax != null && !cfg.xlog) ax.max = cfg.xmax;
    if (cfg.ymin != null && !cfg.ylog) ay.min = cfg.ymin; if (cfg.ymax != null && !cfg.ylog) ay.max = cfg.ymax;
    const named = series.filter(s => s.name && !s.nolegend);
    const fs = opt.fs || 11; g.font = `${fs}px ${getComputedStyle(document.body).getPropertyValue('--f-mono') || 'monospace'}`;
    const ml = 64, mr = 18, mt = named.length ? 34 : 16, mb = 46; const pw = W - ml - mr, ph = H - mt - mb;
    const X = v => ml + (ax.log ? (Math.log10(v) - Math.log10(ax.min)) / (Math.log10(ax.max) - Math.log10(ax.min)) : (v - ax.min) / (ax.max - ax.min)) * pw;
    const Y = v => mt + ph - (ay.log ? (Math.log10(v) - Math.log10(ay.min)) / (Math.log10(ay.max) - Math.log10(ay.min)) : (v - ay.min) / (ay.max - ay.min)) * ph;
    // grid
    g.lineWidth = 1; g.strokeStyle = pal.grid; g.fillStyle = pal.muted; g.textAlign = 'center'; g.textBaseline = 'top';
    ax.ticks.forEach(t => { if (t < ax.min - 1e-12 || t > ax.max * (1 + 1e-9) + 1e-12) return; const x = Math.round(X(t)) + .5; g.beginPath(); g.moveTo(x, mt); g.lineTo(x, mt + ph); g.stroke(); g.fillText(ax.fmt(t), x, mt + ph + 6); });
    g.textAlign = 'right'; g.textBaseline = 'middle';
    ay.ticks.forEach(t => { if (t < ay.min - 1e-12 || t > ay.max * (1 + 1e-9) + 1e-12) return; const y = Math.round(Y(t)) + .5; g.beginPath(); g.moveTo(ml, y); g.lineTo(ml + pw, y); g.stroke(); g.fillText(ay.fmt(t), ml - 7, y); });
    if (ax.log) { g.strokeStyle = pal.grid; for (let d = Math.log10(ax.min); d < Math.log10(ax.max); d++) for (let k = 2; k < 10; k++) { const x = X(k * Math.pow(10, d)); g.globalAlpha = .45; g.beginPath(); g.moveTo(x, mt); g.lineTo(x, mt + ph); g.stroke(); g.globalAlpha = 1; } }
    if (ay.log) { for (let d = Math.log10(ay.min); d < Math.log10(ay.max); d++) for (let k = 2; k < 10; k++) { const y = Y(k * Math.pow(10, d)); g.globalAlpha = .45; g.beginPath(); g.moveTo(ml, y); g.lineTo(ml + pw, y); g.stroke(); g.globalAlpha = 1; } }
    g.strokeStyle = pal.ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ml, mt); g.lineTo(ml, mt + ph); g.lineTo(ml + pw, mt + ph); g.stroke();
    // labels
    g.fillStyle = pal.ink; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(cfg.xlabel || '', ml + pw / 2, H - 8);
    g.save(); g.translate(14, mt + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'top'; g.fillText(cfg.ylabel || '', 0, 0); g.restore();
    // clip
    g.save(); g.beginPath(); g.rect(ml, mt - 2, pw + 2, ph + 4); g.clip();
    (cfg.bands || []).forEach(b => { g.fillStyle = col(b.color || 'ok'); g.globalAlpha = b.alpha || .12; if (b.y0 != null) g.fillRect(ml, Y(b.y1), pw, Y(b.y0) - Y(b.y1)); else g.fillRect(X(b.x0), mt, X(b.x1) - X(b.x0), ph); g.globalAlpha = 1; });
    const frac = cfg.frac == null ? 1 : cfg.frac;
    const dyn = series.filter(s => !s.static); const total = dyn.reduce((a, s) => a + s.x.length, 0); let budget = Math.round(frac * total); let head = null;
    series.forEach((s, si) => {
      let n = s.x.length; if (!s.static) { if (cfg.parallel) n = Math.round(frac * n); else { n = Math.min(n, budget); budget -= n; } } if (n <= 0) return;
      const c = col(s.color || 's' + ((si % 6) + 1)); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = s.width || 2; g.setLineDash(s.dash ? [6, 4] : []);
      const type = s.type || 'line';
      if (type === 'bar') { const bw = s.bw || pw / (s.x.length * 1.6); for (let i = 0; i < n; i++) { const y0 = Y(ay.log ? ay.min : Math.max(ay.min, 0)); g.globalAlpha = .85; g.fillRect(X(s.x[i]) - bw / 2, Y(s.y[i]), bw, y0 - Y(s.y[i])); } g.globalAlpha = 1; }
      if (type === 'line' || type === 'linepts' || type === 'area') {
        g.beginPath(); let started = false; for (let i = 0; i < n; i++) { const xv = s.x[i], yv = s.y[i]; if (!isFinite(xv) || !isFinite(yv) || (cfg.xlog && xv <= 0) || (cfg.ylog && yv <= 0)) { started = false; continue; } if (!started) { g.moveTo(X(xv), Y(yv)); started = true; } else g.lineTo(X(xv), Y(yv)); } g.stroke();
        if (type === 'area') { g.lineTo(X(s.x[n - 1]), Y(Math.max(ay.min, 0))); g.lineTo(X(s.x[0]), Y(Math.max(ay.min, 0))); g.closePath(); g.globalAlpha = .12; g.fill(); g.globalAlpha = 1; }
      }
      if (type === 'scatter' || type === 'linepts') { g.setLineDash([]); for (let i = 0; i < n; i++) { if ((cfg.xlog && s.x[i] <= 0) || (cfg.ylog && s.y[i] <= 0)) continue; const open = s.open && s.open[i]; g.beginPath(); g.arc(X(s.x[i]), Y(s.y[i]), s.r || 3.6, 0, 7); if (open) { g.lineWidth = 1.6; g.fillStyle = pal.bg; g.fill(); g.stroke(); g.fillStyle = c; } else g.fill(); } }
      if (type === 'stem') { for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(X(s.x[i]), Y(ay.min)); g.lineTo(X(s.x[i]), Y(s.y[i])); g.stroke(); } }
      g.setLineDash([]);
      if (!s.static && n < s.x.length && frac < 1) head = [X(s.x[n - 1]), Y(s.y[n - 1]), c];
      if (!s.static && frac < 1 && n === s.x.length && budget <= 0) head = [X(s.x[n - 1]), Y(s.y[n - 1]), c];
    });
    (cfg.hlines || []).forEach(l => { g.strokeStyle = col(l.color || 'muted'); g.lineWidth = 1.2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(ml, Y(l.y)); g.lineTo(ml + pw, Y(l.y)); g.stroke(); g.setLineDash([]); if (l.label) { g.fillStyle = col(l.color || 'muted'); g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(l.label, ml + pw - 4, Y(l.y) - 3); } });
    (cfg.vlines || []).forEach(l => { g.strokeStyle = col(l.color || 'muted'); g.lineWidth = 1.2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(X(l.x), mt); g.lineTo(X(l.x), mt + ph); g.stroke(); g.setLineDash([]); if (l.label) { g.fillStyle = col(l.color || 'muted'); g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(l.label, X(l.x) + 4, mt + 4); } });
    (cfg.marks || []).forEach(m => { if (m.frac != null && frac < m.frac) return; g.fillStyle = col(m.color || 'straw'); g.beginPath(); g.arc(X(m.x), Y(m.y), 4.5, 0, 7); g.fill(); if (m.text) { g.textAlign = m.align || 'left'; g.textBaseline = 'bottom'; g.fillText(m.text, X(m.x) + (m.align === 'right' ? -7 : 7), Y(m.y) - 5); } });
    if (head) { g.fillStyle = head[2]; g.beginPath(); g.arc(head[0], head[1], 5.5, 0, 7); g.fill(); g.strokeStyle = pal.bg; g.lineWidth = 2; g.stroke(); }
    g.restore();
    // legend
    if (named.length) { let x = ml; g.textAlign = 'left'; g.textBaseline = 'middle'; named.forEach((s) => { const si = series.indexOf(s); const c = col(s.color || 's' + ((si % 6) + 1)); g.fillStyle = c; g.strokeStyle = c; g.lineWidth = 2; if (s.type === 'scatter') { g.beginPath(); g.arc(x + 7, 14, 4, 0, 7); g.fill(); } else { g.setLineDash(s.dash ? [5, 3] : []); g.beginPath(); g.moveTo(x, 14); g.lineTo(x + 16, 14); g.stroke(); g.setLineDash([]); } g.fillStyle = pal.ink; g.fillText(s.name, x + 21, 14); x += 30 + g.measureText(s.name).width; if (x > W - 80) x = ml; }); }
    if (cfg.title) { g.fillStyle = pal.muted; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(cfg.title, W - mr, named.length ? 14 : 8); }
    return { X, Y, ml, mt, pw, ph };
  };
  LAB.plotImage = function (cfg, w, hgt) { const c = document.createElement('canvas'); LAB.plot(c, cfg, { pal: PAPER, w: w || 900, h: hgt || 480, dpr: 2, fs: 12 }); return c.toDataURL('image/png'); };

  /* ------------------------------------------------------------------ simulation cache */
  const simCache = {};
  function getSim(e, S) {
    if (!S.ran || S.seed == null) return null;
    const key = e.id + '|' + JSON.stringify(S.params) + '|' + S.seed;
    if (!simCache[key]) { try { simCache[key] = e.simulate(paramsOf(e, S), U.rng(S.seed)); } catch (err) { console.error(err); return null; } }
    return simCache[key];
  }
  LAB.getSim = getSim;
  function paramsOf(e, S) { const p = {}; (e.params || []).forEach(d => { let v = S.params && S.params[d.id] != null ? S.params[d.id] : d.def; if (d.type !== 'select' || /^-?\d+(\.\d+)?$/.test(String(v))) v = +v; p[d.id] = v; }); return p; }
  LAB.paramsOf = paramsOf;

  /* ------------------------------------------------------------------ app shell */
  const app = () => $('#app');
  let current = null; // {e, stage}
  let anim = null;
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim = null; } if (LAB.ext && LAB.ext.stopAudio) LAB.ext.stopAudio(); }

  function route() {
    stopAnim();
    const hash = location.hash.replace('#', '');
    const [id, stage] = hash.split('-s-');
    if (id && LAB.exps[id]) openExp(LAB.exps[id], stage); else if (id === 'about' && LAB.ext && LAB.ext.about) { current = null; LAB.ext.about(app()); } else if (id === 'databook' && LAB.ext && LAB.ext.databook) { current = null; LAB.ext.databook(app()); } else if (id === 'handbook' && LAB.ext && LAB.ext.handbook) { current = null; LAB.ext.handbook(app(), stage); } else if (id === 'lab') { location.replace('#' + LAB.list[0].id); return; } else if (id === 'faculty' && LAB.ext && LAB.ext.faculty) { current = null; LAB.ext.faculty(app()); } else if (id && id.startsWith('verify-') && LAB.ext && LAB.ext.verify) { current = null; LAB.ext.verify(app(), decodeURIComponent(id.slice(7))); } else home();
    if (LAB.ext && LAB.ext.markRail) LAB.ext.markRail(id && LAB.exps[id] ? id : (['about', 'databook', 'handbook'].includes(id) ? id : 'home'));
    window.scrollTo(0, 0);
  }
  LAB.go = (id, stage) => { location.hash = id + (stage ? '-s-' + stage : ''); };

  function stageDone(e, S, k) {
    switch (k) {
      case 'pre': return S.pre && S.pre.score != null;
      case 'theory': return !!S.theorySeen;
      case 'operate': return !!S.ran;
      case 'experiment': { const sim = getSim(e, S); if (!sim) return false; const c = e.calcs(sim, paramsOf(e, S)); return c.every(x => S.calc && S.calc[x.key] != null && S.calc[x.key] !== ''); }
      case 'validation': return !!(S.valid && S.valid.done);
      case 'num': return !!(S.num && S.num.solved > 0);
      case 'post': return S.post && S.post.score != null;
      case 'report': return !!S.reportSeen;
    }
  }
  function progress(e) { const S = st(e.id); return STAGES.map(s => stageDone(e, S, s[0])); }

  /* ------------------------------------------------------------------ home */
  function home() {
    current = null; document.title = 'Heat Transfer Virtual Lab';
    const done = LAB.list.reduce((a, e) => a + progress(e).filter(Boolean).length, 0);
    const N = LAB.list.length, nNum = LAB.list.reduce((a, e) => a + ((LAB.NUM && LAB.NUM[e.id]) || []).length, 0);
    const el = app(); el.innerHTML = '';
    const hero = h('section', { class: 'wrap hero' }, `
      <div>
        <p class="eyebrow">Department of Mechanical Engineering · Virtual Laboratory</p>
        <h1 style="margin-top:10px">Heat Transfer<br><em>Laboratory</em></h1>
        <p class="lede">${N} experiments in conduction, fins, convection, radiation, boiling and condensation, heat exchangers and thermal systems. Every rig is a live thermal model: you watch thermocouples settle, decide when the system is at steady state, take readings and close the energy balance, the way the real bench works.</p>
        <p class="credit">Developed by <b>Dr. Vignesh Nayak Ullal</b>, Department of Mechanical Engineering, MITE Moodbidri</p>
        <div class="controls" style="margin-top:16px"><a class="btn" href="#lab">Start with Exp. 01 →</a><a class="btn quiet" href="#handbook">Heat Transfer Handbook</a><a class="btn quiet" href="#databook">Data book</a><a class="btn quiet" href="#about">About &amp; validation</a></div>
        <div class="hero-stats"><div><b class="num">${N}</b><span>experiments</span></div><div><b class="num">${LAB.CATS.length}</b><span>topic groups</span></div><div><b class="num">${STAGES.length}</b><span>stages each</span></div><div><b class="num">${done}</b><span>of ${N * STAGES.length} stages done on this device</span></div></div>
      </div>
      <div class="hero-fig"><canvas id="heroChart" aria-label="Animated temperature distributions along pin fins of copper, aluminium, brass and stainless steel"></canvas>
        <div class="cap"><span>Temperature along a pin fin · Exp. 07</span><span>Cu · Al · Brass · SS 304</span></div></div>`);
    el.appendChild(hero);
    el.appendChild(h('section', { class: 'wrap' }, `<div class="feats">${[['Live thermal field', 'Each rig shows its temperature field in false colour, with thermocouples that drift, lag and settle like real ones.'], ['You judge steady state', 'Readings are logged over time; you decide when the drift is small enough, and the report shows whether you waited.'], ['Energy balance check', 'Heat in, heat stored and heat out are compared in every validation, so a wrong reading shows up as a missing watt.'], ['Data book built in', 'Air, water, steam and refrigerant properties at any temperature, plus conductivity and emissivity tables, inside the lab.'], ['Narrated explainers', 'Animated, voiced walk-throughs with concept checks, and a Listen button that reads the theory aloud.'], ['Safety and set-up', 'A briefing to acknowledge, then set the rig up yourself; out-of-order actions trip an interlock.'], ['Honest about validity', 'Each rig is labelled Validated, Partly validated or Teaching model, with the sources it was checked against.'], ['Numericals', `${nNum} randomised problem types with graded hints and worked solutions.`], ['Report to faculty', 'Watermarked report with uncertainty analysis to print, download or submit, and a certificate on approval.']].map(f => `<div><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div>`));
    el.appendChild(h('section', { class: 'wrap' }, `<div class="flow">${STAGES.map((s, i) => `<div><i>STAGE ${i + 1}</i><b>${s[1]}</b><span>${s[2]}</span></div>`).join('')}</div>`));
    const list = h('section', { class: 'wrap' });
    list.innerHTML = `<div class="toolbar"><input type="text" id="q" placeholder="Search experiments, correlations or standards" aria-label="Search experiments"><span class="muted" id="qn" style="font-size:.85rem"></span></div><div id="cats"></div>`;
    el.appendChild(list);
    el.appendChild(h('footer', { class: 'wrap foot' }, `Simulations solve the governing heat-transfer equations (Fourier conduction, fin equation, Churchill–Chu, Gnielinski, Hilpert, Stefan–Boltzmann, Rohsenow, Zuber, Nusselt film condensation, ε–NTU and others) with property data at the film temperature. Thermocouple tolerance, time lag and drift are added to every run, so no two runs give identical numbers. Progress is saved in this browser only.`));
    const draw = () => {
      const q = ($('#q').value || '').toLowerCase(); let n = 0;
      $('#cats').innerHTML = LAB.CATS.map(([k, name, sub]) => {
        const es = LAB.list.filter(e => e.cat === k && (!q || (e.title + ' ' + e.std + ' ' + (e.tags || '') + ' ' + e.short).toLowerCase().includes(q)));
        n += es.length; if (!es.length) return '';
        return `<div class="cat"><div class="cat-head"><span class="eyebrow">${name}</span><span class="muted" style="font-size:.85rem">${sub}</span></div><div class="cards">${es.map(e => { const pr = progress(e); return `<a class="card" href="#${e.id}"><div class="no"><span>EXP ${String(e.no).padStart(2, '0')}</span><span>${e.std.split('/')[0].trim()}</span></div><h3>${e.title}</h3><p>${e.short}</p><span class="chips">${e.advanced ? '<span class="badge opt">Advanced</span>' : ''}${LAB.ext && LAB.ext.chip ? LAB.ext.chip(e.id) : ''}</span><div class="pips" title="${pr.filter(Boolean).length} of ${STAGES.length} stages done">${pr.map(d => `<i class="${d ? 'on' : ''}"></i>`).join('')}</div></a>`; }).join('')}</div></div>`;
      }).join('') || '<p class="muted">No experiment matches that search.</p>';
      $('#qn').textContent = q ? n + ' found' : '';
    };
    $('#q').addEventListener('input', draw); draw();
    heroAnim();
  }
  function heroAnim() {
    const c = $('#heroChart'); if (!c) return;
    // pin fin, D 12 mm, L 150 mm, h 12 W/m²K, base 110 °C, air 28 °C, insulated-tip-corrected length
    const D = 0.012, L = 0.15, hh = 12, Tb = 110, Ta = 28;
    const mk = k => { const m = Math.sqrt(4 * hh / (k * D)), Lc = L + D / 4, x = [], y = []; for (let i = 0; i <= 60; i++) { const xi = L * i / 60; x.push(xi * 1000); y.push(Ta + (Tb - Ta) * Math.cosh(m * (Lc - xi)) / Math.cosh(m * Lc)); } return { x, y }; };
    const cfg = { xlabel: 'Distance from fin base x (mm)', ylabel: 'Fin temperature (°C)', series: [{ name: 'Copper', ...mk(386), color: 's5' }, { name: 'Aluminium', ...mk(204), color: 's2' }, { name: 'Brass', ...mk(110), color: 's4' }, { name: 'SS 304', ...mk(15), color: 's1' }], ymin: 20, ymax: 115, xmax: 150, hlines: [{ y: Ta, label: 'air 28 °C', color: 'muted' }], parallel: true };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { LAB.plot(c, cfg); return; }
    let t0 = null; const loop = (t) => { if (!document.body.contains(c)) return; if (t0 == null) t0 = t; const f = Math.min(1, (t - t0) / 3200); LAB.plot(c, { ...cfg, frac: U.ease(f) }); if (f < 1) requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ experiment shell */
  function openExp(e, stage) {
    const S = st(e.id); S.params = S.params || {};
    const k = STAGES.some(s => s[0] === stage) ? stage : (S.tab || 'pre');
    S.tab = k; save(e.id); current = { e, stage: k };
    document.title = `Exp ${e.no} · ${e.title} — Heat Transfer Lab`;
    const catName = (LAB.CATS.find(c => c[0] === e.cat) || [])[1];
    const el = app(); el.innerHTML = '';
    const head = h('section', { class: 'wrap exp-head' }, `
      <div><div class="crumb"><a href="#">All experiments</a> / ${catName}</div>
        <p class="eyebrow">Experiment ${String(e.no).padStart(2, '0')}</p><h1>${e.title}</h1>
        <p class="aim"><b>Aim:</b> ${e.aim}</p>
        <div class="chips"><span class="badge">${e.std}</span>${e.advanced ? '<span class="badge opt">Advanced</span>' : ''}</div></div>
      <div class="no-print" style="display:flex;gap:8px">${navBtns(e)}</div>`);
    el.appendChild(head);
    const nav = h('div', { class: 'wrap' }); const bar = h('nav', { class: 'stages', role: 'tablist', 'aria-label': 'Experiment stages' }); nav.appendChild(bar); el.appendChild(nav);
    const body = h('section', { class: 'wrap stage', id: 'stage' }); el.appendChild(body);
    const foot = h('div', { class: 'wrap stage-foot' }); el.appendChild(foot);
    drawBar(e, bar); renderStage(e, k, body); drawFoot(e, k, foot);
  }
  function navBtns(e) { const i = LAB.list.indexOf(e); const p = LAB.list[i - 1], n = LAB.list[i + 1]; return (p ? `<a class="btn quiet small" href="#${p.id}" title="${p.title}">← Exp ${p.no}</a>` : '') + (n ? `<a class="btn quiet small" href="#${n.id}" title="${n.title}">Exp ${n.no} →</a>` : ''); }
  function locked(e, S, k) { if (['experiment', 'validation', 'report'].includes(k)) return !S.ran; if (k === 'post') return !(S.valid && S.valid.done); return false; }
  function drawBar(e, bar) {
    const S = st(e.id); bar.innerHTML = STAGES.map((s, i) => `<button class="stage-btn ${stageDone(e, S, s[0]) ? 'done' : ''} ${locked(e, S, s[0]) ? 'locked' : ''}" role="tab" aria-selected="${current && current.stage === s[0]}" data-k="${s[0]}"><span class="k"><i class="dot"></i>${String(i + 1).padStart(2, '0')}</span><span class="t">${s[1]}</span></button>`).join('');
    bar.querySelectorAll('button').forEach(b => b.onclick = () => switchStage(e, b.dataset.k));
  }
  function switchStage(e, k) { stopAnim(); const S = st(e.id); S.tab = k; save(e.id); current.stage = k; history.replaceState(null, '', '#' + e.id + '-s-' + k); const body = $('#stage'); renderStage(e, k, body); drawBar(e, $('.stages')); drawFoot(e, k, $('.stage-foot')); const top = $('.stages').getBoundingClientRect().top + window.scrollY - 70; if (window.scrollY > top) window.scrollTo(0, top); }
  LAB.switchStage = (k) => current && switchStage(current.e, k);
  function refreshBar() { if (current) drawBar(current.e, $('.stages')); }
  function drawFoot(e, k, foot) {
    const i = STAGES.findIndex(s => s[0] === k); const p = STAGES[i - 1], n = STAGES[i + 1];
    foot.innerHTML = `<div>${p ? `<button class="btn quiet" data-k="${p[0]}">← ${p[1]}</button>` : `<a class="btn quiet" href="#">← All experiments</a>`}</div><div>${n ? `<button class="btn" data-k="${n[0]}">Next: ${n[1]} →</button>` : (navNext(e))}</div>`;
    foot.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => switchStage(e, b.dataset.k));
  }
  function navNext(e) { const n = LAB.list[LAB.list.indexOf(e) + 1]; return n ? `<a class="btn" href="#${n.id}">Next experiment: ${n.title} →</a>` : `<a class="btn" href="#">Back to all experiments</a>`; }

  function renderStage(e, k, body) {
    const S = st(e.id); body.innerHTML = '';
    if (locked(e, S, k)) {
      const why = k === 'post' ? ['Complete validation first', 'The post-test opens after you have checked your calculated results in the Validation stage.', 'validation', 'Go to Validation'] : ['Run the test first', 'This stage uses the data from your own run. Set up the apparatus in the Operate stage and run the test.', 'operate', 'Go to Operate'];
      body.innerHTML = `<div class="panel lockmsg"><h3>${why[0]}</h3><p>${why[1]}</p><p style="margin-top:14px"><button class="btn" id="golock">${why[3]}</button></p></div>`;
      $('#golock').onclick = () => switchStage(e, why[2]); return;
    }
    ({ pre: stPre, theory: stTheory, operate: stOperate, experiment: stExperiment, validation: stValidation, num: (e, b, S) => LAB.ext.numericals(e, b, S, { save: () => save(e.id), refreshBar }), post: stPost, report: stReport })[k](e, body, S);
  }

  /* ------------------------------------------------------------------ quiz */
  function quiz(e, body, S, which) {
    const qs = e[which]; const rec = S[which] || {}; const answers = rec.ans || [];
    const submitted = rec.score != null;
    const intro = which === 'pre' ? `<p class="muted" style="max-width:70ch">Five questions on what you should know before you walk up to the machine. Your first score is kept for the report, so attempt it honestly before reading the theory.</p>` :
      `<p class="muted" style="max-width:70ch">Five questions that check what you learned from running the test and interpreting your data. Compared with your pre-test score in the report.</p>`;
    body.innerHTML = `<div class="stack">${intro}<div id="qscore"></div><div class="quiz">${qs.map((q, i) => `<div class="q" data-i="${i}"><div class="qt"><span>Q${i + 1}</span><div>${q.q}</div></div><div class="opts">${q.o.map((o, j) => `<label class="opt ${submitted ? (j === q.a ? 'right' : (answers[i] === j ? 'wrong' : '')) : ''}"><input type="radio" name="q${i}" value="${j}" ${answers[i] === j ? 'checked' : ''} ${submitted ? 'disabled' : ''}><span>${o}</span></label>`).join('')}</div>${submitted ? `<div class="why"><b>${answers[i] === q.a ? 'Correct.' : 'Answer: ' + q.o[q.a] + '.'}</b> ${q.why || ''}</div>` : ''}</div>`).join('')}</div><div class="controls">${submitted ? `<button class="btn quiet" id="retake">Retake</button>` : `<button class="btn" id="submitq">Submit answers</button><span class="muted" id="qmsg" style="font-size:.85rem"></span>`}</div></div>`;
    if (submitted) {
      const other = which === 'post' && S.pre && S.pre.score != null ? `<div><span class="eyebrow">Pre-test</span><br><b class="num">${S.pre.score}%</b></div><div><span class="eyebrow">Normalised gain</span><br><b class="num">${gain(S)}</b></div>` : '';
      $('#qscore').innerHTML = `<div class="score"><div><span class="eyebrow">${which === 'pre' ? 'Pre-test' : 'Post-test'} score</span><br><b class="num">${rec.score}%</b></div><div><span class="eyebrow">First attempt</span><br><b class="num">${rec.first}%</b></div>${other}<div class="muted" style="font-size:.85rem;max-width:40ch">${rec.score >= 80 ? 'Well prepared.' : rec.score >= 60 ? 'Adequate. Review the explanations below.' : 'Review the explanations and the Theory stage before moving on.'}</div></div>`;
      $('#retake').onclick = () => { S[which] = { first: rec.first, attempts: rec.attempts }; save(e.id); quiz(e, body, S, which); refreshBar(); };
    } else {
      body.querySelectorAll('input[type=radio]').forEach(r => r.onchange = () => { const i = +r.name.slice(1); answers[i] = +r.value; S[which] = Object.assign(rec, { ans: answers }); save(e.id); });
      $('#submitq').onclick = () => {
        if (qs.some((q, i) => answers[i] == null)) { $('#qmsg').textContent = 'Answer all ' + qs.length + ' questions to submit.'; return; }
        const sc = Math.round(qs.filter((q, i) => answers[i] === q.a).length / qs.length * 100);
        S[which] = { ans: answers, score: sc, first: rec.first != null ? rec.first : sc, attempts: (rec.attempts || 0) + 1 }; save(e.id); quiz(e, body, S, which); refreshBar();
      };
    }
  }
  function gain(S) { if (!S.pre || !S.post || S.pre.first == null || S.post.first == null) return '—'; const pre = S.pre.first, post = S.post.first; if (pre >= 100) return post >= 100 ? '1.00' : '—'; return U.f((post - pre) / (100 - pre), 2); }
  function stPre(e, body, S) { quiz(e, body, S, 'pre'); }
  function stPost(e, body, S) { quiz(e, body, S, 'post'); }

  /* ------------------------------------------------------------------ theory */
  function stTheory(e, body, S) {
    S.theorySeen = true; save(e.id); refreshBar();
    body.innerHTML = `<div class="theory-grid"><article class="prose"><div id="xslot"></div><div class="theory-body">${e.theory}</div><div id="libslot"></div>
      ${nomenclature(e).length ? `<h3>Nomenclature</h3>${nomHTML(e)}` : ''}
      <h3>Standard procedure</h3><ol>${e.procedure.map(p => `<li>${p}</li>`).join('')}</ol>
      <h3>Precautions and safety</h3><ul>${e.precautions.map(p => `<li>${p}</li>`).join('')}</ul>
      <h3>Engineering applications</h3><ul>${e.applications.map(p => `<li>${p}</li>`).join('')}</ul></article>
      <aside class="theory-side"><div class="panel"><div class="panel-h"><h4>Key formulae</h4></div><div class="formula-list">${e.formulas.map(f => `<div><b>${f[0]}</b><code>${f[1]}</code></div>`).join('')}</div></div>
      <div class="panel"><div class="panel-h"><h4>Apparatus</h4></div><ul style="margin:0;padding-left:18px;font-size:.88rem">${e.apparatus.map(a => `<li>${a}</li>`).join('')}</ul></div>
      <div class="panel"><div class="panel-h"><h4>Standards</h4></div><p style="font-size:.88rem">${e.std}</p>${e.stdNote ? `<p class="muted" style="font-size:.82rem;margin-top:6px">${e.stdNote}</p>` : ''}</div><div id="valslot"></div></aside></div>`;
    if (LAB.ext && LAB.ext.theory) LAB.ext.theory(e, body, S);
  }

  /* ------------------------------------------------------------------ operate */
  function paramInput(d, v) {
    if (d.type === 'select') return `<div class="field"><label for="p_${d.id}">${d.label}</label><select id="p_${d.id}" data-p="${d.id}">${d.options.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${val}" ${String(val) === String(v) ? 'selected' : ''}>${lab}</option>`; }).join('')}</select>${d.hint ? `<span class="hint">${d.hint}</span>` : ''}</div>`;
    if (d.type === 'range') return `<div class="field"><label for="p_${d.id}">${d.label}: <b class="mono" id="pv_${d.id}">${v}</b> ${d.unit || ''}</label><input type="range" id="p_${d.id}" data-p="${d.id}" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${v}">${d.hint ? `<span class="hint">${d.hint}</span>` : ''}</div>`;
    return `<div class="field"><label for="p_${d.id}">${d.label}</label><div class="unit-in"><input type="number" id="p_${d.id}" data-p="${d.id}" min="${d.min}" max="${d.max}" step="${d.step || 'any'}" value="${v}"><span class="u">${d.unit || ''}</span></div>${d.hint ? `<span class="hint">${d.hint}</span>` : ''}</div>`;
  }
  function safetyHTML(e) {
    const Z = LAB.SAFETY && LAB.SAFETY[e.id]; if (!Z) return '';
    const col = (t, arr, cls) => `<div class="sbox ${cls}"><h4>${t}</h4><ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    return `<div class="sgrid">${col('Hazards', Z.haz, 'haz')}${col('Personal protective equipment', Z.ppe, 'ppe')}${col('Safe practice', Z.rules, 'rules')}${col('In an emergency', Z.emerg, 'emerg')}</div>`;
  }
  LAB.safetyHTML = safetyHTML;
  function stOperate(e, body, S) {
    if (LAB.SAFETY && LAB.SAFETY[e.id] && !S.safetyAck) {
      body.innerHTML = `<div class="panel stack sgate"><div><p class="eyebrow" style="color:var(--bad)">Safety briefing · read before operating</p><h2 style="margin-top:6px">${e.title}: hazards and safe practice</h2><p class="muted" style="margin-top:6px;max-width:75ch">In the real laboratory you would receive this briefing from the instructor before touching the machine. Read it, then acknowledge it to unlock the machine. The time of acknowledgement is recorded in your report.</p></div>${safetyHTML(e)}
        <label class="ack"><input type="checkbox" id="sack"> I have read the hazards, will wear the listed protective equipment, and will follow the safe practice and emergency procedure.</label>
        <div class="controls"><button class="btn" id="sgo" disabled>Acknowledge and open the machine</button></div></div>`;
      $('#sack').onchange = ev => { $('#sgo').disabled = !ev.target.checked; };
      $('#sgo').onclick = () => { S.safetyAck = new Date().toISOString(); save(e.id); refreshBar(); stOperate(e, body, S); };
      return;
    }
    const p = paramsOf(e, S);
    const steps = suSteps(e);
    let mode = steps.length ? Store.get('suMode', 'diy') : 'demo';
    body.innerHTML = `<div class="op-grid">
      <div class="op-side"><div class="panel"><div class="panel-h"><h4>Apparatus settings</h4></div><div class="params" id="params">${(e.params || []).map(d => paramInput(d, p[d.id])).join('')}</div><p class="muted" id="pchg" style="font-size:.78rem;margin-top:10px"></p></div>
        ${steps.length ? `<div class="panel" id="supanel"><div class="panel-h"><h4>Rig set-up</h4><span class="eyebrow" id="sustat"></span></div>
          <div class="seg" role="radiogroup" aria-label="Set-up mode"><button type="button" role="radio" data-m="diy">Do it yourself</button><button type="button" role="radio" data-m="demo">Watch demo</button></div>
          <div id="sudiy"></div></div>` : ''}
        <div class="panel"><div class="panel-h"><h4>Procedure</h4><span class="eyebrow" id="stepk"></span></div><ol class="steps" id="opsteps">${e.opSteps.map(s => `<li>${s}</li>`).join('')}</ol></div>
        <button class="btn quiet small" id="reSafety" type="button">Safety briefing</button></div>
      <div class="stack" style="min-width:0">
        <div class="rig" id="rig">${e.svg(p)}</div>
        <div class="su-cap" id="sucap" hidden></div>
        <div class="alarm" id="alarm" role="alert" hidden></div>
        <div class="readouts" id="readouts"></div>
        <div class="controls"><button class="btn" id="run">Run test</button><button class="btn quiet" id="pause" disabled>Pause</button><button class="btn quiet" id="reset">Reset</button><button class="btn quiet" id="suskip" hidden>Skip set-up</button>
          <label class="muted" style="font-size:.82rem;display:flex;gap:6px;align-items:center">Speed <select id="spd" style="width:auto;padding:4px 8px"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
          <div class="progress"><i id="prog"></i></div></div>
        <div id="ophint"></div>
        <div class="panel liveview" id="lvwrap" hidden><div class="panel-h"><h4 id="lvtitle">Live view</h4><span class="eyebrow" id="lvsub"></span></div><div id="liveview"></div></div>
        <div class="panel chart-box" id="chartwrap" hidden><div class="panel-h"><h4 id="charttitle">Live data</h4><span class="eyebrow">recorded by data acquisition</span></div><canvas id="chart"></canvas></div>
        <div id="after"></div>
      </div></div>`;
    const rigSvg = () => $('#rig svg');
    let sim = getSim(e, S);
    let pend = null;          // specimen prepared during a do-it-yourself set-up: {seed, sim}
    let su = { done: 0, wrong: 0, order: [] };
    const testOp0 = steps.length ? Math.min(e.opSteps.length - 1, Math.max(...steps.map(s => s.op)) + 1) : 0;
    const markStep = (cur, label) => { const li = body.querySelectorAll('#opsteps li'); const n = li.length; li.forEach((x, i) => { x.className = i < cur ? 'past' : (i === cur ? 'cur' : ''); }); $('#stepk').textContent = label != null ? label : (cur >= n ? 'complete' : `step ${cur + 1}/${n}`); };
    const setStep = (f) => { const n = e.opSteps.length; if (f >= 1) return markStep(n); if (f <= 0 && !anim) return markStep(0, ''); const a = steps.length ? testOp0 : 0; const span = Math.max(1, n - a); markStep(Math.min(n - 1, a + Math.floor(f * span))); };
    const ttlOf = (st, sm) => { if (typeof st.title !== 'function') return st.title; try { return st.title(sm, p); } catch (err) { return 'Set-up step'; } };
    const suFrame = (k, u, sm) => {
      let svg = rigSvg();
      if (!svg || !svg._su) { $('#rig').innerHTML = e.svg(p); svg = rigSvg(); try { if (e.anim) e.anim(svg, 0, null, p); } catch (err) { } svg._su = steps.map(() => { const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'su-layer'); svg.appendChild(g); return g; }); }
      for (let i = 0; i <= k; i++) { const ctx = suCtx(svg, i === k && u < 1, sm, p); try { steps[i].draw(svg._su[i], i === k ? u : 1, ctx); } catch (err) { console.error(err); } }
      const st = steps[k]; const cap = $('#sucap'); cap.hidden = false; const ttl = ttlOf(st, sm); cap.innerHTML = `<span class="eyebrow">Set-up ${k + 1}/${steps.length}</span><b>${ttl}</b><span>${typeof st.note === 'function' ? st.note(sm, p) : (st.note || '')}</span>`;
      $('#readouts').innerHTML = [['Set-up', `${k + 1} / ${steps.length}`, ''], ['Step', ttl, '']].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b><i>${r[2] || ''}</i></div>`).join('');
      markStep(st.op, `set-up ${k + 1}/${steps.length}`);
    };
    const alarm = (msg) => { const a = $('#alarm'); a.hidden = !msg; a.innerHTML = msg ? `<b>Interlock.</b> ${msg}` : ''; };
    const newPend = () => { const seed = Math.floor(Math.random() * 2 ** 31); let sm = null; try { sm = e.simulate(p, U.rng(seed)); } catch (err) { console.error(err); } return sm && !sm.error ? { seed, sim: sm } : null; };
    const drawMode = () => {
      if (!steps.length) return;
      body.querySelectorAll('.seg [data-m]').forEach(b => b.setAttribute('aria-checked', b.dataset.m === mode));
      const box = $('#sudiy');
      if (mode === 'demo') { box.innerHTML = `<p class="muted" style="font-size:.82rem;margin-top:8px">Run test plays every set-up step on the machine, then the test. Use Skip set-up to go straight to the test.</p>`; $('#sustat').textContent = ''; $('#run').disabled = !!anim; return; }
      const left = steps.length - su.done;
      $('#sustat').textContent = left ? `${su.done}/${steps.length} done` : 'ready';
      if (!pend) pend = newPend();
      if (!su.order.length) { const r = U.rng(Math.floor(Math.random() * 1e9)); su.order = steps.map((_, i) => i).sort(() => r() - .5); }
      box.innerHTML = `<p class="muted" style="font-size:.82rem;margin:8px 0">${left ? 'Set up the apparatus yourself. Choose the actions in the right order; the rig will not start until all are done.' : 'Rig ready. Press <b>Run test</b>.'}</p>
        <div class="acts">${su.order.map(i => `<button type="button" class="act ${i < su.done ? 'ok' : ''}" data-i="${i}" ${i < su.done || anim ? 'disabled' : ''}>${i < su.done ? '✓ ' : ''}${ttlOf(steps[i], pend && pend.sim)}</button>`).join('')}</div>
        ${su.wrong ? `<p class="muted" style="font-size:.78rem;margin-top:6px">Interlock alarms so far: ${su.wrong}</p>` : ''}`;
      $('#run').disabled = !!anim || left > 0;
      box.querySelectorAll('.act[data-i]').forEach(b => b.onclick = () => doAct(+b.dataset.i));
    };
    let suAnim = 0;
    const doAct = (i) => {
      if (anim || suAnim) return;
      if (!pend) { pend = newPend(); if (!pend) { alarm('The simulator could not prepare a run with these settings.'); return; } }
      if (sim) { sim = null; $('#chartwrap').hidden = true; $('#lvwrap').hidden = true; $('#after').innerHTML = ''; $('#rig').innerHTML = e.svg(p); }
      if (i !== su.done) {
        su.wrong++; const nx = steps[su.done];
        alarm(`“${ttlOf(steps[i], pend.sim)}” cannot be done yet. ${nx.why ? nx.why + ' ' : ''}Next: <b>${ttlOf(nx, pend.sim)}</b>.`);
        drawMode(); return;
      }
      alarm('');
      const k = su.done, dur = (steps[k].d || 2.6) * 700; let t0 = null;
      const step = (ts) => { if (t0 == null) t0 = ts; const u = Math.min(1, (ts - t0) * (+$('#spd').value || 1) / dur); suFrame(k, u, pend.sim); if (u < 1) suAnim = requestAnimationFrame(step); else { suAnim = 0; su.done++; drawMode(); if (su.done === steps.length) { $('#readouts').innerHTML = [['Set-up', 'complete', ''], ['Status', 'READY TO RUN', '']].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b><i>${r[2]}</i></div>`).join(''); markStep(testOp0, 'ready'); } } };
      $('#run').disabled = true; body.querySelectorAll('.act').forEach(b => b.disabled = true);
      suAnim = requestAnimationFrame(step);
    };
    const resetSu = () => { if (suAnim) cancelAnimationFrame(suAnim); suAnim = 0; su = { done: 0, wrong: 0, order: [] }; pend = null; alarm(''); };
    body.querySelectorAll('.seg [data-m]').forEach(b => b.onclick = () => { if (anim) return; mode = b.dataset.m; Store.set('suMode', mode); resetSu(); if (!sim) { $('#rig').innerHTML = e.svg(p); draw0(); } drawMode(); });
    $('#reSafety').onclick = () => { const d = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Safety briefing' }, `<div class="modal-in"><div class="panel-h"><h3>Safety briefing: ${e.title}</h3><button class="btn quiet small" id="mclose">Close</button></div>${safetyHTML(e)}<p class="muted" style="font-size:.8rem;margin-top:8px">Acknowledged ${S.safetyAck ? new Date(S.safetyAck).toLocaleString() : ''}</p></div>`); document.body.appendChild(d); const close = () => d.remove(); $('#mclose', d).onclick = close; d.onclick = ev => { if (ev.target === d) close(); }; $('#mclose', d).focus(); };
    const draw = (f) => {
      if (!sim) return;
      if (e.anim) try { e.anim(rigSvg(), f, sim, p); } catch (err) { console.error(err); }
      if (sim.readout) $('#readouts').innerHTML = sim.readout(f).map(r => `<div><span>${r[0]}</span><b>${r[1]}</b><i>${r[2] || ''}</i></div>`).join('');
      if (sim.plot) { $('#chartwrap').hidden = false; if (sim.plot.title) $('#charttitle').textContent = sim.plot.title; LAB.plot($('#chart'), Object.assign({}, sim.plot, { frac: sim.plot.reveal === 'all' ? 1 : (sim.plotFrac ? sim.plotFrac(f) : f), title: null })); }
      if (e.liveView) { $('#lvwrap').hidden = false; e.liveView($('#liveview'), f, sim, p, { title: t => $('#lvtitle').textContent = t, sub: t => $('#lvsub').textContent = t }); }
      $('#prog').style.width = (f * 100) + '%'; setStep(f);
    };
    const finish = () => {
      $('#run').disabled = false; $('#run').textContent = 'Run again'; $('#pause').disabled = true;
      $('#after').innerHTML = `<div class="note info" style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><span>Test complete. Your observations have been recorded. ${mode === 'diy' && steps.length ? 'To run again, set up the apparatus again.' : 'Run again for a fresh run with new scatter.'}</span><button class="btn small" id="toexp">Go to Experiment →</button></div>`;
      $('#toexp').onclick = () => switchStage(e, 'experiment');
      if (e.afterRun) e.afterRun($('#after'), sim, p, { redraw: draw, svg: rigSvg() });
      resetSu(); drawMode();
    };
    function draw0() { $('#sucap').hidden = true; $('#suskip').hidden = true; if (e.anim) try { e.anim(rigSvg(), 0, null, p); } catch (err) { } $('#readouts').innerHTML = (e.idleReadout ? e.idleReadout(p) : [['Status', 'READY', '']]).map(r => `<div><span>${r[0]}</span><b>${r[1]}</b><i>${r[2] || ''}</i></div>`).join(''); setStep(0); if (e.opHint) $('#ophint').innerHTML = `<div class="note">${e.opHint}</div>`; }
    if (sim) { draw(1); finish(); } else { draw0(); drawMode(); }
    // param changes
    body.querySelectorAll('[data-p]').forEach(inp => {
      const upd = () => {
        const d = e.params.find(x => x.id === inp.dataset.p); let v = inp.value; if (d.type !== 'select') { v = +v; if (d.min != null) v = Math.max(d.min, v); if (d.max != null) v = Math.min(d.max, v); }
        S.params[d.id] = v; if (d.type === 'range') $('#pv_' + d.id).textContent = v;
        if (S.ran) { S.ran = false; S.valid = null; $('#pchg').textContent = 'Settings changed. The previous run was cleared; run the test again.'; }
        save(e.id); stopAnim(); sim = null; const np = paramsOf(e, S); Object.assign(p, np); resetSu();
        $('#rig').innerHTML = e.svg(np); $('#chartwrap').hidden = true; $('#lvwrap').hidden = true; $('#after').innerHTML = ''; $('#run').textContent = 'Run test'; $('#prog').style.width = '0';
        draw0(); drawMode(); refreshBar();
      };
      inp.addEventListener(inp.type === 'range' ? 'input' : 'change', upd);
    });
    $('#run').onclick = () => {
      if (mode === 'diy' && steps.length && su.done < steps.length) { alarm(`Rig not ready. Complete the set-up first: next is <b>${ttlOf(steps[su.done], pend && pend.sim)}</b>.`); return; }
      stopAnim(); alarm('');
      const diy = mode === 'diy' && steps.length && pend;
      if (diy) { S.seed = pend.seed; sim = pend.sim; } else { S.seed = Math.floor(Math.random() * 2 ** 31); try { sim = e.simulate(p, U.rng(S.seed)); } catch (err) { console.error(err); $('#ophint').innerHTML = `<div class="note bad">The simulation could not run with these settings: ${U.esc(err.message)}</div>`; return; } }
      S.ran = false; S.valid = null; save(e.id);
      if (sim.error) { $('#ophint').innerHTML = `<div class="note bad">${sim.error}</div>`; sim = null; return; }
      $('#ophint').innerHTML = sim.warn ? `<div class="note">${sim.warn}</div>` : '';
      S.setupLog = diy ? { mode: 'performed', alarms: su.wrong, at: new Date().toISOString() } : { mode: steps.length ? 'demonstration' : 'n/a', alarms: 0, at: new Date().toISOString() };
      $('#after').innerHTML = ''; $('#run').disabled = true; $('#pause').disabled = false; $('#pause').textContent = 'Pause';
      body.querySelectorAll('.act,.seg button').forEach(b => b.disabled = true);
      const dur = (sim.dur || 8) * 1000; let t = 0, last = null; anim = { paused: false, raf: 0, skip: false };
      const useSu = !diy && steps.length > 0; const sd = steps.map(s => (s.d || 2.6) * 1000); const Ds = useSu ? sd.reduce((a, b) => a + b, 0) : 0;
      $('#chartwrap').hidden = true; $('#lvwrap').hidden = true; $('#rig').innerHTML = e.svg(p); $('#sucap').hidden = true;
      $('#suskip').hidden = !useSu; $('#suskip').onclick = () => { if (anim) anim.skip = true; };
      let inTest = !useSu;
      const loop = (ts) => {
        if (!anim) return; if (last == null) last = ts; const dt = ts - last; last = ts;
        if (!anim.paused) t += dt * (+$('#spd').value || 1);
        if (anim.skip && t < Ds) { t = Ds; anim.skip = false; }
        if (t < Ds) { let a = 0, k = 0; while (k < sd.length - 1 && t >= a + sd[k]) { a += sd[k]; k++; } suFrame(k, U.clamp((t - a) / sd[k], 0, 1), sim); $('#prog').style.width = (t / (Ds + dur) * 100) + '%'; anim.raf = requestAnimationFrame(loop); return; }
        if (!inTest) { inTest = true; $('#rig').innerHTML = e.svg(p); $('#sucap').hidden = true; $('#suskip').hidden = true; }
        const f = Math.min(1, (t - Ds) / dur); draw(f); if (useSu) $('#prog').style.width = ((Ds + f * dur) / (Ds + dur) * 100) + '%';
        if (f < 1) anim.raf = requestAnimationFrame(loop); else { anim = null; S.ran = true; save(e.id); simCache[e.id + '|' + JSON.stringify(S.params) + '|' + S.seed] = sim; refreshBar(); finish(); }
      };
      anim.raf = requestAnimationFrame(loop);
    };
    $('#pause').onclick = () => { if (!anim) return; anim.paused = !anim.paused; $('#pause').textContent = anim.paused ? 'Resume' : 'Pause'; };
    $('#reset').onclick = () => { stopAnim(); resetSu(); $('#sucap').hidden = true; $('#suskip').hidden = true; S.ran = false; S.valid = null; save(e.id); sim = null; $('#rig').innerHTML = e.svg(p); $('#chartwrap').hidden = true; $('#lvwrap').hidden = true; $('#after').innerHTML = ''; $('#run').textContent = 'Run test'; $('#pause').disabled = true; $('#prog').style.width = '0'; draw0(); drawMode(); refreshBar(); };
  }

  function suSteps(e) { return e.setup || (LAB.SETUP && LAB.SETUP[e.id]) || []; }
  LAB.suSteps = suSteps;
  LAB.suCtx = (...a) => suCtx(...a);
  function suCtx(svg, active, sim, p) { const q = id => svg.querySelector('#' + id); return { svg, active, sim, p, q, set: (id, a, v) => { const el = q(id); if (el) el.setAttribute(a, v); }, show: (id, on) => { const el = q(id); if (el) el.style.display = on ? '' : 'none'; }, txt: (id, t) => { const el = q(id); if (el) el.textContent = t; }, op: (id, v) => { const el = q(id); if (el) el.setAttribute('opacity', v); } }; }

  /* ------------------------------------------------------------------ tables */
  function tableHTML(t) {
    return `<div class="tbl-wrap"><table class="t"><thead><tr>${t.cols.map((c, i) => `<th class="${t.num === false || (t.textCols && t.textCols.includes(i)) ? '' : 'n'}">${c}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr>${r.map((c, i) => `<td class="${t.num === false || (t.textCols && t.textCols.includes(i)) ? '' : 'n'}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  LAB.tableHTML = tableHTML;
  function nomenclature(e) { return e.nomenclature || (LAB.NOMEN && LAB.NOMEN[e.id]) || []; }
  LAB.nomenclature = nomenclature;
  function nomHTML(e) { const n = nomenclature(e); if (!n.length) return ''; return tableHTML({ cols: ['Symbol', 'Description', 'Unit'], textCols: [0, 1, 2], rows: n.map(r => [`<span class="mono" style="white-space:nowrap">${r[0]}</span>`, r[1], r[2]]) }); }
  function kvTable(rows) { return tableHTML({ cols: ['Parameter', 'Value', 'Unit'], rows: rows.map(r => [r[0], r[1], r[2] || '']), textCols: [0, 2] }); }
  function csv(t) { return [t.cols, ...t.rows].map(r => r.map(c => '"' + String(c).replace(/<[^>]+>/g, '').replace(/"/g, '""') + '"').join(',')).join('\n'); }
  function dl(name, text, type) { const b = new Blob([text], { type: type || 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

  /* ------------------------------------------------------------------ experiment */
  function stExperiment(e, body, S) {
    const sim = getSim(e, S), p = paramsOf(e, S); if (!sim) return;
    const calcs = e.calcs(sim, p); S.calc = S.calc || {};
    body.innerHTML = `<div class="stack">
      <div class="grid2"><div class="panel"><div class="panel-h"><h4>Apparatus and test conditions</h4><span class="eyebrow">Run ${String(S.seed).slice(-5)}</span></div>${kvTable(sim.specimen || [])}</div>
      <div class="panel"><div class="panel-h"><h4>What to do here</h4></div><p style="font-size:.9rem">${e.expHint || 'Use the observation tables recorded from your run to calculate the results below. Enter values in the units shown. Show your working in your record book; the Report stage builds the sample calculation for you after validation.'}</p>${sim.plot ? `<div style="margin-top:12px"><canvas id="expchart" style="width:100%;height:240px"></canvas></div>` : ''}</div></div>
      <div id="expextra"></div>
      ${(sim.obs || []).map((t, i) => `<div class="panel"><div class="panel-h"><h4>${t.title}</h4>${EMBED ? '' : `<button class="btn quiet small" data-csv="${i}">Download CSV</button>`}</div>${t.note ? `<p class="muted" style="font-size:.84rem;margin-bottom:6px">${t.note}</p>` : ''}${tableHTML(t)}</div>`).join('')}
      <div class="panel"><div class="panel-h"><h4>Calculations</h4><span class="muted" style="font-size:.82rem" id="calcn"></span></div><div class="calc">${calcs.map(c => calcRow(c, S.calc[c.key])).join('')}</div>
      <div class="controls" style="margin-top:12px"><button class="btn" id="tovalid">Check my results →</button><span class="muted" id="cmsg" style="font-size:.85rem"></span></div></div></div>`;
    if (sim.plot) LAB.plot($('#expchart'), Object.assign({}, sim.plot, { frac: 1, title: null }), { h: 240 });
    if (e.expExtra) e.expExtra($('#expextra'), sim, p, S);
    body.querySelectorAll('[data-csv]').forEach(b => b.onclick = () => dl(`${e.id}-${(sim.obs[+b.dataset.csv].title || 'data').replace(/\W+/g, '-').toLowerCase()}.csv`, csv(sim.obs[+b.dataset.csv]), 'text/csv'));
    const cnt = () => { const n = calcs.filter(c => S.calc[c.key] != null && S.calc[c.key] !== '').length; $('#calcn').textContent = `${n} of ${calcs.length} entered`; };
    body.querySelectorAll('[data-c]').forEach(inp => inp.addEventListener('input', () => { S.calc[inp.dataset.c] = inp.value; save(e.id); cnt(); refreshBar(); }));
    cnt();
    $('#tovalid').onclick = () => { const miss = calcs.filter(c => S.calc[c.key] == null || S.calc[c.key] === ''); if (miss.length) { $('#cmsg').textContent = `Enter all results first (${miss.length} missing).`; return; } switchStage(e, 'validation'); };
  }
  function calcRow(c, v) {
    const inp = c.type === 'select' ? `<select id="c_${c.key}" data-c="${c.key}"><option value="">Select…</option>${c.options.map(o => `<option ${String(o) === String(v) ? 'selected' : ''}>${o}</option>`).join('')}</select>` :
      `<div class="unit-in"><input type="number" step="any" id="c_${c.key}" data-c="${c.key}" value="${v != null ? U.esc(v) : ''}" inputmode="decimal"><span class="u">${c.unit || '—'}</span></div>`;
    return `<div class="calc-row"><div class="lbl"><label for="c_${c.key}"><b>${c.label}</b></label>${c.hint ? `<code>${c.hint}</code>` : ''}</div><div>${inp}</div><div class="st muted">${c.type === 'select' ? 'choice' : 'tolerance ±' + tolText(c)}</div></div>`;
  }
  function tolText(c) { return c.abs != null ? `${U.sig(c.abs, 2)} ${c.unit && c.unit !== '—' ? c.unit : ''}` : `${Math.round((c.tol == null ? 0.03 : c.tol) * 100)}%`; }
  function checkCalc(c, v) {
    if (v == null || v === '') return { ok: false, dev: NaN };
    if (c.type === 'select') return { ok: String(v) === String(c.truth), dev: NaN };
    const x = +v; if (!isFinite(x)) return { ok: false, dev: NaN };
    const t = c.truth; const tolAbs = c.abs != null ? c.abs : Math.abs(t) * (c.tol == null ? 0.03 : c.tol);
    return { ok: Math.abs(x - t) <= tolAbs + 1e-12, dev: t !== 0 ? (x - t) / Math.abs(t) * 100 : NaN, tolPct: t !== 0 ? tolAbs / Math.abs(t) * 100 : 0, z: tolAbs ? (x - t) / tolAbs : 0 };
  }
  LAB.checkCalc = checkCalc;

  /* ------------------------------------------------------------------ validation */
  function stValidation(e, body, S) {
    const sim = getSim(e, S), p = paramsOf(e, S); if (!sim) return;
    const calcs = e.calcs(sim, p); const ref = e.reference ? e.reference(sim, p) : [];
    const res = calcs.map(c => Object.assign({ c, v: S.calc && S.calc[c.key] }, checkCalc(c, S.calc && S.calc[c.key])));
    const checked = S.valid && S.valid.done;
    const nOk = res.filter(r => r.ok).length;
    body.innerHTML = `<div class="stack">
      <div class="panel"><div class="meter">${checked ? `<div class="big num" style="color:${nOk === res.length ? 'var(--ok)' : 'var(--ink)'}">${nOk}/${res.length}</div><div><b>${nOk === res.length ? 'All results within tolerance.' : 'Some results are outside tolerance.'}</b><p class="muted" style="font-size:.88rem">Attempt ${S.valid.attempts}. First-attempt accuracy: ${S.valid.first}/${res.length}. Fix any red rows in the Experiment stage and check again.</p></div>` :
        `<div><b>Validate your calculations</b><p class="muted" style="font-size:.88rem;max-width:70ch">Your results are compared with values computed from the same recorded observations. Tolerances reflect reading and rounding error, not a free margin. Expected values are shown after you check.</p></div>`}
        <div style="margin-left:auto"><button class="btn" id="vcheck">${checked ? 'Check again' : 'Check my results'}</button></div></div></div>
      ${checked ? `<div class="panel"><div class="panel-h"><h4>Result-by-result check</h4><span class="eyebrow">your value vs expected</span></div>${tableHTML({ cols: ['Quantity', 'Your value', 'Expected', 'Deviation', 'Status'], textCols: [0, 4], rows: res.map(r => [r.c.label + (r.c.unit ? ` (${r.c.unit})` : ''), r.v === '' || r.v == null ? '—' : U.esc(r.v), r.c.type === 'select' ? r.c.truth : fmtT(r.c), isFinite(r.dev) ? (r.dev > 0 ? '+' : '') + U.f(r.dev, 2) + '%' : '—', `<span class="st ${r.ok ? 'ok' : 'bad'}">${r.ok ? 'Within tolerance' : 'Recheck'}</span>`]) })}
        <div style="margin-top:6px">${res.filter(r => r.c.type !== 'select' && isFinite(r.z)).map(r => { const z = U.clamp(r.z, -3, 3); return `<div class="vbar"><span>${r.c.label}</span><div class="track"><div class="tol" style="left:${50 - 50 / 3}%;right:${50 - 50 / 3}%"></div><div class="mid"></div><div class="mk ${r.ok ? '' : 'bad'}" style="left:${50 + z * 50 / 3}%"></div></div><span class="mono" style="font-size:.76rem">${r.ok ? 'in band' : (r.z > 0 ? 'high' : 'low')}</span></div>`; }).join('')}<p class="muted" style="font-size:.76rem;margin-top:4px">Green band = allowed tolerance. Marker position is deviation scaled to tolerance (clipped at 3×).</p></div></div>` : ''}
      ${ref.length ? `<div class="panel"><div class="panel-h"><h4>Comparison with reference data</h4><span class="eyebrow">handbook / standard values</span></div>${tableHTML({ cols: ['Property', 'This test', 'Reference range', 'Source', 'Verdict'], textCols: [0, 3, 4], rows: ref.map(r => [r.label + (r.unit ? ` (${r.unit})` : ''), r.fmt ? r.fmt(r.value) : U.sig(r.value, 4), r.range || `${U.sig(r.lo, 3)} – ${U.sig(r.hi, 3)}`, r.src || 'Handbook', `<span class="st ${inRef(r) ? 'ok' : 'bad'}">${inRef(r) ? 'Consistent' : 'Outside typical range'}</span>`]) })}<p class="muted" style="font-size:.82rem">A test value outside the typical range is not automatically wrong. Material condition, specimen geometry and test rate all shift properties; discuss any discrepancy in your report.</p></div>` : ''}
      ${e.valExtra ? '<div id="valextra"></div>' : ''}</div>`;
    if (e.valExtra) e.valExtra($('#valextra'), sim, p, S);
    $('#vcheck').onclick = () => { const v = S.valid || { attempts: 0 }; v.attempts = (v.attempts || 0) + 1; v.done = true; const ok = res.filter(r => r.ok).length; if (v.first == null) v.first = ok; v.last = ok; v.total = res.length; S.valid = v; save(e.id); stValidation(e, body, S); refreshBar(); };
  }
  function inRef(r) { return r.value >= r.lo && r.value <= r.hi; }
  function fmtT(c) { const t = c.truth; if (c.fmt) return c.fmt(t); return Math.abs(t) >= 1e5 || (Math.abs(t) < 1e-3 && t !== 0) ? U.sci(t, 4) : U.sig(t, 4); }
  LAB.fmtT = fmtT;

  /* ------------------------------------------------------------------ report */
  // Stand-alone HTML of the report sheet (used for Download and for the copy saved to the faculty's Drive).
  function reportDoc(e) {
    const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch (x) { return ''; } }).join('\n');
    const sh = $('#sheet'); const body = sh ? sh.innerHTML : '';
    return `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Exp ${e.no} ${e.title} — Report</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>${css}body{background:#e9edf0;padding:24px}.sheet{max-width:900px;margin:0 auto}</style></head><body><article class="sheet">${body}</article></body></html>`;
  }
  LAB.reportDoc = reportDoc;
  LAB.reportId = (e, S) => e.id.toUpperCase().slice(0, 4) + '-' + String(S.seed).slice(-6);
  function stReport(e, body, S) {
    const sim = getSim(e, S), p = paramsOf(e, S); if (!sim) return;
    S.reportSeen = true; save(e.id); refreshBar();
    const stu = Store.get('student', {}) || {}; S.disc = S.disc || {};
    const calcs = e.calcs(sim, p);
    if (S.concl == null) S.concl = e.conclude ? e.conclude(sim, p, S) : '';
    const X = LAB.ext && LAB.ext.fbHTML ? LAB.ext : null; const gate = X && !S.feedback;
    const fld = (k, l, type) => `<div class="field"><label for="r_${k}">${l}</label><input type="${type || 'text'}" id="r_${k}" data-s="${k}" value="${U.esc(stu[k] || (k === 'date' ? new Date().toISOString().slice(0, 10) : ''))}"></div>`;
    body.innerHTML = `<div class="rep-grid"><div class="rep-form no-print">
      <div class="panel stack" style="gap:10px"><h4>Report details</h4>${fld('name', 'Student name')}${fld('usn', 'USN / Roll no.')}<div class="grid2" style="gap:8px">${fld('section', 'Section')}${fld('batch', 'Batch')}</div>${fld('date', 'Date of experiment', 'date')}${fld('instructor', 'Faculty in charge')}${fld('inst', 'Institution')}</div>
      <div class="panel stack" style="gap:10px"><h4>Discussion</h4><p class="muted" style="font-size:.8rem">Answer in your own words. Your answers are printed in the report.</p>${e.discussion.map((q, i) => `<div class="field"><label for="d_${i}">${q}</label><textarea id="d_${i}" data-d="${i}">${U.esc(S.disc[i] || '')}</textarea></div>`).join('')}</div>
      <div class="panel stack" style="gap:10px"><h4>Conclusion</h4><p class="muted" style="font-size:.8rem">A draft based on your results. Edit it to state what you found.</p><textarea id="r_concl" style="min-height:140px">${U.esc(S.concl)}</textarea></div>
      ${X ? X.fbHTML(S) : ''}
      <div class="panel stack" style="gap:8px"><h4>Print or download</h4>${EMBED ? `<p class="muted" style="font-size:.82rem">Printing and downloads are disabled in this preview window. Open the lab from its hosted website to print the report or save it as PDF.</p>` : `<button class="btn" id="rprint" ${gate ? 'disabled' : ''}>Print / Save as PDF</button><button class="btn quiet" id="rdl" ${gate ? 'disabled' : ''}>Download report (.html)</button>${gate ? '<span class="muted" style="font-size:.8rem">Complete the feedback form above to unlock.</span>' : ''}`}</div>
      ${X ? X.submitHTML(S) : ''}
      ${X && X.certHTML ? X.certHTML(e, S) : ''}
      </div><div><article class="sheet" id="sheet"${gate ? ' data-locked' : ''}></article><p class="print-lock">Complete the feedback form in the Report stage to print this report.</p></div></div>`;
    const draw = () => { $('#sheet').innerHTML = reportHTML(e, sim, p, S, Store.get('student', {}) || {}, calcs); };
    body.querySelectorAll('[data-s]').forEach(i => i.addEventListener('input', () => { const s = Store.get('student', {}) || {}; s[i.dataset.s] = i.value; Store.set('student', s); draw(); }));
    { const s = Store.get('student', {}) || {}; if (!s.date) { s.date = new Date().toISOString().slice(0, 10); Store.set('student', s); } }
    body.querySelectorAll('[data-d]').forEach(i => i.addEventListener('input', () => { S.disc[i.dataset.d] = i.value; save(e.id); draw(); }));
    $('#r_concl').addEventListener('input', () => { S.concl = $('#r_concl').value; save(e.id); draw(); });
    draw();
    if (X) {
      X.fbBind(e, S, () => Store.get('student', {}) || {}, () => stReport(e, body, S));
      X.submitBind(e, S, () => { if (gate) return {}; const s = Store.get('student', {}) || {}; const res = calcs.map(c => checkCalc(c, S.calc && S.calc[c.key])); const xs = X.xSummary(e, S) || {}; const N = S.num || {};
        return { type: 'report', version: LAB.VERSION, reportId: LAB.reportId(e, S), experiment: `Exp ${e.no} ${e.title}`, name: (s.name || '').trim(), usn: (s.usn || '').trim().toUpperCase(), section: s.section || '', batch: s.batch || '', faculty: s.instructor || '', institution: s.inst || '', reportDate: s.date || '', classCode: (Store.get('classCode', '') || '').trim(), safetyAck: S.safetyAck || '',
          preFirst: S.pre && S.pre.first != null ? S.pre.first : '', postFirst: S.post && S.post.first != null ? S.post.first : '', preNow: S.pre && S.pre.score != null ? S.pre.score : '', postNow: S.post && S.post.score != null ? S.post.score : '', gain: gain(S), resultsCorrect: res.filter(r => r.ok).length, resultsTotal: res.length, validationAttempts: S.valid ? S.valid.attempts : 0,
          numSolved: N.solved || 0, numAttempted: N.attempted || 0, numWithHints: N.withHints || 0, setupMode: S.setupLog ? S.setupLog.mode : '', setupAlarms: S.setupLog ? S.setupLog.alarms : '', explRight: xs.right || 0, explN: xs.n || 0, explReplays: xs.replays || 0,
          conclusion: S.concl || '', disc1: (S.disc || {})[0] || '', disc2: (S.disc || {})[1] || '', disc3: (S.disc || {})[2] || '', disc4: (S.disc || {})[3] || '', feedbackAt: S.feedback ? S.feedback.t : '', clientTime: new Date().toISOString(), process: 'EXP' + String(e.no).padStart(2, '0'), reportHtml: (() => { try { return reportDoc(e); } catch (x) { return ''; } })() }; });
      if (X.certBind) X.certBind(e, S, () => stReport(e, body, S));
      if (gate) { const b = $('#rsub'); if (b) { b.disabled = true; const m = $('#rsubmsg'); if (m && X.submitUrl()) m.textContent = 'Complete the feedback form above to unlock submission.'; } }
    }
    if (!EMBED && !gate) {
      $('#rprint').onclick = () => window.print();
      $('#rdl').onclick = () => { const s = Store.get('student', {}) || {}; dl(`Exp${String(e.no).padStart(2, '0')}_${e.id}_${(s.usn || 'report').replace(/\W+/g, '')}.html`, reportDoc(e), 'text/html'); };
    }
  }
  function reportHTML(e, sim, p, S, stu, calcs) {
    const res = calcs.map(c => Object.assign({ c, v: S.calc && S.calc[c.key] }, checkCalc(c, S.calc && S.calc[c.key])));
    const ref = e.reference ? e.reference(sim, p) : [];
    const nOk = res.filter(r => r.ok).length;
    let sec = 0; const H2 = t => `<h2><span>${String(++sec).padStart(2, '0')}</span>${t}</h2>`;
    const figs = []; if (sim.plot) figs.push({ src: LAB.plotImage(Object.assign({}, sim.plot, { frac: 1, title: null })), cap: sim.plot.caption || sim.plot.title || (sim.plot.ylabel + ' versus ' + sim.plot.xlabel) });
    if (sim.plots) sim.plots.forEach(pl => figs.push({ src: LAB.plotImage(Object.assign({}, pl, { frac: 1, title: null })), cap: pl.caption || pl.title }));
    if (e.reportFigs) e.reportFigs(sim, p, S).forEach(f => figs.push(f));
    const unc = e.uncert ? e.uncert(sim, p, S) : [];
    const id = LAB.reportId(e, S);
    const date = stu.date || new Date().toISOString().slice(0, 10);
    const xs = LAB.ext && LAB.ext.xSummary ? LAB.ext.xSummary(e, S) : null, N = S.num || {}, L = S.setupLog;
    const wm = `${id} · ${U.esc(stu.name || 'Unnamed')}${stu.usn ? ' · ' + U.esc(stu.usn) : ''}`;
    const fdt = t => t ? new Date(t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
    const record = [['Safety briefing acknowledged', S.safetyAck ? fdt(S.safetyAck) : 'Not recorded'],
      ['Apparatus set-up', !L ? 'Not recorded' : L.mode === 'performed' ? `Performed by the student${L.alarms ? ` · ${L.alarms} interlock alarm${L.alarms > 1 ? 's' : ''} (actions out of order)` : ' · no interlock alarms'}` : L.mode === 'demonstration' ? 'Watched the demonstration' : 'No set-up sequence for this experiment'],
      ['Test run', L && L.at ? fdt(L.at) : '—'],
      ['Narrated explainer', !xs ? '—' : xs.answered ? `${xs.right} of ${xs.n} concept checks right first time${xs.replays ? ` · ${xs.replays} replay${xs.replays > 1 ? 's' : ''}` : ''}${xs.done ? ' · completed' : ''}` : 'Not watched'],
      ['Numerical problems', N.attempted ? `${N.solved} solved of ${N.attempted} attempted${N.withHints ? ` · ${N.withHints} with hints` : ''}` : 'None attempted'],
      ['Validation checks', S.valid ? `${S.valid.attempts} · ${S.valid.first}/${S.valid.total} within tolerance at first check` : '—'],
      ['Student feedback', S.feedback ? 'Given ' + fdt(S.feedback.t) : 'Not given']];
    return `<div class="wmark" aria-hidden="true">${Array(160).fill(`<span>${wm}</span>`).join('')}</div><header class="rh">${LAB.LOGO ? `<img class="rlogo" src="${LAB.LOGO}" alt="MITE logo">` : '<span></span>'}<div><div class="inst">${U.esc(stu.inst || 'Mangalore Institute of Technology &amp; Engineering, Moodbidri')}</div><div class="inst" style="margin-top:2px">Department of Mechanical Engineering</div><div class="inst" style="margin-top:2px">Heat Transfer Laboratory</div><h1 style="margin-top:10px">Experiment ${e.no}: ${e.title}</h1></div><div style="text-align:right;font:500 .74rem var(--f-mono);color:var(--paper-muted)">Report ID<br><b style="color:var(--paper-ink);font-size:.9rem">${id}</b><br>${date}</div></header>
      <div class="meta"><div><b>Name:</b> ${U.esc(stu.name || '________________')}</div><div><b>USN:</b> ${U.esc(stu.usn || '__________')}</div><div><b>Section / Batch:</b> ${U.esc((stu.section || '__') + ' / ' + (stu.batch || '__'))}</div><div><b>Faculty:</b> ${U.esc(stu.instructor || '________________')}</div><div><b>Standard:</b> ${e.std}</div><div><b>Date:</b> ${date}</div></div>
      ${H2('Aim and objectives')}<p>${e.aim}</p><ul>${e.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
      ${H2('Apparatus and standards')}<ul>${e.apparatus.map(a => `<li>${a}</li>`).join('')}</ul><p><b>Governing standard(s):</b> ${e.std}${e.stdNote ? '. ' + e.stdNote : ''}</p>
      ${H2('Theory')}<p>${e.summary}</p><div class="eq">${e.formulas.map(f => `<span class="w" style="margin-top:8px">${f[0]}</span>${f[1]}`).join('')}</div>
      ${nomenclature(e).length ? H2('Nomenclature') + nomHTML(e) : ''}
      ${H2('Apparatus details and test conditions')}${kvTable(sim.specimen || [])}
      ${H2('Procedure followed')}<ol>${e.procedure.map(s => `<li>${s}</li>`).join('')}</ol>
      ${H2('Laboratory record')}${tableHTML({ cols: ['Item', 'Record'], textCols: [0, 1], rows: record })}
      ${H2('Observations')}${(sim.obs || []).map(t => `<h3>${t.title}</h3>${t.note ? `<p class="muted" style="font-size:.8rem">${t.note}</p>` : ''}${tableHTML(t)}`).join('')}
      ${figs.length ? H2('Graphs and figures') + figs.map((f, i) => `<img src="${f.src}" alt="${U.esc(f.cap)}"><p class="figcap">Figure ${i + 1}. ${f.cap}</p>`).join('') : ''}
      ${H2('Calculations')}${e.sample ? e.sample(sim, p, S) : ''}
      ${H2('Results')}${tableHTML({ cols: ['Quantity', 'Unit', 'Student value', 'Expected', 'Deviation', 'Status'], textCols: [0, 1, 5], rows: res.map(r => [r.c.label, r.c.unit || '—', r.v === '' || r.v == null ? '—' : U.esc(r.v), r.c.type === 'select' ? r.c.truth : fmtT(r.c), isFinite(r.dev) ? (r.dev > 0 ? '+' : '') + U.f(r.dev, 2) + '%' : '—', `<span class="${r.ok ? 'pass' : 'fail'}">${r.ok ? 'Pass' : 'Fail'}</span>`]) })}
      ${H2('Validation against reference data')}${ref.length ? tableHTML({ cols: ['Property', 'This test', 'Reference range', 'Source', 'Verdict'], textCols: [0, 3, 4], rows: ref.map(r => [r.label + (r.unit ? ` (${r.unit})` : ''), r.fmt ? r.fmt(r.value) : U.sig(r.value, 4), r.range || `${U.sig(r.lo, 3)} – ${U.sig(r.hi, 3)}`, r.src || 'Handbook', `<span class="${inRef(r) ? 'pass' : 'fail'}">${inRef(r) ? 'Consistent' : 'Outside range'}</span>`]) }) : '<p>Not applicable for this experiment.</p>'}
      ${H2('Uncertainty analysis')}${unc.length ? tableHTML({ cols: ['Quantity', 'Propagation', 'Value', 'Std. uncertainty u', 'Relative'], textCols: [0, 1], rows: unc.map(u => [u.q, u.expr, U.sig(u.val, 4) + ' ' + (u.unit || ''), '± ' + U.sig(u.u, 2) + ' ' + (u.unit || ''), U.f(Math.abs(u.u / u.val) * 100, 2) + '%']) }) + `<p class="muted" style="font-size:.8rem">Standard uncertainties from instrument resolution (rectangular distribution, u = resolution/√12) combined in quadrature per the GUM (JCGM 100:2008). Expanded uncertainty U = 2u (≈95% coverage).</p>` : '<p>Uncertainty is dominated by observer judgement for this experiment; see sources of error.</p>'}
      ${H2('Sources of error')}<ul>${e.errors.map(x => `<li>${x}</li>`).join('')}</ul>
      ${H2('Discussion')}${e.discussion.map((q, i) => `<h3>${i + 1}. ${q}</h3><p>${S.disc && S.disc[i] ? U.esc(S.disc[i]).replace(/\n/g, '<br>') : '<span class="muted">[Not answered]</span>'}</p>`).join('')}
      ${H2('Conclusion')}<p>${U.esc(S.concl || '').replace(/\n/g, '<br>')}</p>
      ${H2('Assessment summary')}<div class="kpis"><div><b>${S.pre && S.pre.first != null ? S.pre.first + '%' : '—'}</b><span>Pre-test (first attempt)</span></div><div><b>${S.post && S.post.first != null ? S.post.first + '%' : '—'}</b><span>Post-test (first attempt)</span></div><div><b>${gain(S)}</b><span>Normalised learning gain g</span></div><div><b>${nOk}/${res.length}</b><span>Results within tolerance${S.valid ? ` · ${S.valid.attempts} check${S.valid.attempts > 1 ? 's' : ''}` : ''}</span></div><div><b>${N.attempted ? N.solved + '/' + N.attempted : '—'}</b><span>Numericals solved${N.withHints ? ` · ${N.withHints} with hints` : ''}</span></div><div><b>${xs && xs.answered ? xs.right + '/' + xs.n : '—'}</b><span>Explainer concept checks</span></div></div><p class="muted" style="font-size:.78rem">g = (post − pre)/(100 − pre), Hake (1998). Values above 0.3 indicate medium gain, above 0.7 high gain.</p>
      ${H2('Precautions observed')}<ul>${e.precautions.map(x => `<li>${x}</li>`).join('')}</ul>
      ${H2('Engineering applications')}<ul>${e.applications.map(x => `<li>${x}</li>`).join('')}</ul>
      ${H2('References')}<ol>${e.refs.map(x => `<li>${x}</li>`).join('')}</ol>
      <div class="sig"><div>Student</div><div>Faculty in charge</div><div>Date</div></div><p class="rfoot">Report ID ${id} · generated by the Heat Transfer Virtual Lab v${LAB.VERSION || ''} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Values are produced by a teaching simulator.</p>`;
  }

  /* ------------------------------------------------------------------ boot */
  LAB.boot = function () {
    LAB.list.sort((a, b) => a.no - b.no);
    window.addEventListener('hashchange', route);
    const tb = $('#themeBtn');
    if (tb) { const cur = Store.get('theme', ''); if (cur) document.documentElement.setAttribute('data-theme', cur); const lab = () => { const t = document.documentElement.getAttribute('data-theme'); tb.textContent = t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Auto'; }; lab();
      tb.onclick = () => { const t = document.documentElement.getAttribute('data-theme'); const n = !t ? 'light' : t === 'light' ? 'dark' : ''; if (n) document.documentElement.setAttribute('data-theme', n); else document.documentElement.removeAttribute('data-theme'); Store.set('theme', n); lab(); if (current) renderStage(current.e, current.stage, $('#stage')); else home(); }; }
    route();
  };
})();
