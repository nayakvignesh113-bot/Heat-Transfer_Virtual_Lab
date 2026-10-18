// Headless check: loads the engine with minimal stubs and exercises every experiment's model functions.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
function canvasStub() { const ctx = new Proxy({}, { get: (t, k) => k === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : k === 'measureText' ? () => ({ width: 10 }) : (k in t ? t[k] : () => { }), set: (t, k, v) => { t[k] = v; return true; } }); return { width: 0, height: 0, getContext: () => ctx, toDataURL: () => 'data:', style: {} }; }
const sandbox = { window: {}, console, Math, JSON, Date, setTimeout, localStorage: { getItem: () => null, setItem: () => { } },
  document: { createElement: t => t === 'canvas' ? canvasStub() : ({ style: {}, setAttribute() { }, appendChild() { } }), documentElement: {}, body: {}, querySelector: () => null, styleSheets: [] },
  getComputedStyle: () => ({ getPropertyValue: () => '#000' }) };
sandbox.fetch = () => Promise.reject(new Error('no fetch')); sandbox.Image = function () { }; sandbox.window = sandbox; vm.createContext(sandbox);
const files = ['assets/js/core.js', 'assets/js/logo.js', 'assets/js/kit.js', ...fs.readdirSync(path.join(root, 'assets/js/exp')).filter(f => f.endsWith('.js')).sort().map(f => 'assets/js/exp/' + f), 'assets/js/site.js', 'assets/js/cert.js'];
for (const f of files) { try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }); } catch (e) { console.log('LOAD FAIL', f, e.message); } }
const LAB = sandbox.LAB; let fails = 0;
const only = process.argv[2];
for (const e of LAB.list) {
  if (only && e.id !== only) continue;
  const req = ['pre', 'post', 'theory', 'procedure', 'precautions', 'applications', 'formulas', 'apparatus', 'objectives', 'errors', 'discussion', 'refs', 'summary', 'opSteps'];
  const miss = req.filter(k => !e[k]); if (miss.length) { console.log(e.id, 'MISSING', miss); fails++; }
  if (!LAB.suSteps(e).length) { console.log(e.id, 'NO SETUP STEPS'); fails++; }
  LAB.suSteps(e).forEach((st, i) => { if (!st.why) { console.log(e.id, 'setup step without interlock reason', i); fails++; } });
  const Z = LAB.SAFETY[e.id]; if (!Z || !['haz', 'ppe', 'rules', 'emerg'].every(k => Z[k] && Z[k].length)) { console.log(e.id, 'SAFETY incomplete'); fails++; }
  const Lb = LAB.LIB[e.id]; if (!Lb || !Lb.rows.length || Lb.rows.some(r => r.length !== Lb.cols.length)) { console.log(e.id, 'LIB bad'); fails++; }
  if (!LAB.VALID[e.id]) { console.log(e.id, 'no validation status'); fails++; }
  const X = LAB.EXPL[e.id]; if (!X || X.scenes.length < 2) { console.log(e.id, 'EXPL missing'); fails++; } else { const nsu = LAB.suSteps(e).length; X.scenes.forEach((sc, si) => { sc.lines.forEach(l => { if (l[1] && l[1].s != null && l[1].s >= nsu) { console.log(e.id, 'expl cue beyond setup steps', si, l[1].s); fails++; } }); if (sc.q && (sc.q.a >= sc.q.o.length || !sc.q.why)) { console.log(e.id, 'expl q bad', si); fails++; } }); }
  const NG = LAB.NUM[e.id]; if (!NG || NG.length !== 3) { console.log(e.id, 'NUM count', NG && NG.length); fails++; }
  else NG.forEach((gen, k) => { for (let sd = 1; sd <= 200; sd++) { const o = gen(LAB.U.rng(sd * 104729 + k)); if (!isFinite(o.ans) || o.ans <= 0 || !o.q || !o.sol || !o.unit || !o.hints || o.hints.length < 2 || /NaN|undefined|Infinity/.test(o.q + o.sol + o.hints.join(''))) { console.log(e.id, 'NUM', k, sd, o.ans, o.q.slice(0, 80)); fails++; break; } } });
  const nom = LAB.nomenclature ? LAB.nomenclature(e) : [];
  if (!nom.length) { console.log(e.id, 'NO NOMENCLATURE'); fails++; }
  nom.forEach(r => { if (r.length !== 3 || r.some(x => !String(x).trim())) { console.log(e.id, 'bad nomenclature row', r); fails++; } });
  const syms = nom.map(r => r[0]); if (new Set(syms).size !== syms.length) { console.log(e.id, 'duplicate symbol', syms.filter((x, i) => syms.indexOf(x) !== i)); fails++; }
  if (e.pre.length !== 5 || e.post.length !== 5) console.log(e.id, 'quiz count', e.pre.length, e.post.length);
  [...e.pre, ...e.post].forEach(q => { if (q.a >= q.o.length) { console.log(e.id, 'bad answer index', q.q); fails++; } });
  const combos = [];
  const ps = e.params || [];
  // default + each select option one at a time
  combos.push({});
  ps.forEach(d => { if (d.type === 'select') d.options.forEach(o => combos.push({ [d.id]: Array.isArray(o) ? o[0] : o })); else { combos.push({ [d.id]: d.min }); combos.push({ [d.id]: d.max }); } });
  for (const c of combos) for (let seed = 1; seed <= 3; seed++) {
    const S = { params: c, ran: true, seed: seed * 7919 };
    const p = LAB.paramsOf(e, S);
    try {
      const sim = e.simulate(p, LAB.U.rng(S.seed));
      if (sim.error) continue;
      const calcs = e.calcs(sim, p);
      calcs.forEach(k => { if (k.type !== 'select' && !isFinite(k.truth)) { console.log(e.id, JSON.stringify(c), 'non-finite truth', k.key, k.truth); fails++; } if (k.type === 'select' && !k.options.includes(k.truth)) { console.log(e.id, 'select truth not in options', k.key, k.truth); fails++; } });
      if (e.reference) e.reference(sim, p).forEach(r => { if (!isFinite(r.value)) { console.log(e.id, JSON.stringify(c), 'ref non-finite', r.label); fails++; } });
      if (e.sample) e.sample(sim, p, S); if (e.uncert) e.uncert(sim, p, S); if (e.conclude) e.conclude(sim, p, S);
      if (sim.readout) [0, 0.3, 0.7, 1].forEach(f => sim.readout(f));
      (sim.obs || []).forEach(t => t.rows.forEach(r => { if (r.length !== t.cols.length) { console.log(e.id, 'row length mismatch', t.title); fails++; } r.forEach(v => { if (String(v).includes('NaN') || String(v).includes('undefined')) { console.log(e.id, JSON.stringify(c), 'bad cell', t.title, r); fails++; } }); }));
      (sim.specimen || []).forEach(r => { if (String(r[1]).includes('NaN') || r[1] === undefined) { console.log(e.id, 'bad specimen', r); fails++; } });
      if (sim.plot) sim.plot.series.forEach(s => { if (s.x.length !== s.y.length) { console.log(e.id, 'series len'); fails++; } if (s.y.some(v => Number.isNaN(v))) { console.log(e.id, JSON.stringify(c), 'NaN in plot', s.name); fails++; } });
      if (seed === 1) { const steps = LAB.suSteps(e); const mkEl = () => { const el = { attrs: {}, style: {}, innerHTML: '', textContent: '', setAttribute(a, v) { if (v === undefined || (typeof v === 'string' && /NaN|undefined/.test(v))) throw new Error('bad attr ' + a + '=' + v); this.attrs[a] = v; }, getAttribute(a) { return this.attrs[a] || null; } }; el.children = [el, el]; return el; };
        const ids = {}; const svg = { querySelector(q) { const id = q.slice(1); return ids[id] || (ids[id] = mkEl()); } };
        steps.forEach((st, i) => [0, 0.3, 0.6, 1].forEach(u => { const layer = mkEl(); const q = id => svg.querySelector('#' + id); const ctx = { svg, active: u < 1, sim, p, q, set: (id, a, v) => q(id).setAttribute(a, v), show: (id, on) => { q(id).style.display = on ? '' : 'none'; }, txt: (id, t) => { if (/NaN|undefined/.test(String(t))) throw new Error('bad text ' + t); q(id).textContent = t; }, op: (id, v) => q(id).setAttribute('opacity', v) };
          st.draw(layer, u, ctx); if (/NaN|undefined|\[object/.test(layer.innerHTML)) throw new Error('setup step ' + i + ' bad markup: ' + layer.innerHTML.slice(0, 160));
          const note = typeof st.note === 'function' ? st.note(sim, p) : st.note; const ttl = typeof st.title === 'function' ? st.title(sim, p) : st.title; if (/NaN|undefined/.test(note + ttl)) throw new Error('setup step ' + i + ' bad caption: ' + ttl + ' / ' + note);
          if (!(st.op >= 0 && st.op < e.opSteps.length)) throw new Error('bad op index ' + st.op); })); }
      if (seed === 1 && process.argv[3] === 'v') console.log(e.id, JSON.stringify(c), calcs.map(k => k.key + '=' + (typeof k.truth === 'number' ? LAB.U.sig(k.truth, 4) : k.truth)).join(' '));
    } catch (err) { console.log(e.id, JSON.stringify(c), 'ERROR', err.stack.split('\n').slice(0, 3).join(' | ')); fails++; break; }
  }
}
Object.keys(LAB.NOMEN || {}).forEach(k => { if (!LAB.exps[k]) { console.log('nomenclature for unknown experiment', k); fails++; } });
console.log('experiments:', LAB.list.length, 'nomenclature sets:', Object.keys(LAB.NOMEN || {}).length, 'fails:', fails);
