/* Shared toolkit for the heat transfer experiments:
   - LAB.G   SVG helpers, thermal colour map, thermocouple and heater glyphs, canvas field and profile views
   - LAB.K   steady-state logging (thermocouple settling, drift, steady-state time), fits, set-up drawing helpers
   - LAB.P   property data (air at 1 atm, saturated water and steam, R134a, solids) by linear interpolation
   - LAB.SETUP, EXPL, SAFETY, LIB, NUM, NOMEN, VALID: filled by each experiment file */
(function () {
  'use strict';
  const U = LAB.U;
  const G = (LAB.G = {});
  ['SETUP', 'EXPL', 'SAFETY', 'LIB', 'NUM', 'NOMEN', 'VALID'].forEach(k => { LAB[k] = LAB[k] || {}; });

  /* ---------------- SVG helpers ---------------- */
  G.r = (x, y, w, h, cls, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls || ''}" ${extra || ''}/>`;
  G.t = (x, y, s, cls, extra) => `<text x="${x}" y="${y}" class="${cls || ''}" ${extra || ''}>${s}</text>`;
  G.l = (x1, y1, x2, y2, cls, w, extra) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls || 'ln'}" stroke-width="${w || 1.5}" ${extra || ''}/>`;
  G.c = (cx, cy, r, cls, extra) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="${cls || ''}" ${extra || ''}/>`;
  G.p = (d, cls, extra) => `<path d="${d}" class="${cls || ''}" ${extra || ''}/>`;
  G.svg = (vb, inner, label) => `<svg viewBox="${vb}" role="img" aria-label="${label || 'Apparatus schematic'}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  G.set = (svg, id, attr, val) => { const el = svg && svg.querySelector('#' + id); if (el) el.setAttribute(attr, val); return el; };
  G.txt = (svg, id, s) => { const el = svg && svg.querySelector('#' + id); if (el) el.textContent = s; };
  G.show = (svg, id, on) => { const el = svg && svg.querySelector('#' + id); if (el) el.style.display = on ? '' : 'none'; };
  G.fill = (svg, id, col) => { const el = svg && svg.querySelector('#' + id); if (el) el.style.fill = col; };

  /* Thermal colour map: cold blue → pale → hot red. t in 0..1. Readable on light and dark backgrounds. */
  const STOPS = [[0, [43, 76, 155]], [0.25, [62, 155, 196]], [0.5, [236, 226, 178]], [0.75, [232, 131, 58]], [1, [178, 35, 31]]];
  G.cmapRGB = function (t) { t = U.clamp(isFinite(t) ? t : 0, 0, 1); for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const a = STOPS[i - 1], b = STOPS[i], u = (t - a[0]) / (b[0] - a[0]); return a[1].map((v, k) => Math.round(v + (b[1][k] - v) * u)); } return STOPS[STOPS.length - 1][1]; };
  G.tcol = (T, lo, hi) => { const c = G.cmapRGB((T - lo) / ((hi - lo) || 1)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  /* vertical colour bar for an SVG rig */
  G.cbar = (x, y, w, h, lo, hi, unit) => { let s = '<defs><linearGradient id="cbg" x1="0" y1="1" x2="0" y2="0">'; for (let i = 0; i <= 8; i++) s += `<stop offset="${i / 8}" stop-color="${G.tcol(i / 8, 0, 1)}"/>`; s += '</linearGradient></defs>';
    return s + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#cbg)" stroke="var(--line)"/>` + G.t(x + w + 4, y + 8, `<tspan id="cbhi">${U.f(hi, 0)}</tspan> ${unit || '°C'}`, 'm', 'style="font-size:8px"') + G.t(x + w + 4, y + h, `<tspan id="cblo">${U.f(lo, 0)}</tspan>`, 'm', 'style="font-size:8px"'); };
  /* thermocouple bead with a label; id for the bead fill */
  G.tc = (x, y, label, id, dx, dy) => `<g>${G.c(x, y, 3.6, 'tcb', id ? `id="${id}"` : '')}${label ? G.t(x + (dx == null ? -6 : dx), y + (dy == null ? -7 : dy), label, 'm', 'style="font-size:8px"') : ''}</g>`;
  /* digital indicator box: rows [[label, id, init]] */
  G.disp = (x, y, w, rows, title) => { const hh = 14 + rows.length * 26; let s = `<g transform="translate(${x},${y})">${G.r(0, 0, w, hh, 'disp', 'rx="4"')}`; if (title) s += G.t(8, 12, title, 'm', 'style="fill:var(--panel-ink);font-size:7.5px;letter-spacing:.06em"');
    rows.forEach((r, i) => { const y0 = (title ? 14 : 4) + i * 26; s += G.t(8, y0 + 9, r[0], 'm', 'style="fill:var(--panel-ink);font-size:7.5px"') + G.t(8, y0 + 23, r[2] == null ? '0.0' : r[2], 'big', `id="${r[1]}"`); }); return s + '</g>'; };
  G.heater = (x, y, w, h, id) => { let z = ''; const n = Math.max(3, Math.round(w / 9)); for (let i = 0; i <= n; i++) z += (i ? 'L' : 'M') + (x + 3 + (w - 6) * i / n) + ' ' + (y + (i % 2 ? 3 : h - 3)); return `<g ${id ? `id="${id}"` : ''}>${G.r(x, y, w, h, 'heat', 'rx="2"')}<path d="${z}" class="lnh" fill="none" stroke-width="1.4"/></g>`; };
  G.arrow = (x1, y1, x2, y2, cls, w) => { const a = Math.atan2(y2 - y1, x2 - x1), L = 7; return `<g class="${cls || 'arr'}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w || 2}"/><path d="M${x2} ${y2} L${x2 - L * Math.cos(a - .45)} ${y2 - L * Math.sin(a - .45)} L${x2 - L * Math.cos(a + .45)} ${y2 - L * Math.sin(a + .45)} Z"/></g>`; };
  /* animated dashes for flowing fluid: call G.flow(svg, f) each frame on paths with class "flow" */
  G.flow = (svg, f, speed) => { if (!svg) return; svg.querySelectorAll('.flow').forEach(el => el.setAttribute('stroke-dashoffset', String(-((f * (speed || 600)) % 24)))); };

  /* ---------------- canvas views for the Live view panel ---------------- */
  function cv(el, key, hgt) { let c = el.querySelector('canvas[data-k="' + key + '"]'); if (!c) { el.innerHTML = ''; c = document.createElement('canvas'); c.dataset.k = key; c.style.width = '100%'; c.style.height = (hgt || 220) + 'px'; c.style.display = 'block'; el.appendChild(c); } return c; }
  G.cv = cv;
  /* Instantaneous profile: series computed by fn(f) → cfg for LAB.plot */
  G.profileView = (el, cfg, hgt) => { const c = cv(el, 'prof', hgt || 220); LAB.plot(c, Object.assign({ frac: 1 }, cfg), { h: hgt || 220 }); };
  /* 2-D false-colour field: opt { nx, ny, T(i,j)->°C or NaN (masked), lo, hi, probes:[{x,y,label,T}] (x,y in 0..1), title, xl, yl, aspect } */
  G.fieldView = function (el, opt) {
    const H = opt.h || 210; const c = cv(el, 'field', H); const W = c.clientWidth || 560; const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pal = LAB.pal(); g.fillStyle = pal.bg || '#fff'; g.fillRect(0, 0, W, H);
    const pad = 10, bw = 14, fw = W - pad * 3 - bw - 40, fh = H - pad * 2 - (opt.xl ? 14 : 0);
    const asp = opt.aspect || 0; let pw = fw, ph = fh; if (asp) { if (fw / fh > asp) pw = fh * asp; else ph = fw / asp; }
    const ox = pad + (fw - pw) / 2, oy = pad + (fh - ph) / 2;
    const nx = opt.nx, ny = opt.ny; const img = g.createImageData ? null : null; void img;
    const cw = pw / nx, ch = ph / ny;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const T = opt.T(i, j); if (!isFinite(T)) continue; g.fillStyle = G.tcol(T, opt.lo, opt.hi); g.fillRect(ox + i * cw, oy + (ny - 1 - j) * ch, cw + 0.6, ch + 0.6); }
    if (opt.outline) { g.strokeStyle = pal.ink; g.lineWidth = 1; opt.outline(g, ox, oy, pw, ph); }
    g.font = `10px ${getComputedStyle(document.body).getPropertyValue('--f-mono') || 'monospace'}`;
    (opt.probes || []).forEach(p => { const x = ox + p.x * pw, y = oy + (1 - p.y) * ph; g.fillStyle = '#ffd34d'; g.strokeStyle = '#16212b'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); g.stroke(); if (p.label != null) { const s = p.label + (p.T != null ? ' ' + U.f(p.T, 1) : ''); const tw = g.measureText(s).width + 6; const lx = U.clamp(x + 5, 0, W - tw - bw - 46), ly = U.clamp(y - (p.below ? -6 : 18), 0, H - 14); g.fillStyle = 'rgba(22,33,43,.82)'; g.fillRect(lx, ly, tw, 13); g.fillStyle = '#e9eef2'; g.textBaseline = 'top'; g.fillText(s, lx + 3, ly + 1.5); } });
    // colour bar
    const bx = W - pad - bw - 34, by = pad, bh = H - pad * 2 - (opt.xl ? 14 : 0);
    for (let k = 0; k < bh; k++) { g.fillStyle = G.tcol(1 - k / bh, 0, 1); g.fillRect(bx, by + k, bw, 1.2); }
    g.strokeStyle = pal.line; g.strokeRect(bx, by, bw, bh); g.fillStyle = pal.ink; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(U.f(opt.hi, 0), bx + bw + 4, by + 5); g.fillText(U.f((opt.hi + opt.lo) / 2, 0), bx + bw + 4, by + bh / 2); g.fillText(U.f(opt.lo, 0), bx + bw + 4, by + bh - 5); g.fillText(opt.unit || '°C', bx - 2, by + bh + 9);
    if (opt.xl) { g.fillStyle = pal.muted; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(opt.xl, ox + pw / 2, H - 3); }
  };

  /* ---------------- K: logging, steady state, fitting ---------------- */
  const K = (LAB.K = {});
  /* Thermocouple settling: T(t) = T0 + (Tss - T0)·[1 − a·e^(−t/τ) − (1 − a)·e^(−t/τ2)]. Returns the value at t. */
  K.settle = (T0, Tss, t, tau, a, tau2) => { a = a == null ? 0.85 : a; tau2 = tau2 || tau / 4; return T0 + (Tss - T0) * (1 - a * Math.exp(-t / tau) - (1 - a) * Math.exp(-t / tau2)); };
  /* Build a logged table: chans [{name, T0, Tss, tau, a, sd}] logged every dt minutes until steady + extra.
     Returns { times (min), vals[ch][k] (rounded to res), ssIdx, ssTime, rows, series(t-fine) } */
  K.log = function (chans, opt, r) {
    const dt = opt.dt, res = opt.res || 0.1, thr = opt.thr || 0.2, extra = opt.extra || 2, maxN = opt.maxN || 30;
    const times = [], vals = chans.map(() => []); let ss = -1, k = 0;
    const off = chans.map(c => (c.sd == null ? 0.15 : c.sd) * U.gauss(r)); // fixed TC offset (calibration error)
    while (k < maxN) {
      const t = k * dt; times.push(t);
      chans.forEach((c, i) => { const v = K.settle(c.T0, c.Tss, t * 60, c.tau, c.a, c.tau2) + (t > 0 ? off[i] * Math.min(1, t / (dt * 2)) : 0) + (c.noise == null ? 0.04 : c.noise) * U.gauss(r); vals[i].push(U.q(v, res)); });
      if (ss < 0 && k >= 1 && chans.every((c, i) => Math.abs(vals[i][k] - vals[i][k - 1]) <= thr + 1e-9)) ss = k;
      if (ss >= 0 && k >= ss + extra) break; k++;
    }
    if (ss < 0) ss = times.length - 1;
    return { times, vals, ssIdx: ss, ssTime: times[ss], last: times.length - 1 };
  };
  /* fine time series for the live chart */
  K.curves = (chans, tEndMin, n) => { const t = U.lin(0, tEndMin, n || 120); return { t, y: chans.map(c => t.map(x => K.settle(c.T0, c.Tss, x * 60, c.tau, c.a, c.tau2))) }; };
  /* options for the steady-state select calc: list of logged times */
  K.ssOptions = L => L.times.slice(1).map(t => t + ' min');
  K.ssCalc = (L, dtxt) => ({ key: 'tss', label: `Steady state first reached at (every channel changed by ≤ ${dtxt || '0.2 °C'} since the previous reading)`, type: 'select', options: K.ssOptions(L), truth: L.times[L.ssIdx] + ' min' });
  K.fit = U.linfit;
  K.lmtd = (d1, d2) => Math.abs(d1 - d2) < 1e-9 ? d1 : (d1 - d2) / Math.log(d1 / d2);
  K.SB = 5.670374e-8;
  K.K = c => c + 273.15;
  /* standard uncertainty of a thermocouple reading: type-K special limits ±1.1 °C as a rectangular bound plus indicator resolution */
  K.uTC = (res) => Math.hypot(1.1 / Math.sqrt(3), (res || 0.1) / Math.sqrt(12));

  /* ---------------- set-up drawing helpers (SVG strings) ---------------- */
  K.tag = (x, y, t, ax, ay) => { const w = Math.max(30, String(t).length * 6.4 + 14); return `<g class="su-tag">${ax != null ? `<line x1="${ax}" y1="${ay}" x2="${x + 6}" y2="${y + 10}" stroke="var(--straw)" stroke-width="1.6"/><circle cx="${ax}" cy="${ay}" r="2.6" fill="var(--straw)"/>` : ''}<rect x="${x}" y="${y}" width="${w}" height="20" rx="4"/><text x="${x + 7}" y="${y + 14}">${t}</text></g>`; };
  K.tick = (x, y) => `<path d="M${x} ${y} l5 6 l10 -12" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  K.blink = u => (u > 0.85 || Math.floor(u * 8) % 2 === 0);
  K.dimH = (x0, x1, y, t) => `<g><line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="var(--accent)" stroke-width="1.5"/><line x1="${x0}" y1="${y - 6}" x2="${x0}" y2="${y + 6}" stroke="var(--accent)" stroke-width="1.5"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" stroke="var(--accent)" stroke-width="1.5"/>${t ? `<text x="${(x0 + x1) / 2 - t.length * 3.2}" y="${y - 6}" class="ink" style="font-size:10px">${t}</text>` : ''}</g>`;
  K.dimV = (x, y0, y1, t) => `<g><line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="var(--accent)" stroke-width="1.5"/><line x1="${x - 6}" y1="${y0}" x2="${x + 6}" y2="${y0}" stroke="var(--accent)" stroke-width="1.5"/><line x1="${x - 6}" y1="${y1}" x2="${x + 6}" y2="${y1}" stroke="var(--accent)" stroke-width="1.5"/>${t ? `<text x="${x + 8}" y="${(y0 + y1) / 2 + 4}" class="ink" style="font-size:10px">${t}</text>` : ''}</g>`;
  /* hand-held calibrated thermometer / probe moving to a point */
  K.probe = (x, y, u) => { const yy = y - 40 * (1 - u); return `<g><rect x="${x - 3}" y="${yy - 56}" width="6" height="50" rx="2" class="steelD"/><rect x="${x - 9}" y="${yy - 78}" width="18" height="24" rx="3" class="acc"/></g>`; };
  /* multimeter / clamp reading */
  K.meter = (x, y, txt) => `<g><rect x="${x}" y="${y}" width="74" height="40" rx="5" class="disp"/><text x="${x + 8}" y="${y + 26}" style="fill:var(--straw);font:600 13px var(--f-mono)">${txt}</text></g>`;
  /* measuring jar filling + stopwatch: u 0..1 */
  K.jar = (x, y, u, txt) => `<g><rect x="${x}" y="${y}" width="34" height="62" rx="2" fill="none" stroke="var(--ink)" stroke-width="1.4"/><rect x="${x + 1}" y="${y + 61 - 58 * u}" width="32" height="${58 * u}" class="fluid" opacity=".7"/>${[1, 2, 3, 4, 5].map(i => `<line x1="${x}" y1="${y + 62 - i * 11}" x2="${x + 8}" y2="${y + 62 - i * 11}" class="ln" stroke-width="1"/>`).join('')}<circle cx="${x + 64}" cy="${y + 24}" r="16" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.4"/><line x1="${x + 64}" y1="${y + 24}" x2="${x + 64 + 11 * Math.sin(u * 6.28)}" y2="${y + 24 - 11 * Math.cos(u * 6.28)}" class="ln" stroke-width="1.6"/>${txt ? `<text x="${x + 44}" y="${y + 56}" class="ink" style="font:500 10px var(--f-mono)">${txt}</text>` : ''}</g>`;
  K.knob = (x, y, u, lab) => `<g><circle cx="${x}" cy="${y}" r="13" class="mach"/><line x1="${x}" y1="${y}" x2="${x + 10 * Math.cos(Math.PI * (0.75 + 1.5 * u))}" y2="${y + 10 * Math.sin(Math.PI * (0.75 + 1.5 * u))}" stroke="var(--straw)" stroke-width="3" stroke-linecap="round"/>${lab ? `<text x="${x - 20}" y="${y + 26}" class="ink" style="font:500 9px var(--f-mono)">${lab}</text>` : ''}</g>`;
  K.sv = (sim, key) => { const r = (sim.specimen || []).find(x => String(x[0]).includes(key)); return r ? r[1] + (r[2] ? ' ' + r[2] : '') : ''; };

  /* ---------------- numerical-problem helpers ---------------- */
  K.R = (r, a, b, d = 0) => +(a + (b - a) * r()).toFixed(d);
  K.P = (r, a) => a[Math.floor(r() * a.length)];
  const sup = t => t.replace(/[-0-9]/g, c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
  K.s = (x, n = 4) => { if (!isFinite(x)) return String(x); const a = Math.abs(x); return a !== 0 && (a >= 1e5 || a < 1e-3) ? x.toExponential(n - 1).replace(/e([+-])(\d+)/, (m, sg, e) => ' × 10' + sup((sg === '-' ? '-' : '') + e)) : String(+x.toPrecision(n)); };

  /* ---------------- P: property data ---------------- */
  const P = (LAB.P = {});
  const tab = (T, rows) => { const xs = rows.map(r => r[0]); return rows[0].slice(1).map((_, j) => U.interp(xs, rows.map(r => r[j + 1]), T)); };
  /* Air at 1 atm (Incropera, Table A.4). T K: ρ kg/m³, cp kJ/kg·K, μ×10⁷ N·s/m², ν×10⁶ m²/s, k×10³ W/m·K, α×10⁶ m²/s, Pr */
  const AIR = [[250, 1.3947, 1.006, 159.6, 11.44, 22.3, 15.9, 0.720], [300, 1.1614, 1.007, 184.6, 15.89, 26.3, 22.5, 0.707], [350, 0.9950, 1.009, 208.2, 20.92, 30.0, 29.9, 0.700], [400, 0.8711, 1.014, 230.1, 26.41, 33.8, 38.3, 0.690], [450, 0.7740, 1.021, 250.7, 32.39, 37.3, 47.2, 0.686], [500, 0.6964, 1.030, 270.1, 38.79, 40.7, 56.7, 0.684], [550, 0.6329, 1.040, 288.4, 45.57, 43.9, 66.7, 0.683], [600, 0.5804, 1.051, 305.8, 52.69, 46.9, 76.9, 0.685], [700, 0.4975, 1.075, 338.8, 68.10, 52.4, 98.0, 0.695], [800, 0.4354, 1.099, 369.8, 84.93, 57.3, 120, 0.709], [900, 0.3868, 1.121, 398.1, 102.9, 62.0, 143, 0.720], [1000, 0.3482, 1.141, 424.4, 121.9, 66.7, 168, 0.726]];
  P.air = function (Tc) { const T = Tc + 273.15; const [rho, cp, mu, nu, k, al, Pr] = tab(T, AIR); return { T: Tc, rho, cp: cp * 1000, mu: mu * 1e-7, nu: nu * 1e-6, k: k * 1e-3, alpha: al * 1e-6, Pr, beta: 1 / T }; };
  P.AIR = AIR;
  /* Saturated water (Incropera, Table A.6). T K: p bar, vf×10³, vg m³/kg, hfg kJ/kg, cpf, cpg kJ/kg·K, μf×10⁶, μg×10⁶ N·s/m², kf×10³, kg×10³ W/m·K, Prf, Prg, σ×10³ N/m, βf×10⁶ 1/K */
  const WAT = [[273.15, 0.00611, 1.000, 206.3, 2502, 4.217, 1.854, 1750, 8.02, 569, 18.2, 12.99, 0.815, 75.5, -68.05], [280, 0.00990, 1.000, 130.4, 2485, 4.198, 1.858, 1422, 8.29, 582, 18.6, 10.26, 0.825, 74.8, 46.04], [290, 0.01917, 1.001, 69.7, 2461, 4.184, 1.864, 1080, 8.69, 598, 19.1, 7.56, 0.841, 73.7, 174.0], [300, 0.03531, 1.003, 39.13, 2438, 4.179, 1.872, 855, 9.09, 613, 19.6, 5.83, 0.857, 71.7, 276.1], [310, 0.06221, 1.007, 22.93, 2414, 4.178, 1.882, 695, 9.49, 628, 20.4, 4.62, 0.873, 70.0, 361.9], [320, 0.1053, 1.011, 13.98, 2390, 4.180, 1.895, 577, 9.89, 640, 21.0, 3.77, 0.894, 68.3, 436.7], [330, 0.1719, 1.016, 8.82, 2366, 4.184, 1.911, 489, 10.29, 650, 21.7, 3.15, 0.908, 66.6, 504.0], [340, 0.2713, 1.021, 5.74, 2342, 4.188, 1.930, 420, 10.69, 660, 22.3, 2.66, 0.925, 64.9, 566.0], [350, 0.4163, 1.027, 3.846, 2317, 4.195, 1.954, 365, 11.09, 668, 23.0, 2.29, 0.942, 63.2, 624.2], [360, 0.6209, 1.034, 2.645, 2291, 4.203, 1.983, 324, 11.49, 674, 23.7, 2.02, 0.960, 61.4, 697.9], [370, 0.9040, 1.041, 1.861, 2265, 4.214, 2.017, 289, 11.89, 679, 24.5, 1.80, 0.978, 59.5, 728.7], [373.15, 1.0133, 1.044, 1.679, 2257, 4.217, 2.029, 279, 12.02, 680, 24.8, 1.76, 0.984, 58.9, 750.1], [380, 1.2869, 1.049, 1.337, 2239, 4.226, 2.057, 260, 12.29, 683, 25.4, 1.61, 0.999, 57.6, 788], [390, 1.794, 1.058, 0.980, 2212, 4.239, 2.104, 237, 12.69, 686, 26.3, 1.47, 1.013, 55.6, 841], [400, 2.455, 1.067, 0.731, 2183, 4.256, 2.158, 217, 13.05, 688, 27.2, 1.34, 1.033, 53.6, 896], [420, 4.37, 1.088, 0.425, 2123, 4.302, 2.291, 185, 13.79, 688, 29.2, 1.16, 1.080, 49.5, 1010], [450, 9.32, 1.123, 0.208, 2024, 4.40, 2.56, 152, 14.85, 678, 33.1, 0.99, 1.14, 42.9, 1150]];
  P.water = function (Tc) { const T = Tc + 273.15; const [p, vf, vg, hfg, cpf, cpg, muf, mug, kf, kg, Prf, Prg, sg, bf] = tab(T, WAT);
    return { T: Tc, psat: p * 1e5, rho: 1000 / vf, rhov: 1 / vg, hfg: hfg * 1000, cp: cpf * 1000, cpv: cpg * 1000, mu: muf * 1e-6, muv: mug * 1e-6, k: kf * 1e-3, kv: kg * 1e-3, Pr: Prf, Prv: Prg, sigma: sg * 1e-3, beta: bf * 1e-6, nu: muf * 1e-6 * vf / 1000 }; };
  P.WAT = WAT;
  /* saturation temperature of water at pressure p (Pa) */
  P.tsat = p => { const T = WAT.map(r => r[0] - 273.15), pp = WAT.map(r => r[1] * 1e5); return U.interp(pp, T, p); };
  /* R134a saturated (ASHRAE reference, typical textbook table). T °C: p kPa, hf, hg kJ/kg, sf, sg kJ/kg·K */
  const R134 = [[-40, 51.25, 0.00, 225.86, 0.0000, 0.9687], [-30, 84.38, 12.59, 231.99, 0.0527, 0.9549], [-20, 132.82, 25.49, 238.41, 0.1055, 0.9456], [-10, 200.74, 38.55, 244.51, 0.1563, 0.9377], [0, 293.01, 51.25, 250.45, 0.2045, 0.9314], [10, 415.24, 65.43, 256.22, 0.2559, 0.9262], [20, 572.07, 79.32, 261.59, 0.3034, 0.9223], [30, 770.64, 93.58, 266.66, 0.3499, 0.9188], [40, 1017.1, 108.26, 271.27, 0.3958, 0.9157], [50, 1318.6, 123.49, 275.33, 0.4416, 0.9125], [60, 1681.8, 139.42, 278.47, 0.4887, 0.9085]];
  P.r134a = function (Tc) { const [p, hf, hg, sf, sg] = tab(Tc, R134); return { T: Tc, p, hf, hg, sf, sg }; };
  P.r134aT = pk => U.interp(R134.map(r => r[1]), R134.map(r => r[0]), pk); // saturation T (°C) at p (kPa)
  /* superheated R134a vapour, ideal-gas-like departure from saturation with cp ≈ 1.0–1.15 kJ/kg·K (teaching approximation) */
  P.r134aCpv = Tsat => 0.90 + 0.0045 * (Tsat + 20);
  P.r134aSup = (pk, Tc) => { const Ts = P.r134aT(pk), s = P.r134a(Ts), cp = P.r134aCpv(Ts); return { Tsat: Ts, h: s.hg + cp * (Tc - Ts), s: s.sg + cp * Math.log((Tc + 273.15) / (Ts + 273.15)) }; };
  P.r134aIsenT = (pk, s1) => { const Ts = P.r134aT(pk), sg = P.r134a(Ts).sg, cp = P.r134aCpv(Ts); return (Ts + 273.15) * Math.exp((s1 - sg) / cp) - 273.15; };
  P.R134 = R134;
  /* Solids near room temperature: k W/m·K, ρ kg/m³, c J/kg·K (Incropera Table A.1 / ASM) */
  P.SOLID = {
    cu: { name: 'Copper (pure)', k: 398, rho: 8933, c: 385, kT: -0.00011 }, al: { name: 'Aluminium (pure)', k: 237, rho: 2702, c: 903, kT: 0.0001 }, al6061: { name: 'Aluminium alloy 6061-T6', k: 167, rho: 2700, c: 896, kT: 0.0004 },
    brass: { name: 'Brass CuZn30 (cartridge)', k: 110, rho: 8530, c: 380, kT: 0.0012 }, ms: { name: 'Mild steel (AISI 1010)', k: 63.9, rho: 7832, c: 434, kT: -0.0012 }, ss304: { name: 'Stainless steel AISI 304', k: 14.9, rho: 7900, c: 477, kT: 0.0011 },
    inconel600: { name: 'Inconel 600', k: 14.9, rho: 8415, c: 444, kT: 0.0016 }
  };
  P.kAt = (m, Tc) => m.k * (1 + (m.kT || 0) * (Tc - 27));
})();
