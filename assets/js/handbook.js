/* Heat Transfer Handbook (#handbook): a complete heat and mass transfer data book for students.
   Computed tables and chart curves come from assets/js/hbdata.js (tools/handbook/gen.py, CoolProp + analytical solutions).
   Hand-compiled tables (solids, emissivities, correlation constants, fouling factors) are below, each with its source. */
(function () {
  const LAB = window.LAB, H = LAB.HB, U = LAB.U, $ = s => document.querySelector(s);
  const EXT = LAB.ext || (LAB.ext = {});
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = v => v === null || v === undefined || v === '' ? '—' : (typeof v === 'number' ? (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(3).replace('e', '×10^').replace(/\^\+?(-?\d+)/, (m, e) => '<sup>' + e + '</sup>') : String(v)) : v);
  let uid = 0;

  /* ------------------------------------------------------------------ building blocks */
  const tab = (cols, rows, o = {}) => `<div class="tbl-wrap hbtw"><table class="t hbt${o.cls ? ' ' + o.cls : ''}">${o.cap ? `<caption>${o.cap}</caption>` : ''}<thead><tr>${cols.map((c, i) => `<th class="${(o.text || [0]).includes(i) ? '' : 'n'}">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${(o.text || [0]).includes(i) ? '' : 'n'}">${fmt(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  // a computed table with an interpolating look-up on its first column
  const look = (t, o = {}) => {
    const id = 'lk' + (++uid);
    LOOK[id] = t;
    const k0 = t.cols[0].replace(/<[^>]+>/g, '');
    return `${o.title ? `<h4 class="hbh4">${o.title}</h4>` : ''}${t.src || o.src ? `<p class="hbsrc">Source: ${o.src || t.src}</p>` : ''}
      <div class="hblook no-print"><label for="${id}">Look up at ${esc(k0)}</label><input type="number" step="any" id="${id}" data-look="${id}" placeholder="type a value"><span class="muted hblr" id="${id}r"></span></div>
      <div id="${id}o"></div>${tab(t.cols, t.rows, { text: o.text || (typeof t.rows[0][0] === 'string' ? [0] : []) })}`;
  };
  const LOOK = {};
  function doLook(inp) {
    const t = LOOK[inp.dataset.look], x = parseFloat(inp.value), out = $('#' + inp.dataset.look + 'o'), msg = $('#' + inp.dataset.look + 'r');
    if (!isFinite(x)) { out.innerHTML = ''; msg.textContent = ''; return; }
    const rows = t.rows.filter(r => typeof r[0] === 'number');
    const lo = rows[0][0], hi = rows[rows.length - 1][0];
    if (x < Math.min(lo, hi) || x > Math.max(lo, hi)) { out.innerHTML = ''; msg.textContent = `outside the table (${lo} to ${hi})`; return; }
    let i = rows.findIndex((r, j) => j < rows.length - 1 && (x - r[0]) * (x - rows[j + 1][0]) <= 0); if (i < 0) i = rows.length - 2;
    const a = rows[i], b = rows[i + 1], f = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
    const row = a.map((v, j) => {
      if (j === 0) return x; const w = b[j];
      if (typeof v !== 'number' || typeof w !== 'number') return f < 0.5 ? v : w;
      const y = v > 0 && w > 0 && Math.max(v, w) / Math.min(v, w) > 1.5 ? Math.exp(Math.log(v) + f * (Math.log(w) - Math.log(v))) : v + f * (w - v);
      return +y.toPrecision(4);
    });
    msg.textContent = `interpolated between ${a[0]} and ${b[0]}`;
    out.innerHTML = tab(t.cols, [row], { cls: 'hbhit', text: [] });
  }
  const eqs = rows => `<div class="tbl-wrap hbtw"><table class="t hbeqt"><thead><tr><th>Case</th><th>Relation</th><th>Validity / notes</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td class="hbeq">${r[1]}</td><td>${r[2] || ''}</td></tr>`).join('')}</tbody></table></div>`;
  const note = s => `<p class="hbnote">${s}</p>`;
  const h3 = (s, id) => `<h3 class="hbh3"${id ? ` id="${id}"` : ''}>${s}</h3>`;
  const fr = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;

  /* ------------------------------------------------------------------ SVG chart */
  function chart(o) {
    const W = 680, Hh = o.h || 440, ml = 62, mr = o.mr || 64, mt = 20, mb = 50, pw = W - ml - mr, ph = Hh - mt - mb;
    const tx = o.xlog ? v => ml + (Math.log10(v) - Math.log10(o.x[0])) / (Math.log10(o.x[1]) - Math.log10(o.x[0])) * pw : v => ml + (v - o.x[0]) / (o.x[1] - o.x[0]) * pw;
    const ty = o.ylog ? v => mt + ph - (Math.log10(v) - Math.log10(o.y[0])) / (Math.log10(o.y[1]) - Math.log10(o.y[0])) * ph : v => mt + ph - (v - o.y[0]) / (o.y[1] - o.y[0]) * ph;
    const ticks = (r, log, step) => {
      const out = [];
      if (log) { for (let e = Math.floor(Math.log10(r[0])); e <= Math.ceil(Math.log10(r[1])); e++) for (let m = 1; m < 10; m++) { const v = m * 10 ** e; if (v >= r[0] * 0.999 && v <= r[1] * 1.001) out.push([v, m === 1 || (o.minorLab && [2, 5].includes(m))]); } }
      else { const s = step || niceStep(r[1] - r[0]); for (let v = Math.ceil(r[0] / s - 1e-9) * s; v <= r[1] + s * 1e-6; v += s) out.push([+v.toPrecision(10), true]); }
      return out;
    };
    const lab = v => { if (Math.abs(v) >= 1e4 || (Math.abs(v) < 0.0095 && v !== 0)) { const e = Math.floor(Math.log10(Math.abs(v)) + 1e-9); const m = v / 10 ** e; return (Math.abs(m - 1) < 1e-6 ? '' : U.f(m, 0) + '×') + '10<tspan dy="-5" font-size="9">' + e + '</tspan>'; } return String(+v.toPrecision(6)); };
    let g = '';
    ticks(o.x, o.xlog, o.xstep).forEach(([v, major]) => { const X = tx(v); g += `<line x1="${X}" y1="${mt}" x2="${X}" y2="${mt + ph}" class="${major ? 'gmaj' : 'gmin'}"/>`; if (major) g += `<text x="${X}" y="${mt + ph + 16}" text-anchor="middle">${lab(v)}</text>`; });
    ticks(o.y, o.ylog, o.ystep).forEach(([v, major]) => { const Y = ty(v); g += `<line x1="${ml}" y1="${Y}" x2="${ml + pw}" y2="${Y}" class="${major ? 'gmaj' : 'gmin'}"/>`; if (major) g += `<text x="${ml - 6}" y="${Y + 4}" text-anchor="end">${lab(v)}</text>`; });
    let c = '';
    (o.curves || []).forEach((cv, i) => {
      const pts = cv.pts.filter(p => p[0] >= o.x[0] && p[0] <= o.x[1] && p[1] >= o.y[0] && p[1] <= o.y[1] && (!o.xlog || p[0] > 0) && (!o.ylog || p[1] > 0));
      if (pts.length < 2) return;
      c += `<path d="${pts.map((p, j) => (j ? 'L' : 'M') + tx(p[0]).toFixed(1) + ' ' + ty(p[1]).toFixed(1)).join('')}" class="cv${cv.cls ? ' ' + cv.cls : ''}${i % 2 && o.alt ? ' cvb' : ''}"/>`;
      if (cv.label !== undefined && o.labels !== false) {
        const at = o.labAt ? o.labAt(pts, cv, i) : pts[pts.length - 1];
        if (at) c += `<text x="${(tx(at[0]) + (o.labDx || 3)).toFixed(1)}" y="${(ty(at[1]) + (o.labDy || 3)).toFixed(1)}" class="cl">${cv.label}</text>`;
      }
    });
    const id = 'ch' + (++uid);
    CH[id] = { tx, ty, o, ml, mt, pw, ph };
    return `<figure class="hbfig"><svg viewBox="0 0 ${W} ${Hh}" class="hbsvg" id="${id}" role="img" aria-label="${esc(o.title || '')}">
      <rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" class="pf"/>${g}<g class="cvs">${c}</g>
      <rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" class="fr0"/>
      <text x="${ml + pw / 2}" y="${Hh - 10}" text-anchor="middle" class="al">${o.xl}</text>
      <text transform="translate(16 ${mt + ph / 2}) rotate(-90)" text-anchor="middle" class="al">${o.yl}</text>
      ${o.key ? `<text x="${ml + pw + 4}" y="${mt - 6}" class="cl ck">${o.key}</text>` : ''}
      <g class="xh" visibility="hidden"><line class="xhl" y1="${mt}" y2="${mt + ph}"/><line class="xhl" x1="${ml}" x2="${ml + pw}"/><rect class="xhb" width="150" height="20" rx="3"/><text class="xht"></text></g></svg>
      <figcaption><b>${o.title}</b>${o.cap ? ' ' + o.cap : ''}</figcaption></figure>`;
  }
  const CH = {};
  function niceStep(span) { const r = span / 8, p = 10 ** Math.floor(Math.log10(r)), m = r / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }
  function bindCharts(root) {
    root.querySelectorAll('svg.hbsvg').forEach(svg => {
      const C = CH[svg.id]; if (!C) return; const xh = svg.querySelector('.xh'), t = xh.querySelector('.xht'), b = xh.querySelector('.xhb'), [lv, lh] = xh.querySelectorAll('.xhl');
      const inv = (X, Y) => { const fx = (X - C.ml) / C.pw, fy = (C.mt + C.ph - Y) / C.ph, o = C.o;
        const x = o.xlog ? 10 ** (Math.log10(o.x[0]) + fx * (Math.log10(o.x[1]) - Math.log10(o.x[0]))) : o.x[0] + fx * (o.x[1] - o.x[0]);
        const y = o.ylog ? 10 ** (Math.log10(o.y[0]) + fy * (Math.log10(o.y[1]) - Math.log10(o.y[0]))) : o.y[0] + fy * (o.y[1] - o.y[0]); return [x, y]; };
      svg.addEventListener('pointermove', ev => {
        const r = svg.getBoundingClientRect(), X = (ev.clientX - r.left) / r.width * svg.viewBox.baseVal.width, Y = (ev.clientY - r.top) / r.height * svg.viewBox.baseVal.height;
        if (X < C.ml || X > C.ml + C.pw || Y < C.mt || Y > C.mt + C.ph) { xh.setAttribute('visibility', 'hidden'); return; }
        const [x, y] = inv(X, Y); xh.setAttribute('visibility', 'visible');
        lv.setAttribute('x1', X); lv.setAttribute('x2', X); lh.setAttribute('y1', Y); lh.setAttribute('y2', Y);
        t.textContent = `${C.o.xs || 'x'} = ${U.sig(x, 3)},  ${C.o.ys || 'y'} = ${U.sig(y, 3)}`;
        const bx = X + 158 > C.ml + C.pw ? X - 158 : X + 8, by = Y - 26 < C.mt ? Y + 8 : Y - 26;
        b.setAttribute('x', bx); b.setAttribute('y', by); t.setAttribute('x', bx + 6); t.setAttribute('y', by + 14);
      });
      svg.addEventListener('pointerleave', () => xh.setAttribute('visibility', 'hidden'));
    });
  }

  /* ------------------------------------------------------------------ hand-compiled data */
  // Metals: [name, ρ, cp, k at 300 K, k at 100, 200, 400, 600, 800, 1000, 1200 K]. Thermophysical Properties Research Center (TPRC) data
  // as tabulated by Incropera et al., Fundamentals of Heat and Mass Transfer, Table A.1; Inconel 600, Ti-6Al-4V, 6061-T6, grey cast iron: producer data sheets.
  const METALS = [
    ['Aluminium, pure', 2702, 903, 237, 302, 237, 240, 231, 218], ['Aluminium alloy 2024-T6 (4.5 Cu, 1.5 Mg, 0.6 Mn)', 2770, 875, 177, 65, 163, 186, 186],
    ['Aluminium alloy 6061-T6', 2700, 896, 167], ['Aluminium alloy 195, cast (4.5 Cu)', 2790, 883, 168, null, null, 174, 185],
    ['Chromium', 7160, 449, 93.7, 159, 111, 90.9, 80.7, 71.3, 65.4, 61.9], ['Copper, pure', 8933, 385, 401, 482, 413, 393, 379, 366, 352, 339],
    ['Commercial bronze (90 Cu, 10 Al)', 8800, 420, 52, 42, 52, 59], ['Phosphor gear bronze (89 Cu, 11 Sn)', 8780, 355, 54, 41, 65, 74],
    ['Cartridge brass (70 Cu, 30 Zn)', 8530, 380, 110, 75, 95, 137, 149], ['Constantan (55 Cu, 45 Ni)', 8920, 384, 23, 17, 19],
    ['Gold', 19300, 129, 317, 327, 323, 311, 298, 284, 270, 255], ['Iron, pure', 7870, 447, 80.2, 134, 94.0, 69.5, 54.7, 43.3, 32.8, 28.3],
    ['Armco iron (99.75 % pure)', 7870, 447, 72.7, 95.6, 80.6, 65.7, 53.1, 42.2, 32.3, 28.7], ['Grey cast iron (typical)', 7200, 420, 52],
    ['Plain carbon steel (Mn ≤ 1 %, Si ≤ 0.1 %)', 7854, 434, 60.5, null, null, 56.7, 48.0, 39.2, 30.0], ['AISI 1010 steel', 7832, 434, 63.9, null, null, 58.7, 48.8, 39.2, 31.3],
    ['Carbon–silicon steel (Mn ≤ 1 %, 0.1 < Si ≤ 0.6 %)', 7817, 446, 51.9, null, null, 49.8, 44.0, 37.4, 29.3],
    ['AISI 302 stainless steel', 8055, 480, 15.1, null, null, 17.3, 20.0, 22.8, 25.4], ['AISI 304 stainless steel', 7900, 477, 14.9, 9.2, 12.6, 16.6, 19.8, 22.6, 25.4, 28.0],
    ['AISI 316 stainless steel', 8238, 468, 13.4, null, null, 15.2, 18.3, 21.3, 24.2], ['AISI 347 stainless steel', 7978, 480, 14.2, null, null, 15.8, 18.9, 21.9, 24.7],
    ['Inconel 600', 8415, 444, 14.9, null, null, 16.2, 19.6, 23.0, 26.4], ['Inconel X-750', 8510, 439, 11.7, 8.7, 10.3, 13.5, 17.0, 20.5, 24.0, 27.6],
    ['Lead', 11340, 129, 35.3, 39.7, 36.7, 34.0, 31.4], ['Magnesium', 1740, 1024, 156, 169, 159, 153, 149, 146],
    ['Molybdenum', 10240, 251, 138, 179, 143, 134, 126, 118, 112, 105], ['Nickel, pure', 8900, 444, 90.7, 164, 107, 80.2, 65.6, 67.6, 71.8, 76.2],
    ['Nichrome (80 Ni, 20 Cr)', 8400, 420, 12, null, null, 14, 16, 21], ['Platinum', 21450, 133, 71.6, 77.5, 72.6, 71.8, 73.2, 75.6, 78.7, 82.6],
    ['Silver', 10500, 235, 429, 444, 430, 425, 412, 396, 379, 361], ['Tin', 7310, 227, 66.6, 85.2, 73.3, 62.2],
    ['Titanium', 4500, 522, 21.9, 30.5, 24.5, 20.4, 19.4, 19.7, 20.7, 22.0], ['Titanium alloy Ti-6Al-4V', 4430, 526, 6.7],
    ['Tungsten', 19300, 132, 174, 208, 186, 159, 137, 125, 118, 113], ['Zinc', 7140, 389, 116, 117, 118, 111, 103],
  ];
  // Non-metallic solids at about 300 K [name, ρ, cp, k]. Incropera Table A.2; Kothandaraman & Subramanyan; Çengel Table A-3/A-5.
  const NONMET = [
    ['Aluminium oxide, sapphire', 3970, 765, 46], ['Aluminium oxide, polycrystalline', 3970, 765, 36.0], ['Beryllium oxide', 3000, 1030, 272],
    ['Carbon, amorphous', 1950, null, 1.60], ['Diamond, type IIa', 3500, 509, 2300], ['Graphite, pyrolytic: along layers', 2210, 709, 1950], ['Graphite, pyrolytic: across layers', 2210, 709, 5.70],
    ['Pyroceram', 2600, 808, 3.98], ['Silicon', 2330, 712, 148], ['Silicon carbide', 3160, 675, 490], ['Silicon dioxide, crystalline (quartz) ∥ c-axis', 2650, 745, 10.4],
    ['Silicon dioxide, crystalline (quartz) ⊥ c-axis', 2650, 745, 6.21], ['Silicon dioxide, fused (glass)', 2220, 745, 1.38], ['Silicon nitride', 2400, 691, 16.0],
    ['Titanium dioxide, polycrystalline', 4157, 710, 8.4], ['Glass, plate (soda lime)', 2500, 750, 1.4], ['Glass, borosilicate (Pyrex)', 2225, 835, 1.4],
    ['PTFE (Teflon)', 2200, 1050, 0.35], ['Nylon', 1140, 1670, 0.25], ['Polyethylene, high density', 950, 1900, 0.45], ['PVC, rigid', 1400, 900, 0.16],
    ['Epoxy, unfilled', 1200, 1100, 0.20], ['Rubber, soft', 1100, 2010, 0.13], ['Rubber, hard (ebonite)', 1190, null, 0.16], ['Paper', 930, 1340, 0.18],
    ['Paraffin wax', 900, 2890, 0.24], ['Leather, sole', 998, null, 0.159], ['Ice (273 K)', 920, 2040, 1.88], ['Mica', 2900, 880, 0.52],
  ];
  // Building materials [name, ρ, cp, k] at about 300 K. Incropera Table A.3 (ASHRAE data); Kothandaraman & Subramanyan.
  const BUILD = [
    ['Common brick', 1920, 835, 0.72], ['Face brick', 2083, null, 1.3], ['Fireclay brick, burnt (at 478 K)', 2050, 960, 1.0], ['Concrete, stone mix', 2300, 880, 1.4],
    ['Concrete, lightweight aggregate', 1600, 840, 0.52], ['Cement mortar', 1860, 780, 0.72], ['Plaster, gypsum (sand aggregate)', 1680, 1085, 0.22],
    ['Gypsum board', 800, 1090, 0.17], ['Hardwood (oak, maple)', 720, 1255, 0.16], ['Softwood (fir, pine)', 510, 1380, 0.12], ['Plywood', 545, 1215, 0.12],
    ['Particle board, high density', 1000, 1300, 0.170], ['Hardboard, siding', 640, 1170, 0.094], ['Asbestos-cement board', 1920, null, 0.58],
    ['Granite', 2630, 775, 2.79], ['Marble', 2680, 830, 2.80], ['Limestone', 2320, 810, 2.15], ['Sandstone', 2150, 745, 2.90],
    ['Clay (moist)', 1460, 880, 1.3], ['Soil, typical', 2050, 1840, 0.52], ['Sand, dry', 1515, 800, 0.27], ['Roofing felt', 1120, null, 0.19], ['Snow, fresh', 110, null, 0.049], ['Snow, compacted', 500, null, 0.190],
  ];
  // Insulation [name, ρ, k, max service temp °C, k at elevated T where known]. Incropera Table A.3; ASHRAE Handbook; manufacturer ranges. Values near 300 K unless stated.
  const INSUL = [
    ['Glass fibre blanket', 16, 0.046, 230], ['Glass fibre blanket', 28, 0.038, 230], ['Glass fibre blanket', 40, 0.035, 230], ['Glass fibre, duct liner', 32, 0.038, 120],
    ['Mineral (rock) wool slab', 120, 0.040, 650], ['Ceramic fibre blanket (alumina–silica)', 128, 0.050, 1260, 'about 0.12 at 600 °C, 0.22 at 1000 °C'],
    ['Calcium silicate block', 220, 0.055, 650, 'about 0.08 at 300 °C'], ['85 % magnesia', 185, 0.052, 315, 'about 0.071 at 100 °C'],
    ['Diatomaceous silica', 350, 0.06, 870, 'about 0.10 at 500 °C'], ['Expanded perlite, loose fill', 105, 0.053, 650], ['Vermiculite, exfoliated, loose fill', 80, 0.068, 760],
    ['Expanded polystyrene, moulded beads', 16, 0.040, 75], ['Extruded polystyrene', 55, 0.027, 75], ['Polyurethane foam, rigid', 70, 0.026, 110], ['Polyisocyanurate board', 32, 0.023, 120],
    ['Phenolic foam', 40, 0.022, 120], ['Cellular glass', 145, 0.058, 430], ['Cork board', 120, 0.039, 100], ['Sawdust', 200, 0.07, 80], ['Cotton', 80, 0.06, 90],
    ['Silica aerogel blanket', 150, 0.015, 650], ['Air layer, still (no convection)', 1.16, 0.026, null],
  ];
  // Engine oil (unused), ethylene glycol, glycerine, mercury: Incropera Tables A.5, A.7 (after TPRC). [T K, ρ, cp kJ/kgK, μ·10² N s/m², ν·10⁶, k·10³, α·10⁷, Pr, β·10³]
  const OIL = [[273.15, 899.1, 1.796, 385, 4280, 147, 0.910, 47000, 0.70], [280, 895.3, 1.827, 217, 2430, 144, 0.880, 27500, 0.70], [290, 890.0, 1.868, 99.9, 1120, 145, 0.872, 12900, 0.70],
    [300, 884.1, 1.909, 48.6, 550, 145, 0.859, 6400, 0.70], [310, 877.9, 1.951, 25.3, 288, 145, 0.847, 3400, 0.70], [320, 871.8, 1.993, 14.1, 161, 143, 0.823, 1965, 0.70],
    [330, 865.8, 2.035, 8.36, 96.6, 141, 0.800, 1205, 0.70], [340, 859.9, 2.076, 5.31, 61.7, 139, 0.779, 793, 0.70], [350, 853.9, 2.118, 3.56, 41.7, 138, 0.763, 546, 0.70],
    [360, 847.8, 2.161, 2.52, 29.7, 138, 0.753, 395, 0.70], [370, 841.8, 2.206, 1.86, 22.0, 137, 0.738, 300, 0.70], [380, 836.0, 2.250, 1.41, 16.9, 136, 0.723, 233, 0.70],
    [390, 830.6, 2.294, 1.10, 13.3, 135, 0.709, 187, 0.70], [400, 825.1, 2.337, 0.874, 10.6, 134, 0.695, 152, 0.70], [410, 818.9, 2.381, 0.698, 8.52, 133, 0.682, 125, 0.70],
    [420, 812.1, 2.427, 0.564, 6.94, 133, 0.675, 103, 0.70], [430, 806.5, 2.471, 0.470, 5.83, 132, 0.662, 88, 0.70]];
  const EG = [[273.15, 1130.8, 2.294, 6.51, 57.6, 242, 0.933, 617, 0.65], [280, 1125.8, 2.323, 4.20, 37.3, 244, 0.933, 400, 0.65], [290, 1118.8, 2.368, 2.47, 22.1, 248, 0.936, 236, 0.65],
    [300, 1114.4, 2.415, 1.57, 14.1, 252, 0.939, 151, 0.65], [310, 1103.7, 2.460, 1.07, 9.65, 255, 0.939, 103, 0.65], [320, 1096.2, 2.505, 0.757, 6.91, 258, 0.940, 73.5, 0.65],
    [330, 1089.5, 2.549, 0.561, 5.15, 260, 0.936, 55.0, 0.65], [340, 1083.8, 2.592, 0.431, 3.98, 261, 0.929, 42.8, 0.65], [350, 1079.0, 2.637, 0.342, 3.17, 261, 0.917, 34.6, 0.65],
    [360, 1074.0, 2.682, 0.278, 2.59, 261, 0.906, 28.6, 0.65], [370, 1066.7, 2.728, 0.228, 2.14, 262, 0.900, 23.7, 0.65], [373, 1058.5, 2.742, 0.215, 2.03, 263, 0.906, 22.4, 0.65]];
  const GLY = [[273.15, 1276.0, 2.261, 1060, 8310, 282, 0.977, 85000, 0.47], [280, 1271.9, 2.298, 534, 4200, 284, 0.972, 43200, 0.47], [290, 1265.8, 2.367, 185, 1460, 286, 0.955, 15300, 0.48],
    [300, 1259.9, 2.427, 79.9, 634, 286, 0.935, 6780, 0.48], [310, 1253.9, 2.490, 35.2, 281, 286, 0.916, 3060, 0.49], [320, 1247.2, 2.564, 21.0, 168, 287, 0.897, 1870, 0.50]];
  const LCOL2 = ['T (K)', 'ρ (kg/m³)', 'c<sub>p</sub> (kJ/kg·K)', 'μ·10² (N·s/m²)', 'ν·10⁶ (m²/s)', 'k·10³ (W/m·K)', 'α·10⁷ (m²/s)', 'Pr', 'β·10³ (1/K)'];
  const HG = [[273.15, 13595, 0.1404, 1.240, 8.180, 0.4285, 0.0290], [300, 13529, 0.1393, 1.125, 8.540, 0.4530, 0.0248], [350, 13407, 0.1377, 0.9601, 9.180, 0.4975, 0.0193],
    [400, 13287, 0.1365, 0.8580, 9.800, 0.5405, 0.0159], [450, 13167, 0.1357, 0.8018, 10.40, 0.5810, 0.0138], [500, 13048, 0.1353, 0.7529, 10.95, 0.6190, 0.0122],
    [550, 12929, 0.1352, 0.7140, 11.45, 0.6555, 0.0109], [600, 12809, 0.1355, 0.6860, 11.95, 0.6888, 0.0100]];
  // Emissivity: total hemispherical or normal. Incropera Table A.11; Çengel Table A-18; Modest; Siegel & Howell. Ranges reflect surface condition.
  const EMIS = [
    ['Aluminium, highly polished', '300–900', '0.04–0.06'], ['Aluminium, commercial sheet', '300', '0.09'], ['Aluminium, heavily oxidised', '400–800', '0.20–0.33'], ['Aluminium, anodised', '300', '0.82'],
    ['Brass, highly polished', '500–650', '0.03–0.04'], ['Brass, polished', '300', '0.09'], ['Brass, oxidised', '450–800', '0.60'], ['Chromium, polished', '300–1400', '0.08–0.40'],
    ['Copper, highly polished', '300', '0.02–0.03'], ['Copper, polished', '300–600', '0.04–0.05'], ['Copper, commercial sheet', '300', '0.15'], ['Copper, oxidised', '600–1000', '0.50–0.80'], ['Copper, black oxidised', '300', '0.78'],
    ['Gold, highly polished', '300–1000', '0.02–0.04'], ['Iron, polished', '300–500', '0.05–0.07'], ['Cast iron, oxidised', '500–900', '0.64–0.78'], ['Iron, rusted', '300', '0.61–0.85'],
    ['Steel, polished', '300–500', '0.07–0.10'], ['Steel, sheet, rolled', '300', '0.66'], ['Steel, heavily oxidised', '500–1000', '0.80–0.90'],
    ['Stainless steel, polished', '300–1000', '0.17–0.30'], ['Stainless steel, lightly oxidised', '600–1000', '0.30–0.40'], ['Stainless steel, highly oxidised', '600–1000', '0.70–0.80'],
    ['Galvanised iron, new', '300', '0.13–0.23'], ['Lead, polished', '300–500', '0.06–0.08'], ['Lead, oxidised', '300–500', '0.63'], ['Nickel, polished', '500–1200', '0.07–0.17'], ['Nickel, oxidised', '450–1000', '0.37–0.57'],
    ['Platinum, polished', '500–1500', '0.06–0.18'], ['Silver, polished', '300–1000', '0.02–0.03'], ['Tungsten, filament', '1000–3000', '0.10–0.32'], ['Zinc, polished', '300–800', '0.02–0.05'],
    ['Alumina (Al₂O₃)', '800–1400', '0.65–0.45'], ['Asphalt pavement', '300', '0.85–0.93'], ['Brick, red', '300', '0.93–0.96'], ['Brick, fireclay', '1200', '0.75'], ['Carbon, lamp black', '300–500', '0.95–0.97'],
    ['Concrete', '300', '0.88–0.94'], ['Glass, window', '300', '0.90–0.95'], ['Glass, Pyrex', '300–1200', '0.82–0.62'], ['Ice', '273', '0.95–0.99'], ['Marble, white', '300', '0.95'],
    ['Paint, black lacquer / flat black', '300', '0.96–0.98'], ['Paint, white acrylic', '300', '0.90'], ['Paint, oil (all colours)', '300', '0.92–0.96'], ['Paint, aluminium', '300', '0.27–0.67'],
    ['Paper, white', '300', '0.90–0.97'], ['Plaster', '300', '0.91'], ['Rubber', '300', '0.93–0.95'], ['Sand', '300', '0.90'], ['Silicon carbide', '600–1500', '0.87–0.85'],
    ['Skin, human', '300', '0.95'], ['Snow', '273', '0.82–0.90'], ['Soil', '300', '0.93–0.96'], ['Teflon', '300–500', '0.85–0.92'], ['Water, deep', '273–373', '0.95–0.96'], ['Wood', '300', '0.82–0.92'],
  ];
  // Solar absorptivity and emissivity: Incropera Table A.12; Duffie & Beckman.
  const SOLAR = [['Aluminium, polished', 0.09, 0.03], ['Aluminium, anodised', 0.14, 0.84], ['Aluminium, foil', 0.15, 0.05], ['Brick, red', 0.63, 0.93], ['Concrete', 0.60, 0.88],
    ['Galvanised sheet metal, clean, new', 0.65, 0.13], ['Galvanised sheet metal, oxidised, weathered', 0.80, 0.28], ['Black chrome selective coating', 0.95, 0.10], ['Black nickel selective coating', 0.92, 0.08],
    ['Paint, black (Parsons)', 0.98, 0.98], ['Paint, white acrylic', 0.26, 0.90], ['Paint, white zinc oxide', 0.16, 0.93], ['Snow, fine particles, fresh', 0.13, 0.82], ['Ice, with sparse snow', 0.31, 0.96],
    ['Paper, white', 0.28, 0.95], ['Asphalt', 0.90, 0.88], ['Grass, green', 0.75, 0.94]];

  /* ------------------------------------------------------------------ JS maths for the calculators */
  function J0(x) { const ax = Math.abs(x); if (ax < 8) { const y = x * x; const a = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456))))); const b = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y)))); return a / b; } const z = 8 / ax, y = z * z, xx = ax - 0.785398164; const a = 1 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6))); const b = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7))); return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a - z * Math.sin(xx) * b); }
  function J1(x) { const ax = Math.abs(x); if (ax < 8) { const y = x * x; const a = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606)))))); const b = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y)))); return a / b; } const z = 8 / ax, y = z * z, xx = ax - 2.356194491; const a = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * (-0.240337019e-6)))); const b = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6))); const r = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a - z * Math.sin(xx) * b); return x < 0 ? -r : r; }
  const bisect = (f, a, b) => { let fa = f(a); for (let i = 0; i < 100; i++) { const m = (a + b) / 2, fm = f(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm; } } return (a + b) / 2; };
  function roots(geo, Bi, n) {
    const r = [];
    if (geo === 'wall') { for (let i = 0; i < n; i++) r.push(bisect(z => z * Math.sin(z) - Bi * Math.cos(z), i * Math.PI + 1e-12, i * Math.PI + Math.PI / 2 - 1e-12)); }
    else if (geo === 'sph') { for (let i = 0; i < n; i++) r.push(Bi === 1 ? (i + 0.5) * Math.PI : bisect(z => Math.sin(z) * (1 - Bi) - z * Math.cos(z), i * Math.PI + 1e-9, (i + 1) * Math.PI - 1e-9)); }
    else { const f = z => z * J1(z) - Bi * J0(z); let a = 1e-9, fa = f(a); for (let z = 0.02; r.length < n && z < 400; z += 0.02) { const fz = f(z); if (fa * fz < 0) r.push(bisect(f, z - 0.02, z)); a = z; fa = fz; } }
    return r;
  }
  function transient(geo, Bi, Fo, xr) {
    const zs = roots(geo, Bi, 50); let th = 0, Q = 0, th1 = 0, Q1 = 0;
    zs.forEach((z, i) => {
      let C, sh, qq;
      if (geo === 'wall') { C = 4 * Math.sin(z) / (2 * z + Math.sin(2 * z)); sh = Math.cos(z * xr); qq = Math.sin(z) / z; }
      else if (geo === 'cyl') { C = 2 / z * J1(z) / (J0(z) ** 2 + J1(z) ** 2); sh = J0(z * xr); qq = 2 * J1(z) / z; }
      else { C = 4 * (Math.sin(z) - z * Math.cos(z)) / (2 * z - Math.sin(2 * z)); sh = xr === 0 ? 1 : Math.sin(z * xr) / (z * xr); qq = 3 * (Math.sin(z) - z * Math.cos(z)) / z ** 3; }
      const e = Math.exp(-z * z * Fo); th += C * e * sh; Q += C * e * qq; if (i === 0) { th1 = C * e * sh; Q1 = C * e * qq; }
    });
    return { z1: zs[0], th, Q: 1 - Q, th1, Q1: 1 - Q1 };
  }
  const F0lt = lt => { const z = 14387.77 / lt; let s = 0; for (let n = 1; n < 80; n++) s += Math.exp(-n * z) / n * (z ** 3 + 3 * z * z / n + 6 * z / n ** 2 + 6 / n ** 3); return 15 / Math.PI ** 4 * s; };
  function epsNTU(kind, N, Cr) {
    if (Cr < 1e-9) return 1 - Math.exp(-N);
    switch (kind) {
      case 'parallel': return (1 - Math.exp(-N * (1 + Cr))) / (1 + Cr);
      case 'counter': return Math.abs(Cr - 1) < 1e-9 ? N / (1 + N) : (1 - Math.exp(-N * (1 - Cr))) / (1 - Cr * Math.exp(-N * (1 - Cr)));
      case 'shell1': { const s = Math.sqrt(1 + Cr * Cr); return 2 / (1 + Cr + s * (1 + Math.exp(-N * s)) / (1 - Math.exp(-N * s))); }
      case 'shell2': { const e1 = epsNTU('shell1', N / 2, Cr); if (Math.abs(Cr - 1) < 1e-9) return 2 * e1 / (1 + e1); const a = ((1 - e1 * Cr) / (1 - e1)) ** 2; return (a - 1) / (a - Cr); }
      case 'xunmixed': { let s = 0, fact = [1]; for (let k = 1; k < 120; k++) fact[k] = fact[k - 1] * k; for (let n = 0; n < 100; n++) { let a = 0, b = 0; for (let k = 0; k <= n; k++) { a += N ** k / fact[k]; b += (Cr * N) ** k / fact[k]; } s += (1 - a * Math.exp(-N)) * (1 - b * Math.exp(-Cr * N)); } return s / (Cr * N); }
      case 'xCmaxmixed': return (1 / Cr) * (1 - Math.exp(-Cr * (1 - Math.exp(-N))));
      case 'xCminmixed': return 1 - Math.exp(-(1 / Cr) * (1 - Math.exp(-Cr * N)));
    }
  }
  const vfPar = (X, Y) => 2 / (Math.PI * X * Y) * (Math.log(Math.sqrt((1 + X * X) * (1 + Y * Y) / (1 + X * X + Y * Y))) + X * Math.sqrt(1 + Y * Y) * Math.atan(X / Math.sqrt(1 + Y * Y)) + Y * Math.sqrt(1 + X * X) * Math.atan(Y / Math.sqrt(1 + X * X)) - X * Math.atan(X) - Y * Math.atan(Y));
  const vfPerp = (Hh, W) => { const t1 = W * Math.atan(1 / W) + Hh * Math.atan(1 / Hh) - Math.sqrt(Hh * Hh + W * W) * Math.atan(1 / Math.sqrt(Hh * Hh + W * W)); const a = (1 + W * W) * (1 + Hh * Hh) / (1 + W * W + Hh * Hh), b = (W * W * (1 + W * W + Hh * Hh) / ((1 + W * W) * (W * W + Hh * Hh))) ** (W * W), c = (Hh * Hh * (1 + Hh * Hh + W * W) / ((1 + Hh * Hh) * (Hh * Hh + W * W))) ** (Hh * Hh); return (t1 + 0.25 * Math.log(a * b * c)) / (Math.PI * W); };
  const vfDisc = (Ri, Rj) => { const S = 1 + (1 + Rj * Rj) / (Ri * Ri); return 0.5 * (S - Math.sqrt(S * S - 4 * (Rj / Ri) ** 2)); };

  const calc = (id, title, inputs, outId) => `<div class="panel hbcalc no-print" data-calc="${id}"><div class="panel-h"><h4>${title}</h4><span class="eyebrow">Calculator</span></div>
    <div class="hbci">${inputs.map(i => i[2] === 'sel' ? `<label><span>${i[1]}</span><select data-k="${i[0]}">${i[3].map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label>` : `<label><span>${i[1]}</span><input type="number" step="any" data-k="${i[0]}" value="${i[2]}"></label>`).join('')}</div><div class="hbco" id="${outId || id + 'o'}"></div></div>`;
  const CALC = {
    trans(v) {
      const r = transient(v.geo, +v.Bi, +v.Fo, +v.x); const L = { wall: 'x/L', cyl: 'r/r₀', sph: 'r/r₀' }[v.geo];
      return tab(['Quantity', 'Exact series (50 terms)', 'One-term'], [['ζ₁ (rad)', U.sig(r.z1, 5), U.sig(r.z1, 5)], [`θ/θ<sub>i</sub> = (T − T<sub>∞</sub>)/(T<sub>i</sub> − T<sub>∞</sub>) at ${L} = ${v.x}`, U.sig(r.th, 5), U.sig(r.th1, 5)], ['Q/Q₀ (energy fraction transferred)', U.sig(r.Q, 5), U.sig(r.Q1, 5)]], { text: [0] }) +
        `<p class="muted hbsmall">${+v.Fo < 0.2 ? 'Fo < 0.2: the one-term approximation is not reliable; use the exact value.' : 'Fo ≥ 0.2: one-term and exact results agree to within about 2 %.'} ${+v.Bi < 0.1 ? 'Bi < 0.1: lumped analysis is also acceptable, θ/θ<sub>i</sub> = exp(−Bi·Fo) with L<sub>c</sub> = V/A.' : ''}</p>`;
    },
    bbf(v) { const lt = +v.l * +v.T; const F = F0lt(lt); return tab(['λT (µm·K)', 'F<sub>0→λT</sub>', 'F<sub>λT→∞</sub>', 'E<sub>b</sub> = σT⁴ (W/m²)'], [[U.sig(lt, 5), U.sig(F, 5), U.sig(1 - F, 5), U.sig(5.670374e-8 * (+v.T) ** 4, 5)]], { text: [] }); },
    bband(v) { const F1 = F0lt(+v.l1 * +v.T), F2 = F0lt(+v.l2 * +v.T); return tab(['F<sub>0→λ₁T</sub>', 'F<sub>0→λ₂T</sub>', 'Fraction in band', 'Band emissive power (W/m²)'], [[U.sig(F1, 5), U.sig(F2, 5), U.sig(F2 - F1, 5), U.sig((F2 - F1) * 5.670374e-8 * (+v.T) ** 4, 5)]], { text: [] }); },
    entu(v) { const e = epsNTU(v.kind, +v.N, +v.Cr); return tab(['NTU', 'C<sub>r</sub> = C<sub>min</sub>/C<sub>max</sub>', 'Effectiveness ε'], [[v.N, v.Cr, U.sig(e, 5)]], { text: [] }); },
    vf(v) {
      const a = +v.a, b = +v.b, c = +v.c; let F, txt;
      if (v.kind === 'par') { F = vfPar(a / c, b / c); txt = `X = a/L = ${U.sig(a / c, 4)}, Y = b/L = ${U.sig(b / c, 4)}`; }
      else if (v.kind === 'perp') { F = vfPerp(b / a, c / a); txt = `H = Z/X = ${U.sig(b / a, 4)}, W = Y/X = ${U.sig(c / a, 4)} (common edge X = a; F from the base plate of width Y = c to the upright plate of height Z = b)`; }
      else { F = vfDisc(a / c, b / c); txt = `R<sub>i</sub> = r<sub>i</sub>/L = ${U.sig(a / c, 4)}, R<sub>j</sub> = r<sub>j</sub>/L = ${U.sig(b / c, 4)}`; }
      return `<p class="hbsmall">${txt}</p>` + tab(['F<sub>ij</sub>'], [[U.sig(F, 5)]], { text: [] });
    },
  };
  const CALCIN = {
    trans: [['geo', 'Geometry', 'sel', [['wall', 'Plane wall, half-thickness L'], ['cyl', 'Long cylinder, radius r₀'], ['sph', 'Sphere, radius r₀']]], ['Bi', 'Bi = hL/k or hr₀/k', 1], ['Fo', 'Fo = αt/L² or αt/r₀²', 0.5], ['x', 'Position x/L or r/r₀ (0 = centre)', 0]],
    bbf: [['l', 'Wavelength λ (µm)', 2], ['T', 'Temperature T (K)', 1500]],
    bband: [['l1', 'λ₁ (µm)', 0.4], ['l2', 'λ₂ (µm)', 0.7], ['T', 'Source temperature T (K)', 5800]],
    entu: [['kind', 'Exchanger', 'sel', [['counter', 'Counter flow'], ['parallel', 'Parallel flow'], ['shell1', '1 shell pass, 2, 4 … tube passes'], ['shell2', '2 shell passes, 4, 8 … tube passes'], ['xunmixed', 'Cross flow, both unmixed'], ['xCmaxmixed', 'Cross flow, Cmax mixed'], ['xCminmixed', 'Cross flow, Cmin mixed']]], ['N', 'NTU = UA/C<sub>min</sub>', 2], ['Cr', 'C<sub>r</sub>', 0.5]],
    vf: [['kind', 'Configuration', 'sel', [['par', 'Aligned parallel rectangles a × b, distance L'], ['perp', 'Perpendicular rectangles with a common edge'], ['disc', 'Coaxial parallel discs r_i, r_j, distance L']]], ['a', 'a (or common edge X, or r_i)', 1], ['b', 'b (or Z, or r_j)', 1], ['c', 'L (or Y, or L)', 1]],
  };
  const calcBlock = (id, title) => calc(id, title, CALCIN[id]);
  function bindCalcs(root) {
    root.querySelectorAll('[data-calc]').forEach(p => {
      const run = () => { const v = {}; p.querySelectorAll('[data-k]').forEach(i => v[i.dataset.k] = i.value); try { p.querySelector('.hbco').innerHTML = CALC[p.dataset.calc](v); } catch (e) { p.querySelector('.hbco').textContent = 'Check the inputs.'; } };
      p.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', run)); run();
    });
  }

  /* ------------------------------------------------------------------ chapters */
  const metalRows = METALS.map(m => [m[0], m[1], m[2], m[3], U.sig(m[3] / (m[1] * m[2]) * 1e6, 3), ...[4, 5, 6, 7, 8, 9, 10].map(i => m[i] === undefined ? null : m[i])]);
  const gasPick = ['air', 'n2', 'o2', 'co2', 'h2', 'he', 'ar', 'ch4', 'nh3v', 'steam'];
  const satPick = ['r134a', 'r22', 'r410a', 'r32', 'r1234yf', 'r600a', 'r290', 'nh3', 'co2l', 'ethanol', 'methanol', 'benzene'];
  const pickSel = (id, keys, names, cur) => `<select id="${id}" class="hbsel">${keys.map(k => `<option value="${k}" ${k === cur ? 'selected' : ''}>${names[k]}</option>`).join('')}</select>`;
  const HE = H.heisler;

  const CH_ = [
    { id: 'units', t: 'Units, constants and dimensionless groups', f: () => `
      ${h3('Physical constants')}${tab(['Constant', 'Symbol', 'Value'], [['Stefan–Boltzmann constant', 'σ', '5.670 374 × 10⁻⁸ W/m²·K⁴'], ['First radiation constant', 'C₁ = 2πhc₀²', '3.741 77 × 10⁸ W·µm⁴/m²'], ['Second radiation constant', 'C₂ = hc₀/k<sub>B</sub>', '1.438 777 × 10⁴ µm·K'], ['Wien displacement constant', 'C₃ = λ<sub>max</sub>T', '2897.77 µm·K'], ['Speed of light in vacuum', 'c₀', '2.997 925 × 10⁸ m/s'], ['Planck constant', 'h', '6.626 070 × 10⁻³⁴ J·s'], ['Boltzmann constant', 'k<sub>B</sub>', '1.380 649 × 10⁻²³ J/K'], ['Avogadro number', 'N<sub>A</sub>', '6.022 141 × 10²³ 1/mol'], ['Universal gas constant', 'R̄', '8.314 46 J/mol·K = 8314.46 J/kmol·K'], ['Gas constant of air', 'R', '287.05 J/kg·K'], ['Standard gravity', 'g', '9.806 65 m/s²'], ['Standard atmosphere', 'p₀', '101 325 Pa = 1.013 25 bar'], ['Solar constant (mean)', 'S<sub>c</sub>', '1361 W/m²'], ['Absolute zero', '', '0 K = −273.15 °C']], { text: [0, 1, 2] })}
      ${h3('Unit conversions')}${tab(['Quantity', 'SI unit', 'Equivalent'], [['Length', '1 m', '3.2808 ft = 39.370 in'], ['Mass', '1 kg', '2.2046 lb<sub>m</sub>'], ['Force', '1 N', '0.101 97 kgf = 0.224 81 lb<sub>f</sub>'], ['Pressure', '1 Pa = 1 N/m²', '10⁻⁵ bar = 9.869 × 10⁻⁶ atm = 1.450 × 10⁻⁴ psi = 7.501 × 10⁻³ mm Hg'], ['Energy', '1 J', '0.238 85 cal = 9.4782 × 10⁻⁴ Btu = 2.778 × 10⁻⁷ kWh'], ['Power, heat rate', '1 W', '0.859 85 kcal/h = 3.4121 Btu/h = 1.341 × 10⁻³ hp'], ['Refrigeration', '1 TR (ton of refrigeration)', '3.517 kW = 12 000 Btu/h = 211 kJ/min'], ['Heat flux', '1 W/m²', '0.859 85 kcal/h·m² = 0.317 00 Btu/h·ft²'], ['Thermal conductivity', '1 W/m·K', '0.859 85 kcal/h·m·°C = 0.577 79 Btu/h·ft·°F'], ['Heat transfer coefficient', '1 W/m²·K', '0.859 85 kcal/h·m²·°C = 0.176 11 Btu/h·ft²·°F'], ['Specific heat', '1 kJ/kg·K', '0.238 85 kcal/kg·°C = 0.238 85 Btu/lb<sub>m</sub>·°F'], ['Enthalpy', '1 kJ/kg', '0.429 92 Btu/lb<sub>m</sub>'], ['Dynamic viscosity', '1 N·s/m² = 1 Pa·s', '10 poise = 1000 cP = 0.672 0 lb<sub>m</sub>/ft·s'], ['Kinematic viscosity, diffusivity', '1 m²/s', '10⁴ stokes = 10.764 ft²/s = 3.875 × 10⁴ ft²/h'], ['Density', '1 kg/m³', '0.062 428 lb<sub>m</sub>/ft³'], ['Temperature', 'T (K)', 'T(°C) + 273.15;  T(°F) = 1.8 T(°C) + 32;  T(R) = 1.8 T(K)'], ['Temperature difference', '1 K', '1 °C = 1.8 °F = 1.8 R']], { text: [0, 1, 2] })}
      ${h3('Dimensionless groups')}${tab(['Group', 'Definition', 'Meaning'], [['Biot number', 'Bi = hL<sub>c</sub>/k<sub>s</sub>', 'internal conduction resistance / surface convection resistance'], ['Fourier number', 'Fo = αt/L<sub>c</sub>²', 'dimensionless time in transient conduction'], ['Nusselt number', 'Nu = hL/k<sub>f</sub>', 'dimensionless heat transfer coefficient'], ['Reynolds number', 'Re = ρVL/μ = VL/ν', 'inertia / viscous forces'], ['Prandtl number', 'Pr = c<sub>p</sub>μ/k = ν/α', 'momentum / thermal diffusivity'], ['Grashof number', 'Gr = gβ(T<sub>s</sub> − T<sub>∞</sub>)L³/ν²', 'buoyancy / viscous forces'], ['Rayleigh number', 'Ra = Gr·Pr = gβΔTL³/(να)', 'free convection driving parameter'], ['Modified Rayleigh number', 'Ra* = gβq″L⁴/(kνα)', 'free convection at uniform heat flux'], ['Stanton number', 'St = h/(ρVc<sub>p</sub>) = Nu/(Re·Pr)', ''], ['Peclet number', 'Pe = Re·Pr = VL/α', 'advection / conduction (liquid metals)'], ['Graetz number', 'Gz = (D/x)Re·Pr', 'thermal entry length parameter'], ['Colburn j factor', 'j<sub>H</sub> = St·Pr<sup>2/3</sup>', 'Chilton–Colburn analogy: j<sub>H</sub> = C<sub>f</sub>/2'], ['Eckert number', 'Ec = V²/(c<sub>p</sub>ΔT)', 'kinetic energy / enthalpy difference (viscous heating)'], ['Jakob number', 'Ja = c<sub>p</sub>(T<sub>s</sub> − T<sub>sat</sub>)/h<sub>fg</sub>', 'sensible / latent heat'], ['Bond number', 'Bo = g(ρ<sub>l</sub> − ρ<sub>v</sub>)L²/σ', 'buoyancy / surface tension'], ['Friction factor (Darcy)', 'f = −(dp/dx)D/(ρu<sub>m</sub>²/2)', 'pressure drop in pipes; f = 4C<sub>f</sub>'], ['Skin friction coefficient', 'C<sub>f</sub> = τ<sub>s</sub>/(ρV²/2)', ''], ['Schmidt number', 'Sc = ν/D<sub>AB</sub>', 'momentum / mass diffusivity'], ['Sherwood number', 'Sh = h<sub>m</sub>L/D<sub>AB</sub>', 'dimensionless mass transfer coefficient'], ['Lewis number', 'Le = α/D<sub>AB</sub> = Sc/Pr', 'thermal / mass diffusivity'], ['Mass transfer Stanton number', 'St<sub>m</sub> = h<sub>m</sub>/V = Sh/(Re·Sc)', 'j<sub>m</sub> = St<sub>m</sub>Sc<sup>2/3</sup>']], { text: [0, 1, 2] })}
      ${h3('Characteristic lengths')}${tab(['Situation', 'Length used'], [['Lumped capacitance', 'L<sub>c</sub> = V/A<sub>s</sub> (plane wall: half-thickness; long cylinder: r₀/2; sphere: r₀/3)'], ['Heisler charts and one-term solutions', 'half-thickness L of a wall, outer radius r₀ of a cylinder or sphere'], ['Non-circular duct', 'hydraulic diameter D<sub>h</sub> = 4A<sub>c</sub>/P (wetted perimeter)'], ['Annulus', 'D<sub>h</sub> = D<sub>o</sub> − D<sub>i</sub>'], ['Horizontal plate, free convection', 'L = A<sub>s</sub>/P'], ['Fin with convective tip', 'corrected length L<sub>c</sub> = L + t/2 (straight), L + D/4 (pin)']], { text: [0, 1] })}` },

    { id: 'solids', t: 'Thermophysical properties of solids', f: () => `
      ${note('Properties of commercial materials vary with composition, heat treatment and porosity, typically by ±10 % for metals and ±20 % or more for non-metals and insulation. Use the value given in a problem or measured on your rig when one is available.')}
      ${h3('Metals and alloys')}<p class="hbsrc">Source: TPRC data as tabulated in Incropera, DeWitt, Bergman &amp; Lavine, Fundamentals of Heat and Mass Transfer, Table A.1; Inconel 600, Ti-6Al-4V, 6061-T6 and grey cast iron from producer data sheets. α computed as k/ρc<sub>p</sub>.</p>
      ${tab(['Metal', 'ρ (kg/m³)', 'c<sub>p</sub> (J/kg·K)', 'k (W/m·K)', 'α·10⁶ (m²/s)', 'k at 100 K', '200 K', '400 K', '600 K', '800 K', '1000 K', '1200 K'], metalRows, { cap: 'Properties at 300 K; thermal conductivity k (W/m·K) at other temperatures' })}
      ${h3('Non-metallic solids (about 300 K)')}<p class="hbsrc">Source: Incropera Table A.2 and Çengel &amp; Ghajar Table A-5; polymers: typical handbook values.</p>
      ${tab(['Material', 'ρ (kg/m³)', 'c<sub>p</sub> (J/kg·K)', 'k (W/m·K)', 'α·10⁶ (m²/s)'], NONMET.map(m => [m[0], m[1], m[2], m[3], m[2] ? U.sig(m[3] / (m[1] * m[2]) * 1e6, 3) : null]))}
      ${h3('Building materials (about 300 K)')}<p class="hbsrc">Source: ASHRAE data as tabulated in Incropera Table A.3; Kothandaraman &amp; Subramanyan.</p>
      ${tab(['Material', 'ρ (kg/m³)', 'c<sub>p</sub> (J/kg·K)', 'k (W/m·K)', 'α·10⁶ (m²/s)'], BUILD.map(m => [m[0], m[1], m[2], U.sig(m[3], 3), m[2] ? U.sig(m[3] / (m[1] * m[2]) * 1e6, 3) : null]))}
      ${h3('Thermal insulation')}<p class="hbsrc">Source: Incropera Table A.3, ASHRAE Handbook of Fundamentals and manufacturers' ranges. k at about 300 K (mean temperature) unless stated.</p>
      ${tab(['Insulation', 'ρ (kg/m³)', 'k (W/m·K)', 'Max. service temperature (°C)', 'k at higher temperature'], INSUL.map(m => [m[0], m[1], m[2], m[3], m[4] || '']), { text: [0, 4] })}` },

    { id: 'gases', t: 'Properties of gases at atmospheric pressure', f: () => `
      ${note('All gases at p = 1 atm. ρ scales with pressure (ideal gas); μ, k and c<sub>p</sub> are nearly independent of pressure at moderate pressures, so ν and α scale as 1/p. Evaluate properties at the film temperature T<sub>f</sub> = (T<sub>s</sub> + T<sub>∞</sub>)/2 for external flow or the bulk mean temperature for internal flow.')}
      <div class="toolbar no-print" style="margin:6px 0 4px"><label for="hbg">Gas</label>${pickSel('hbg', gasPick, Object.fromEntries(gasPick.map(k => [k, H.gases[k].name])), 'air')}<span class="muted hbsmall">The printed handbook includes every gas.</span></div>
      <div id="hbgt">${look(H.gases.air, { title: H.gases.air.name })}</div>
      <div class="print-only">${gasPick.slice(1).map(k => look(H.gases[k], { title: H.gases[k].name })).join('')}</div>` },

    { id: 'liquids', t: 'Properties of liquids', f: () => `
      ${h3('Saturated water: liquid and vapour', 'hb-satwater')}${note('Use for water flowing in pipes and over surfaces (properties barely depend on pressure for the liquid), and for boiling and condensation (saturated vapour). β<sub>l</sub> is the volumetric thermal expansion coefficient of the liquid, for free convection.')}
      ${look(H.satwater)}
      ${h3('Engine oil (unused)')}<p class="hbsrc">Source: TPRC data via Incropera Table A.5.</p>${tab(LCOL2, OIL, { text: [] })}
      ${h3('Ethylene glycol [C₂H₄(OH)₂]')}<p class="hbsrc">Source: Incropera Table A.5.</p>${tab(LCOL2, EG, { text: [] })}
      ${h3('Glycerine [C₃H₅(OH)₃]')}<p class="hbsrc">Source: Incropera Table A.5.</p>${tab(LCOL2, GLY, { text: [] })}
      ${h3('Mercury (Hg), saturated liquid')}<p class="hbsrc">Source: Incropera Table A.7.</p>${tab(['T (K)', 'ρ (kg/m³)', 'c<sub>p</sub> (kJ/kg·K)', 'ν·10⁷ (m²/s)', 'k (W/m·K)', 'α·10⁵ (m²/s)', 'Pr'], HG, { text: [] })}
      ${h3('Liquid metals: sodium, lead–bismuth eutectic, lead')}${look(H.lmetal.na, { title: H.lmetal.na.name })}${look(H.lmetal.lbe, { title: H.lmetal.lbe.name })}${look(H.lmetal.pb, { title: H.lmetal.pb.name })}
      ${h3('Refrigerants and organic liquids, saturated liquid')}
      <div class="toolbar no-print" style="margin:6px 0 4px"><label for="hbl">Liquid</label>${pickSel('hbl', satPick, Object.fromEntries(satPick.map(k => [k, H.satliq[k].name])), 'r134a')}</div>
      <div id="hblt">${look(H.satliq.r134a, { title: H.satliq.r134a.name })}</div>
      <div class="print-only">${satPick.slice(1).map(k => look(H.satliq[k], { title: H.satliq[k].name })).join('')}</div>` },

    { id: 'steam', t: 'Steam tables', f: () => `
      ${note('IAPWS-95 formulation. Reference state: internal energy and entropy of saturated liquid at the triple point (0.01 °C) are zero, as in standard steam tables. Quality x: v = v<sub>f</sub> + x(v<sub>g</sub> − v<sub>f</sub>), h = h<sub>f</sub> + x h<sub>fg</sub>, s = s<sub>f</sub> + x s<sub>fg</sub>.')}
      ${h3('Saturated water and steam, by temperature')}${look(H.steamT)}
      ${h3('Saturated water and steam, by pressure')}${look(H.steamP)}
      ${h3('Superheated steam')}<p class="hbsrc">Source: ${H.steamSH.src}</p><div class="hbgrid">${H.steamSH.p.map(p => `<div>${tab(H.steamSH.t[p].cols.slice(1), H.steamSH.t[p].rows.map(r => r.slice(1)), { cap: H.steamSH.t[p].name, text: [] })}</div>`).join('')}</div>` },

    { id: 'refrig', t: 'Refrigerant tables', f: () => `
      ${note('ASHRAE reference state for every refrigerant: h = 0 kJ/kg and s = 0 kJ/kg·K for saturated liquid at −40 °C. Tables using the IIR reference (h = 200 kJ/kg, s = 1 kJ/kg·K at 0 °C) give the same enthalpy and entropy differences. For R744 the critical point is 30.98 °C.')}
      <div class="toolbar no-print" style="margin:6px 0 4px"><label for="hbr">Refrigerant</label>${pickSel('hbr', Object.keys(H.refsat), Object.fromEntries(Object.keys(H.refsat).map(k => [k, H.refsat[k].name])), 'r134a')}</div>
      <div id="hbrt">${refBlock('r134a')}</div><div class="print-only">${Object.keys(H.refsat).filter(k => k !== 'r134a').map(refBlock).join('')}</div>` },

    { id: 'cond', t: 'Steady-state conduction and fins', f: () => `
      ${h3('Fourier law and thermal resistances')}${eqs([
        ['Fourier law', 'q″ = −k dT/dx;  q = −kA dT/dx', 'k from the solids tables at the mean temperature'],
        ['Plane wall, thickness L', 'q = (T₁ − T₂)/R,  R = L/(kA)', 'Composite wall: R<sub>tot</sub> = Σ L<sub>i</sub>/(k<sub>i</sub>A) + 1/(h<sub>i</sub>A) + 1/(h<sub>o</sub>A)'],
        ['Hollow cylinder, radii r₁ &lt; r₂, length L', 'R = ln(r₂/r₁)/(2πLk)', 'Overall: UA = 1/R<sub>tot</sub>'],
        ['Hollow sphere, radii r₁ &lt; r₂', 'R = (1/r₁ − 1/r₂)/(4πk)', ''],
        ['Convection', 'R = 1/(hA)', ''], ['Radiation (linearised)', 'R = 1/(h<sub>r</sub>A),  h<sub>r</sub> = εσ(T<sub>s</sub> + T<sub>sur</sub>)(T<sub>s</sub>² + T<sub>sur</sub>²)', ''],
        ['Contact resistance', `R<sub>t,c</sub> = R″<sub>t,c</sub>/A`, 'see table below'],
        ['Variable conductivity k = k₀(1 + βT)', 'q = k<sub>m</sub>A(T₁ − T₂)/L,  k<sub>m</sub> = k₀[1 + β(T₁ + T₂)/2]', 'Use k<sub>m</sub> in the cylinder and sphere formulas too'],
        ['Critical radius of insulation', `r<sub>cr</sub> = k/h (cylinder);  r<sub>cr</sub> = 2k/h (sphere)`, 'Adding insulation increases heat loss while r &lt; r<sub>cr</sub>'],
        ['Overall coefficient of a tube', '1/(UA) = 1/(h<sub>i</sub>A<sub>i</sub>) + R″<sub>f,i</sub>/A<sub>i</sub> + ln(r<sub>o</sub>/r<sub>i</sub>)/(2πkL) + R″<sub>f,o</sub>/A<sub>o</sub> + 1/(h<sub>o</sub>A<sub>o</sub>)', 'R″<sub>f</sub>: fouling factors (Heat exchangers chapter)']])}
      ${h3('Uniform heat generation q̇ (W/m³), surface held at T<sub>s</sub>')}${eqs([
        ['Plane wall, half-thickness L', 'T(x) = q̇L²/(2k)·(1 − x²/L²) + T<sub>s</sub>;  T<sub>max</sub> = T<sub>s</sub> + q̇L²/(2k)', 'T<sub>s</sub> = T<sub>∞</sub> + q̇L/h'],
        ['Solid cylinder, radius r₀', 'T(r) = q̇r₀²/(4k)·(1 − r²/r₀²) + T<sub>s</sub>;  T<sub>max</sub> = T<sub>s</sub> + q̇r₀²/(4k)', 'T<sub>s</sub> = T<sub>∞</sub> + q̇r₀/(2h)'],
        ['Solid sphere, radius r₀', 'T(r) = q̇r₀²/(6k)·(1 − r²/r₀²) + T<sub>s</sub>;  T<sub>max</sub> = T<sub>s</sub> + q̇r₀²/(6k)', 'T<sub>s</sub> = T<sub>∞</sub> + q̇r₀/(3h)'],
        ['Electrical conductor', 'q̇ = I²R<sub>e</sub>/V = I²ρ<sub>e</sub>/A<sub>c</sub>²', 'ρ<sub>e</sub>: electrical resistivity (Ω·m)']])}
      ${h3('Thermal contact resistance R″<sub>t,c</sub> (10⁻⁴ m²·K/W)')}<p class="hbsrc">Source: Incropera Table 3.1 (after Fried; Fletcher).</p>
      <div class="hbgrid">${tab(['Metallic interface in vacuum', '100 kN/m²', '10 000 kN/m²'], [['Stainless steel', '6–25', '0.7–4.0'], ['Copper', '1–10', '0.1–0.5'], ['Magnesium', '1.5–3.5', '0.2–0.4'], ['Aluminium', '1.5–5.0', '0.2–0.4']], { text: [0, 1, 2] })}
      ${tab(['Aluminium interface (10 µm roughness, 10⁵ N/m²) filled with', 'R″<sub>t,c</sub>'], [['Air', 2.75], ['Helium', 1.05], ['Hydrogen', 0.720], ['Silicone oil', 0.525], ['Glycerine', 0.265], ['Thermal grease (typical)', '0.07–0.3'], ['Indium foil', '0.02–0.1']])}</div>
      ${h3('Conduction shape factors: q = Sk(T₁ − T₂)')}<p class="hbsrc">Analytical results; see Incropera Table 4.1 and Kothandaraman &amp; Subramanyan.</p>${eqs([
        ['Isothermal sphere, diameter D, buried at depth z in a semi-infinite medium', 'S = 2πD/(1 − D/4z)', 'z &gt; D/2'],
        ['Sphere in an infinite medium', 'S = 2πD', ''],
        ['Horizontal isothermal cylinder, length L, buried at depth z', 'S = 2πL/cosh⁻¹(2z/D)', 'L ≫ D; ≈ 2πL/ln(4z/D) for z &gt; 3D/2'],
        ['Vertical cylinder in a semi-infinite medium', 'S = 2πL/ln(4L/D)', 'L ≫ D'],
        ['Two parallel cylinders of length L, centres w apart', 'S = 2πL/cosh⁻¹[(4w² − D₁² − D₂²)/(2D₁D₂)]', 'L ≫ D₁, D₂, w'],
        ['Horizontal cylinder midway between parallel planes, spacing 2z (= distance from axis to each plane z)', 'S = 2πL/ln(8z/πD)', 'z ≫ D/2, L ≫ z'],
        ['Circular cylinder centred in a square bar of side w', 'S = 2πL/ln(1.08 w/D)', 'w &gt; D'],
        ['Eccentric cylinder d inside cylinder D, offset z', 'S = 2πL/cosh⁻¹[(D² + d² − 4z²)/(2Dd)]', 'D &gt; d'],
        ['Thin disc, diameter D, on the surface of a semi-infinite medium', 'S = 2D', ''],
        ['Edge of two adjoining walls of thickness much less than other sizes, length L', 'S = 0.54L', ''],
        ['Corner of three walls of equal thickness', 'S = 0.15L (L = wall thickness)', ''],
        ['Plane wall', 'S = A/L', ''], ['Cylindrical and spherical shells', 'S = 2πL/ln(r₂/r₁);  S = 4πr₁r₂/(r₂ − r₁)', '']])}
      ${h3('Fins of uniform cross-section (m² = hP/kA<sub>c</sub>, θ = T − T<sub>∞</sub>, M = √(hPkA<sub>c</sub>)·θ<sub>b</sub>)')}${eqs([
        ['Convective tip (h at tip)', `θ/θ<sub>b</sub> = [cosh m(L − x) + (h/mk) sinh m(L − x)] / [cosh mL + (h/mk) sinh mL];  q<sub>f</sub> = M [sinh mL + (h/mk) cosh mL] / [cosh mL + (h/mk) sinh mL]`, 'Or use the adiabatic-tip result with L<sub>c</sub> = L + t/2 or L + D/4'],
        ['Adiabatic (insulated) tip', 'θ/θ<sub>b</sub> = cosh m(L − x)/cosh mL;  q<sub>f</sub> = M tanh mL', ''],
        ['Prescribed tip temperature θ<sub>L</sub>', 'θ/θ<sub>b</sub> = [(θ<sub>L</sub>/θ<sub>b</sub>) sinh mx + sinh m(L − x)]/sinh mL;  q<sub>f</sub> = M (cosh mL − θ<sub>L</sub>/θ<sub>b</sub>)/sinh mL', ''],
        ['Infinitely long fin (mL &gt; 2.65)', 'θ/θ<sub>b</sub> = e<sup>−mx</sup>;  q<sub>f</sub> = M', ''],
        ['Fin efficiency and effectiveness', 'η<sub>f</sub> = q<sub>f</sub>/(hA<sub>f</sub>θ<sub>b</sub>);  ε<sub>f</sub> = q<sub>f</sub>/(hA<sub>c,b</sub>θ<sub>b</sub>)', 'Fins are worthwhile when ε<sub>f</sub> ≥ 2'],
        ['Fin array, overall surface efficiency', 'η<sub>o</sub> = 1 − (NA<sub>f</sub>/A<sub>t</sub>)(1 − η<sub>f</sub>);  q<sub>t</sub> = η<sub>o</sub>hA<sub>t</sub>θ<sub>b</sub>', 'A<sub>t</sub> = NA<sub>f</sub> + A<sub>b</sub>'],
        ['Straight fin, triangular profile', 'η<sub>f</sub> = I₁(2mL)/[mL I₀(2mL)],  m = √(2h/kt)', ''],
        ['Straight fin, concave parabolic profile', 'η<sub>f</sub> = 2/[√(4(mL)² + 1) + 1]', ''],
        ['Annular fin, rectangular profile', 'η<sub>f</sub> = C₂ [K₁(mr₁)I₁(mr₂c) − I₁(mr₁)K₁(mr₂c)]/[I₀(mr₁)K₁(mr₂c) + K₀(mr₁)I₁(mr₂c)],  C₂ = (2r₁/m)/(r₂c² − r₁²)', 'r₂c = r₂ + t/2']])}
      ${chart({ title: 'Efficiency of straight fins', cap: 'Rectangular profile: L<sub>c</sub> = L + t/2, A<sub>p</sub> = L<sub>c</sub>t; triangular: A<sub>p</sub> = Lt/2; concave parabolic: A<sub>p</sub> = Lt/3.', x: [0, 2.5], y: [0, 1], xstep: 0.25, ystep: 0.1, xl: 'L<tspan dy="4" font-size="9">c</tspan><tspan dy="-9" font-size="9">3/2</tspan><tspan dy="5">(h/kA</tspan><tspan dy="4" font-size="9">p</tspan><tspan dy="-4">)</tspan><tspan dy="-5" font-size="9">1/2</tspan>', yl: 'Fin efficiency η<tspan dy="4" font-size="9">f</tspan>', xs: 'L_c^1.5(h/kA_p)^0.5', ys: 'η_f', curves: H.fineff.straight, mr: 20, labels: false, alt: true })}
      ${note('Straight-fin chart curves, top to bottom at the right edge: rectangular, triangular, concave parabolic. For a pin fin, η<sub>f</sub> = tanh(mL<sub>c</sub>)/(mL<sub>c</sub>) with m = √(4h/kD) directly.')}
      ${chart({ title: 'Efficiency of annular fins of rectangular profile', cap: 'Curve label: r₂c/r₁, with r₂c = r₂ + t/2, L<sub>c</sub> = L + t/2, A<sub>p</sub> = L<sub>c</sub>t.', x: [0, 2.5], y: [0, 1], xstep: 0.25, ystep: 0.1, xl: 'L<tspan dy="4" font-size="9">c</tspan><tspan dy="-9" font-size="9">3/2</tspan><tspan dy="5">(h/kA</tspan><tspan dy="4" font-size="9">p</tspan><tspan dy="-4">)</tspan><tspan dy="-5" font-size="9">1/2</tspan>', yl: 'Fin efficiency η<tspan dy="4" font-size="9">f</tspan>', xs: 'L_c^1.5(h/kA_p)^0.5', ys: 'η_f', curves: H.fineff.annular, key: 'r₂c/r₁', labAt: p => p[Math.round(p.length * 0.55)], labDy: -4, labDx: 2 })}` },

    { id: 'trans', t: 'Transient conduction', f: () => `
      ${h3('Lumped capacitance (Bi = hL<sub>c</sub>/k &lt; 0.1, L<sub>c</sub> = V/A<sub>s</sub>)')}${eqs([
        ['Temperature', 'θ/θ<sub>i</sub> = (T − T<sub>∞</sub>)/(T<sub>i</sub> − T<sub>∞</sub>) = exp(−t/τ) = exp(−Bi·Fo)', 'τ = ρVc/(hA<sub>s</sub>), time constant'],
        ['Energy transferred up to time t', 'Q = ρVcθ<sub>i</sub>[1 − exp(−t/τ)]', ''],
        ['Radiation only (surroundings at T<sub>sur</sub>)', 't = ρVc/(4εA<sub>s</sub>σT<sub>sur</sub>³)·{ln|(T<sub>sur</sub> + T)/(T<sub>sur</sub> − T)| − ln|(T<sub>sur</sub> + T<sub>i</sub>)/(T<sub>sur</sub> − T<sub>i</sub>)| + 2[tan⁻¹(T/T<sub>sur</sub>) − tan⁻¹(T<sub>i</sub>/T<sub>sur</sub>)]}', 'Absolute temperatures']])}
      ${h3('One-term solutions (Fo &gt; 0.2)')}${eqs([
        ['Plane wall, half-thickness L', 'θ* = C₁ exp(−ζ₁²Fo) cos(ζ₁x*);  Q/Q₀ = 1 − (sin ζ₁/ζ₁)θ₀*', 'ζ₁ tan ζ₁ = Bi, x* = x/L, Fo = αt/L²'],
        ['Infinite cylinder, radius r₀', 'θ* = C₁ exp(−ζ₁²Fo) J₀(ζ₁r*);  Q/Q₀ = 1 − (2θ₀*/ζ₁)J₁(ζ₁)', 'ζ₁ J₁(ζ₁)/J₀(ζ₁) = Bi, r* = r/r₀'],
        ['Sphere, radius r₀', 'θ* = C₁ exp(−ζ₁²Fo) sin(ζ₁r*)/(ζ₁r*);  Q/Q₀ = 1 − (3θ₀*/ζ₁³)[sin ζ₁ − ζ₁ cos ζ₁]', '1 − ζ₁ cot ζ₁ = Bi'],
        ['Definitions', 'θ* = (T − T<sub>∞</sub>)/(T<sub>i</sub> − T<sub>∞</sub>), θ₀* at the centre;  Q₀ = ρcV(T<sub>i</sub> − T<sub>∞</sub>)', 'Bi = hL/k or hr₀/k (not V/A)'],
        ['Multidimensional bodies (product solution)', 'θ*<sub>short cylinder</sub> = θ*<sub>wall</sub> × θ*<sub>cylinder</sub>;  θ*<sub>bar</sub> = θ*<sub>wall,1</sub> × θ*<sub>wall,2</sub>;  θ*<sub>block</sub> = θ*<sub>1</sub>θ*<sub>2</sub>θ*<sub>3</sub>', 'Q/Q₀ = (Q/Q₀)₁ + (Q/Q₀)₂[1 − (Q/Q₀)₁]']])}
      <p class="hbsrc">The tables, charts and calculator below are computed from the exact series solutions (gen.py).</p>
      ${h3('Coefficients of the one-term approximation')}${tab(H.oneterm.cols, H.oneterm.rows)}
      ${h3('First six roots of ζ tan ζ = Bi (plane wall)')}${tab(H.wallroots.cols, H.wallroots.rows)}
      ${calcBlock('trans', 'Exact transient conduction: wall, cylinder, sphere')}
      ${['wall', 'cyl', 'sph'].map(g => { const nm = { wall: 'plane wall of thickness 2L', cyl: 'infinite cylinder of radius r₀', sph: 'sphere of radius r₀' }[g], Lb = g === 'wall' ? 'L' : 'r₀';
        const yl = 'θ<tspan dy="4" font-size="9">o</tspan><tspan dy="-4">* = (T</tspan><tspan dy="4" font-size="9">o</tspan><tspan dy="-4"> − T∞)/(Ti − T∞)</tspan>';
        const panel = (lo, hi, xmax, step, part) => chart({ title: `Centre temperature of a ${nm} (Heisler chart, part ${part})`, cap: `Curve label: 1/Bi = k/h${Lb}, from ${lo} to ${hi}. Exact series solution.`, x: [0, xmax], xstep: step, y: [0.001, 1], ylog: true, xl: `Fo = αt/${Lb}²`, yl, xs: 'Fo', ys: 'θo*', curves: HE.centre[g].filter(c => +c.label >= lo && +c.label <= hi), key: '1/Bi', h: 500, minorLab: true, labAt: p => p[p.length - 1], labDx: 3, labDy: -2 });
        return panel(0, 2.5, 4, 0.5, 'a') + panel(3, 14, 100, 10, 'b') + panel(16, 100, 700, 50, 'c') +
          chart({ title: `Position correction for a ${nm}`, cap: `Curve label: ${g === 'wall' ? 'x/L' : 'r/r₀'}. Valid for Fo &gt; 0.2.`, x: [0.01, 100], xlog: true, y: [0, 1], ystep: 0.1, xl: `1/Bi = k/h${Lb}`, yl: 'θ/θ<tspan dy="4" font-size="9">o</tspan>', xs: '1/Bi', ys: 'θ/θo', curves: HE.pos[g], key: g === 'wall' ? 'x/L' : 'r/r₀', labAt: p => p[8], labDx: -24, labDy: -3, h: 380 }) +
          chart({ title: `Heat transferred from a ${nm} (Gröber chart)`, cap: `Curve label: Bi = h${Lb}/k. Q₀ = ρcV(Ti − T∞).`, x: [1e-5, 1e4], xlog: true, y: [0, 1], ystep: 0.1, xl: `Bi²Fo = h²αt/k²`, yl: 'Q/Q₀', xs: 'Bi²Fo', ys: 'Q/Q₀', curves: HE.grober[g], key: 'Bi', labAt: p => p.find(q => q[1] > 0.5) || p[p.length - 1], labDx: 2, labDy: 3, h: 400 }); }).join('')}
      ${h3('Semi-infinite solid (x* = x/(2√(αt)))')}${eqs([
        ['Constant surface temperature T<sub>s</sub>', '(T − T<sub>s</sub>)/(T<sub>i</sub> − T<sub>s</sub>) = erf[x/(2√(αt))];  q″<sub>s</sub> = k(T<sub>s</sub> − T<sub>i</sub>)/√(παt)', ''],
        ['Constant surface heat flux q″<sub>o</sub>', 'T − T<sub>i</sub> = (2q″<sub>o</sub>√(αt/π)/k)exp(−x²/4αt) − (q″<sub>o</sub>x/k) erfc[x/(2√(αt))]', ''],
        ['Surface convection h, T<sub>∞</sub>', '(T − T<sub>i</sub>)/(T<sub>∞</sub> − T<sub>i</sub>) = erfc(η) − exp(hx/k + h²αt/k²) erfc[η + h√(αt)/k]', 'η = x/(2√(αt))'],
        ['Two semi-infinite solids brought into contact', 'T<sub>s</sub> = (√(kρc)<sub>A</sub>T<sub>A,i</sub> + √(kρc)<sub>B</sub>T<sub>B,i</sub>)/(√(kρc)<sub>A</sub> + √(kρc)<sub>B</sub>)', 'Contact temperature; √(kρc) is the thermal effusivity'],
        ['Penetration depth', 'δ ≈ 4√(αt) (temperature change below 0.5 % of the step)', '']])}
      ${note('Values of erf η and erfc η are in the Mathematical tables chapter.')}` },

    { id: 'forced', t: 'Forced convection', f: () => `
      ${note('Properties at the film temperature T<sub>f</sub> = (T<sub>s</sub> + T<sub>∞</sub>)/2 for external flow, at the mean bulk temperature (T<sub>m,i</sub> + T<sub>m,o</sub>)/2 for internal flow, unless a viscosity ratio (μ/μ<sub>s</sub>) or Pr/Pr<sub>s</sub> correction is shown. Transition: Re<sub>x,c</sub> ≈ 5 × 10⁵ on a flat plate, Re<sub>D,c</sub> ≈ 2300 in a pipe.')}
      ${h3('Flat plate in parallel flow')}${eqs([
        ['Laminar boundary layer thickness', 'δ = 5x/Re<sub>x</sub><sup>1/2</sup>;  δ<sub>t</sub> ≈ δ Pr<sup>−1/3</sup>', 'Re<sub>x</sub> &lt; 5 × 10⁵'],
        ['Laminar local friction and heat transfer', 'C<sub>f,x</sub> = 0.664 Re<sub>x</sub><sup>−1/2</sup>;  Nu<sub>x</sub> = 0.332 Re<sub>x</sub><sup>1/2</sup>Pr<sup>1/3</sup>', 'Pr ≥ 0.6, isothermal plate'],
        ['Laminar average', 'C̄<sub>f</sub> = 1.328 Re<sub>L</sub><sup>−1/2</sup>;  N̄u<sub>L</sub> = 0.664 Re<sub>L</sub><sup>1/2</sup>Pr<sup>1/3</sup>', 'Pr ≥ 0.6'],
        ['Laminar, uniform heat flux', 'Nu<sub>x</sub> = 0.453 Re<sub>x</sub><sup>1/2</sup>Pr<sup>1/3</sup>', 'Pr ≥ 0.6'],
        ['Laminar, all Prandtl numbers (Churchill & Ozoe)', 'Nu<sub>x</sub> = 0.3387 Re<sub>x</sub><sup>1/2</sup>Pr<sup>1/3</sup>/[1 + (0.0468/Pr)<sup>2/3</sup>]<sup>1/4</sup>', 'Re<sub>x</sub>Pr ≥ 100'],
        ['Liquid metals (Pr ≲ 0.05)', 'Nu<sub>x</sub> = 0.565 Pe<sub>x</sub><sup>1/2</sup>', 'Pe<sub>x</sub> ≥ 100'],
        ['Turbulent local', 'δ = 0.37x Re<sub>x</sub><sup>−1/5</sup>;  C<sub>f,x</sub> = 0.0592 Re<sub>x</sub><sup>−1/5</sup>;  Nu<sub>x</sub> = 0.0296 Re<sub>x</sub><sup>4/5</sup>Pr<sup>1/3</sup>', '5 × 10⁵ &lt; Re<sub>x</sub> ≤ 10⁸, 0.6 ≤ Pr ≤ 60'],
        ['Mixed laminar–turbulent average', 'C̄<sub>f</sub> = 0.074 Re<sub>L</sub><sup>−1/5</sup> − 1742 Re<sub>L</sub><sup>−1</sup>;  N̄u<sub>L</sub> = (0.037 Re<sub>L</sub><sup>4/5</sup> − 871)Pr<sup>1/3</sup>', 'Re<sub>x,c</sub> = 5 × 10⁵; fully turbulent: drop the 871 and 1742 terms'],
        ['Unheated starting length ξ', 'Nu<sub>x</sub> = Nu<sub>x|ξ=0</sub>/[1 − (ξ/x)<sup>3/4</sup>]<sup>1/3</sup> (laminar);  [1 − (ξ/x)<sup>9/10</sup>]<sup>1/9</sup> (turbulent)', '']])}
      ${h3('Cylinder in cross flow')}${eqs([
        ['Hilpert (Knudsen & Katz)', 'N̄u<sub>D</sub> = C Re<sub>D</sub><sup>m</sup>Pr<sup>1/3</sup>', 'Pr ≥ 0.7; C, m below'],
        ['Zukauskas', 'N̄u<sub>D</sub> = C Re<sub>D</sub><sup>m</sup>Pr<sup>n</sup>(Pr/Pr<sub>s</sub>)<sup>1/4</sup>', '0.7 &lt; Pr &lt; 500, 1 &lt; Re<sub>D</sub> &lt; 10⁶; n = 0.37 (Pr ≤ 10), 0.36 (Pr &gt; 10); properties at T<sub>∞</sub>'],
        ['Churchill & Bernstein (all Re)', 'N̄u<sub>D</sub> = 0.3 + 0.62 Re<sub>D</sub><sup>1/2</sup>Pr<sup>1/3</sup>/[1 + (0.4/Pr)<sup>2/3</sup>]<sup>1/4</sup> × [1 + (Re<sub>D</sub>/282 000)<sup>5/8</sup>]<sup>4/5</sup>', 'Re<sub>D</sub>Pr ≥ 0.2']])}
      <div class="hbgrid">${tab(['Re<sub>D</sub> (Hilpert)', 'C', 'm'], [['0.4–4', 0.989, 0.330], ['4–40', 0.911, 0.385], ['40–4000', 0.683, 0.466], ['4000–40 000', 0.193, 0.618], ['40 000–400 000', 0.027, 0.805]])}
      ${tab(['Re<sub>D</sub> (Zukauskas)', 'C', 'm'], [['1–40', 0.75, 0.4], ['40–1000', 0.51, 0.5], ['10³–2 × 10⁵', 0.26, 0.6], ['2 × 10⁵–10⁶', 0.076, 0.7]])}</div>
      ${h3('Non-circular cylinders in cross flow (gases): N̄u<sub>D</sub> = C Re<sub>D</sub><sup>m</sup>Pr<sup>1/3</sup>')}<p class="hbsrc">Source: Jakob (1949), as given in Incropera 6th ed. Table 7.3. D is the width normal to the flow.</p>
      ${tab(['Geometry', 'Re<sub>D</sub>', 'C', 'm'], [['Square, flat face to flow', '5 × 10³–10⁵', 0.102, 0.675], ['Square, corner to flow (diamond)', '5 × 10³–10⁵', 0.246, 0.588], ['Hexagon, flat face to flow', '5.2 × 10³–2.04 × 10⁴', 0.160, 0.638], ['', '2.04 × 10⁴–1.05 × 10⁵', 0.0385, 0.782], ['Hexagon, corner to flow', '4.5 × 10³–9.7 × 10⁴', 0.153, 0.638], ['Vertical flat plate normal to flow', '4 × 10³–1.5 × 10⁴', 0.228, 0.731]], { text: [0, 1] })}
      ${h3('Sphere and packed beds')}${eqs([
        ['Sphere (Whitaker)', 'N̄u<sub>D</sub> = 2 + (0.4 Re<sub>D</sub><sup>1/2</sup> + 0.06 Re<sub>D</sub><sup>2/3</sup>)Pr<sup>0.4</sup>(μ/μ<sub>s</sub>)<sup>1/4</sup>', '0.71 &lt; Pr &lt; 380, 3.5 &lt; Re<sub>D</sub> &lt; 7.6 × 10⁴; properties at T<sub>∞</sub>'],
        ['Freely falling liquid drop (Ranz & Marshall)', 'N̄u<sub>D</sub> = 2 + 0.6 Re<sub>D</sub><sup>1/2</sup>Pr<sup>1/3</sup>', ''],
        ['Packed bed of spheres', 'ε j<sub>H</sub> = 2.06 Re<sub>D</sub><sup>−0.575</sup>', 'Pr ≈ 0.7, 90 ≤ Re<sub>D</sub> ≤ 4000; ε = void fraction']])}
      ${h3('Banks of tubes in cross flow (Zukauskas)')}${eqs([
        ['Average Nusselt number', 'N̄u<sub>D</sub> = C₂ C Re<sub>D,max</sub><sup>m</sup>Pr<sup>0.36</sup>(Pr/Pr<sub>s</sub>)<sup>1/4</sup>', 'N<sub>L</sub> ≥ 20, 0.7 &lt; Pr &lt; 500, 10 &lt; Re<sub>D,max</sub> &lt; 2 × 10⁶; properties at mean of inlet and outlet'],
        ['Maximum velocity, aligned', 'V<sub>max</sub> = S<sub>T</sub>V/(S<sub>T</sub> − D)', ''],
        ['Maximum velocity, staggered', 'V<sub>max</sub> = S<sub>T</sub>V/[2(S<sub>D</sub> − D)] if S<sub>D</sub> &lt; (S<sub>T</sub> + D)/2, else S<sub>T</sub>V/(S<sub>T</sub> − D)', 'S<sub>D</sub> = [S<sub>L</sub>² + (S<sub>T</sub>/2)²]<sup>1/2</sup>'],
        ['Heat rate', 'q = N(h̄πDΔT<sub>lm</sub>);  (T<sub>s</sub> − T<sub>o</sub>)/(T<sub>s</sub> − T<sub>i</sub>) = exp[−πDNh̄/(ρVN<sub>T</sub>S<sub>T</sub>c<sub>p</sub>)]', '']])}
      <div class="hbgrid">${tab(['Configuration', 'Re<sub>D,max</sub>', 'C', 'm'], [['Aligned', '10–10²', 0.80, 0.40], ['Staggered', '10–10²', 0.90, 0.40], ['Aligned', '10²–10³', 'single tube', ''], ['Staggered', '10²–10³', 'single tube', ''], ['Aligned (S<sub>T</sub>/S<sub>L</sub> &gt; 0.7)', '10³–2 × 10⁵', 0.27, 0.63], ['Staggered (S<sub>T</sub>/S<sub>L</sub> &lt; 2)', '10³–2 × 10⁵', '0.35(S<sub>T</sub>/S<sub>L</sub>)<sup>1/5</sup>', 0.60], ['Staggered (S<sub>T</sub>/S<sub>L</sub> &gt; 2)', '10³–2 × 10⁵', 0.40, 0.60], ['Aligned', '2 × 10⁵–2 × 10⁶', 0.021, 0.84], ['Staggered', '2 × 10⁵–2 × 10⁶', 0.022, 0.84]], { text: [0, 1, 2] })}
      ${tab(['N<sub>L</sub> (rows)', '1', '2', '3', '4', '5', '7', '10', '13', '16'], [['C₂ aligned', 0.70, 0.80, 0.86, 0.90, 0.92, 0.95, 0.97, 0.98, 0.99], ['C₂ staggered', 0.64, 0.76, 0.84, 0.89, 0.92, 0.95, 0.97, 0.98, 0.99]], { cap: 'Row correction C₂ for N<sub>L</sub> &lt; 20 (Re<sub>D,max</sub> ≳ 10³)' })}</div>
      ${h3('Flow in tubes: laminar')}${eqs([
        ['Mean velocity, Reynolds number', 'u<sub>m</sub> = ṁ/(ρA<sub>c</sub>);  Re<sub>D</sub> = 4ṁ/(πDμ)', ''],
        ['Entry lengths', 'x<sub>fd,h</sub> ≈ 0.05 Re<sub>D</sub>D;  x<sub>fd,t</sub> ≈ 0.05 Re<sub>D</sub>Pr D (laminar);  ≈ 10D (turbulent)', ''],
        ['Fully developed friction factor', 'f = 64/Re<sub>D</sub>;  Δp = f(ρu<sub>m</sub>²/2)(L/D)', ''],
        ['Fully developed Nusselt number', 'Nu<sub>D</sub> = 4.36 (uniform q″<sub>s</sub>);  Nu<sub>D</sub> = 3.66 (uniform T<sub>s</sub>)', 'Other shapes below'],
        ['Thermal entry, uniform T<sub>s</sub> (Hausen)', 'N̄u<sub>D</sub> = 3.66 + 0.0668 Gz<sub>D</sub>/[1 + 0.04 Gz<sub>D</sub><sup>2/3</sup>],  Gz<sub>D</sub> = (D/L)Re<sub>D</sub>Pr', 'Developed velocity profile'],
        ['Combined entry (Sieder & Tate)', 'N̄u<sub>D</sub> = 1.86 (Re<sub>D</sub>Pr/(L/D))<sup>1/3</sup>(μ/μ<sub>s</sub>)<sup>0.14</sup>', 'uniform T<sub>s</sub>, 0.48 &lt; Pr &lt; 16 700, N̄u<sub>D</sub> ≥ 3.66'],
        ['Energy balance', 'q = ṁc<sub>p</sub>(T<sub>m,o</sub> − T<sub>m,i</sub>);  uniform T<sub>s</sub>: (T<sub>s</sub> − T<sub>m,o</sub>)/(T<sub>s</sub> − T<sub>m,i</sub>) = exp[−PLh̄/(ṁc<sub>p</sub>)];  q = h̄A<sub>s</sub>ΔT<sub>lm</sub>', '']])}
      <div class="hbgrid">${tab(['Cross-section', 'b/a', 'Nu (uniform q″<sub>s</sub>)', 'Nu (uniform T<sub>s</sub>)', 'f Re<sub>D<sub>h</sub></sub>'], [['Circle', '—', 4.36, 3.66, 64], ['Rectangle', 1.0, 3.61, 2.98, 57], ['Rectangle', 1.43, 3.73, 3.08, 59], ['Rectangle', 2.0, 4.12, 3.39, 62], ['Rectangle', 3.0, 4.79, 3.96, 69], ['Rectangle', 4.0, 5.33, 4.44, 73], ['Rectangle', 8.0, 6.49, 5.60, 82], ['Parallel plates', '∞', 8.23, 7.54, 96], ['Parallel plates, one side insulated', '∞', 5.39, 4.86, 96], ['Equilateral triangle', '—', 3.11, 2.47, 53]], { cap: 'Fully developed laminar flow in ducts (Shah &amp; London)', text: [0, 1] })}
      ${tab(['D<sub>i</sub>/D<sub>o</sub>', 'Nu<sub>i</sub>', 'Nu<sub>o</sub>'], [[0, '—', 3.66], [0.05, 17.46, 4.06], [0.10, 11.56, 4.11], [0.25, 7.37, 4.23], [0.50, 5.74, 4.43], ['≈ 1.00', 4.86, 4.86]], { cap: 'Annulus, fully developed laminar, one surface insulated and the other at uniform temperature (D<sub>h</sub> = D<sub>o</sub> − D<sub>i</sub>)' })}</div>
      ${h3('Flow in tubes: turbulent')}${eqs([
        ['Dittus & Boelter', 'Nu<sub>D</sub> = 0.023 Re<sub>D</sub><sup>4/5</sup>Pr<sup>n</sup>, n = 0.4 heating (T<sub>s</sub> &gt; T<sub>m</sub>), 0.3 cooling', 'Re<sub>D</sub> ≥ 10 000, 0.6 ≤ Pr ≤ 160, L/D ≥ 10; moderate ΔT'],
        ['Sieder & Tate', 'Nu<sub>D</sub> = 0.027 Re<sub>D</sub><sup>4/5</sup>Pr<sup>1/3</sup>(μ/μ<sub>s</sub>)<sup>0.14</sup>', 'Re<sub>D</sub> ≥ 10 000, 0.7 ≤ Pr ≤ 16 700, large property variation'],
        ['Petukhov friction factor (smooth)', 'f = (0.790 ln Re<sub>D</sub> − 1.64)<sup>−2</sup>', '3000 ≤ Re<sub>D</sub> ≤ 5 × 10⁶'],
        ['Gnielinski', 'Nu<sub>D</sub> = (f/8)(Re<sub>D</sub> − 1000)Pr/[1 + 12.7(f/8)<sup>1/2</sup>(Pr<sup>2/3</sup> − 1)]', '0.5 ≤ Pr ≤ 2000, 3000 ≤ Re<sub>D</sub> ≤ 5 × 10⁶; best accuracy'],
        ['Colebrook (rough pipes)', '1/√f = −2.0 log₁₀[(e/D)/3.7 + 2.51/(Re<sub>D</sub>√f)]', 'Moody chart below'],
        ['Haaland (explicit)', '1/√f = −1.8 log₁₀[((e/D)/3.7)<sup>1.11</sup> + 6.9/Re<sub>D</sub>]', 'within 2 % of Colebrook'],
        ['Blasius (smooth)', 'f = 0.316 Re<sub>D</sub><sup>−1/4</sup> (Re<sub>D</sub> ≤ 2 × 10⁴);  f = 0.184 Re<sub>D</sub><sup>−1/5</sup> (Re<sub>D</sub> ≥ 2 × 10⁴)', ''],
        ['Liquid metals, uniform q″<sub>s</sub> (Skupinski)', 'Nu<sub>D</sub> = 4.82 + 0.0185 Pe<sub>D</sub><sup>0.827</sup>', '3.6 × 10³ &lt; Re<sub>D</sub> &lt; 9.05 × 10⁵, 10² &lt; Pe<sub>D</sub> &lt; 10⁴'],
        ['Liquid metals, uniform T<sub>s</sub> (Seban & Shimazaki)', 'Nu<sub>D</sub> = 5.0 + 0.025 Pe<sub>D</sub><sup>0.8</sup>', 'Pe<sub>D</sub> &gt; 100'],
        ['Non-circular ducts and annuli', 'Use D<sub>h</sub> = 4A<sub>c</sub>/P in the turbulent correlations', 'Not accurate for sharp corners in laminar flow']])}
      ${chart({ title: 'Moody chart: Darcy friction factor for pipe flow', cap: 'Laminar f = 64/Re; turbulent curves from the Colebrook equation. Curve label: relative roughness e/D.', x: [600, 1e8], xlog: true, y: [0.006, 0.1], ylog: true, xl: 'Reynolds number Re<tspan dy="4" font-size="9">D</tspan>', yl: 'Friction factor f', xs: 'Re', ys: 'f', curves: H.moody, key: 'e/D', h: 520, mr: 70, minorLab: true })}
      ${tab(['Pipe material', 'Roughness e (mm)'], [['Drawn tubing: glass, copper, brass, plastic', '0.0015'], ['Commercial steel or wrought iron', '0.046'], ['Galvanised iron', '0.15'], ['Cast iron', '0.26'], ['Asphalted cast iron', '0.12'], ['Concrete', '0.3–3.0'], ['Riveted steel', '0.9–9.0']], { text: [0, 1], cap: 'Equivalent sand-grain roughness of commercial pipes' })}` },

    { id: 'free', t: 'Free (natural) convection', f: () => `
      ${note('Ra<sub>L</sub> = gβ(T<sub>s</sub> − T<sub>∞</sub>)L³/(να); properties at T<sub>f</sub> = (T<sub>s</sub> + T<sub>∞</sub>)/2; β = 1/T<sub>f</sub> (K) for an ideal gas, β from the liquid tables otherwise.')}
      ${h3('External free convection')}${eqs([
        ['Vertical plate, isothermal (Churchill & Chu)', 'N̄u<sub>L</sub> = {0.825 + 0.387 Ra<sub>L</sub><sup>1/6</sup>/[1 + (0.492/Pr)<sup>9/16</sup>]<sup>8/27</sup>}²', 'all Ra<sub>L</sub>'],
        ['Vertical plate, laminar (Churchill & Chu)', 'N̄u<sub>L</sub> = 0.68 + 0.670 Ra<sub>L</sub><sup>1/4</sup>/[1 + (0.492/Pr)<sup>9/16</sup>]<sup>4/9</sup>', 'Ra<sub>L</sub> ≤ 10⁹ (slightly better)'],
        ['Vertical plate, simple (McAdams)', 'N̄u<sub>L</sub> = 0.59 Ra<sub>L</sub><sup>1/4</sup> (10⁴–10⁹);  0.10 Ra<sub>L</sub><sup>1/3</sup> (10⁹–10¹³)', 'Transition Ra<sub>L</sub> ≈ 10⁹'],
        ['Vertical plate, uniform heat flux', 'Use Churchill & Chu with ΔT at L/2; or Nu<sub>x</sub> = 0.60(Gr*<sub>x</sub>Pr)<sup>1/5</sup>, Gr*<sub>x</sub> = gβq″x⁴/(kν²)', '10⁵ &lt; Gr*<sub>x</sub>Pr &lt; 10¹¹'],
        ['Vertical cylinder', 'As a vertical plate when D/L ≥ 35/Gr<sub>L</sub><sup>1/4</sup>', ''],
        ['Inclined plate, angle θ from vertical', 'Replace g by g cos θ for the lower surface of a hot plate (upper surface of a cold plate)', '0 ≤ θ ≤ 60°'],
        ['Horizontal plate: upper surface of hot plate or lower surface of cold plate', 'N̄u<sub>L</sub> = 0.54 Ra<sub>L</sub><sup>1/4</sup> (10⁴–10⁷, Pr ≥ 0.7);  0.15 Ra<sub>L</sub><sup>1/3</sup> (10⁷–10¹¹, all Pr)', 'L = A<sub>s</sub>/P'],
        ['Horizontal plate: lower surface of hot plate or upper surface of cold plate', 'N̄u<sub>L</sub> = 0.52 Ra<sub>L</sub><sup>1/5</sup>', '10⁴ ≤ Ra<sub>L</sub> ≤ 10⁹, Pr ≥ 0.7'],
        ['Long horizontal cylinder (Churchill & Chu)', 'N̄u<sub>D</sub> = {0.60 + 0.387 Ra<sub>D</sub><sup>1/6</sup>/[1 + (0.559/Pr)<sup>9/16</sup>]<sup>8/27</sup>}²', 'Ra<sub>D</sub> ≤ 10¹²'],
        ['Long horizontal cylinder (Morgan)', 'N̄u<sub>D</sub> = C Ra<sub>D</sub><sup>n</sup>', 'C, n below'],
        ['Sphere (Churchill)', 'N̄u<sub>D</sub> = 2 + 0.589 Ra<sub>D</sub><sup>1/4</sup>/[1 + (0.469/Pr)<sup>9/16</sup>]<sup>4/9</sup>', 'Ra<sub>D</sub> ≤ 10¹¹, Pr ≥ 0.7'],
        ['Simplified relations for air at 1 atm (h in W/m²·K, ΔT in K, L in m)', 'Vertical plate: h = 1.42(ΔT/L)<sup>1/4</sup> laminar, 1.31ΔT<sup>1/3</sup> turbulent;  horizontal cylinder: h = 1.32(ΔT/D)<sup>1/4</sup>', 'Rough estimates']])}
      ${tab(['Ra<sub>D</sub>', 'C', 'n'], [['10⁻¹⁰–10⁻²', 0.675, 0.058], ['10⁻²–10²', 1.02, 0.148], ['10²–10⁴', 0.850, 0.188], ['10⁴–10⁷', 0.480, 0.250], ['10⁷–10¹²', 0.125, 0.333]], { cap: 'Morgan constants, horizontal cylinder' })}
      ${h3('Enclosures')}${eqs([
        ['Vertical rectangular cavity, height H, gap L (Catton)', 'N̄u<sub>L</sub> = 0.22 [Pr Ra<sub>L</sub>/(0.2 + Pr)]<sup>0.28</sup>(H/L)<sup>−1/4</sup>', '2 &lt; H/L &lt; 10, Pr &lt; 10⁵, 10³ &lt; Ra<sub>L</sub> &lt; 10¹⁰'],
        ['', 'N̄u<sub>L</sub> = 0.18 [Pr Ra<sub>L</sub>/(0.2 + Pr)]<sup>0.29</sup>', '1 &lt; H/L &lt; 2, 10⁻³ &lt; Pr &lt; 10⁵, 10³ &lt; Ra<sub>L</sub>Pr/(0.2 + Pr)'],
        ['Vertical cavity, tall (MacGregor & Emery)', 'N̄u<sub>L</sub> = 0.42 Ra<sub>L</sub><sup>1/4</sup>Pr<sup>0.012</sup>(H/L)<sup>−0.3</sup>', '10 &lt; H/L &lt; 40, 1 &lt; Pr &lt; 2 × 10⁴, 10⁴ &lt; Ra<sub>L</sub> &lt; 10⁷'],
        ['', 'N̄u<sub>L</sub> = 0.046 Ra<sub>L</sub><sup>1/3</sup>', '1 &lt; H/L &lt; 40, 1 &lt; Pr &lt; 20, 10⁶ &lt; Ra<sub>L</sub> &lt; 10⁹'],
        ['Horizontal cavity heated from below (Globe & Dropkin)', 'N̄u<sub>L</sub> = 0.069 Ra<sub>L</sub><sup>1/3</sup>Pr<sup>0.074</sup>', '3 × 10⁵ &lt; Ra<sub>L</sub> &lt; 7 × 10⁹; Nu = 1 for Ra<sub>L</sub> &lt; 1708'],
        ['Heat rate across a cavity', 'q = h̄A(T₁ − T₂) = N̄u<sub>L</sub>(k/L)A(T₁ − T₂)', 'Ra<sub>L</sub> based on the gap L and T₁ − T₂'],
        ['Concentric cylinders (Raithby & Hollands)', 'k<sub>eff</sub>/k = 0.386 [Pr/(0.861 + Pr)]<sup>1/4</sup>Ra<sub>c</sub><sup>1/4</sup>;  Ra<sub>c</sub> = [ln(D<sub>o</sub>/D<sub>i</sub>)]⁴Ra<sub>L</sub>/[L³(D<sub>i</sub><sup>−3/5</sup> + D<sub>o</sub><sup>−3/5</sup>)⁵]', 'L = (D<sub>o</sub> − D<sub>i</sub>)/2; q′ = 2πk<sub>eff</sub>(T<sub>i</sub> − T<sub>o</sub>)/ln(D<sub>o</sub>/D<sub>i</sub>); 10² ≤ Ra<sub>c</sub> ≤ 10⁷'],
        ['Concentric spheres (Raithby & Hollands)', 'k<sub>eff</sub>/k = 0.74 [Pr/(0.861 + Pr)]<sup>1/4</sup>Ra<sub>s</sub><sup>1/4</sup>;  Ra<sub>s</sub> = L Ra<sub>L</sub>/[D<sub>o</sub>⁴D<sub>i</sub>⁴(D<sub>i</sub><sup>−7/5</sup> + D<sub>o</sub><sup>−7/5</sup>)⁵]', 'q = πk<sub>eff</sub>D<sub>i</sub>D<sub>o</sub>(T<sub>i</sub> − T<sub>o</sub>)/L; 10² ≤ Ra<sub>s</sub> ≤ 10⁴']])}
      ${h3('Combined free and forced convection')}${eqs([
        ['Regime', 'Gr<sub>L</sub>/Re<sub>L</sub>² ≪ 1: forced;  ≫ 1: free;  ≈ 1: mixed', ''],
        ['Mixed convection', 'Nu<sup>n</sup> = Nu<sub>F</sub><sup>n</sup> ± Nu<sub>N</sub><sup>n</sup>,  n ≈ 3 (n = 3.5 transverse flow over spheres, 4 for cylinders)', '+ assisting or transverse, − opposing']])}` },

    { id: 'phase', t: 'Boiling and condensation', f: () => `
      ${note('Liquid properties at T<sub>sat</sub>; vapour properties at the film temperature T<sub>f</sub> = (T<sub>s</sub> + T<sub>sat</sub>)/2 for film boiling and condensate film. Excess temperature ΔT<sub>e</sub> = T<sub>s</sub> − T<sub>sat</sub>. Saturated water properties (h<sub>fg</sub>, σ, ρ<sub>l</sub>, ρ<sub>v</sub>) are in the Properties of liquids chapter.')}
      ${h3('Pool boiling')}${eqs([
        ['Nucleate boiling (Rohsenow)', 'q″<sub>s</sub> = μ<sub>l</sub>h<sub>fg</sub>[g(ρ<sub>l</sub> − ρ<sub>v</sub>)/σ]<sup>1/2</sup>[c<sub>p,l</sub>ΔT<sub>e</sub>/(C<sub>s,f</sub>h<sub>fg</sub>Pr<sub>l</sub><sup>n</sup>)]³', 'C<sub>s,f</sub>, n below; accuracy ±100 % on q″ (±30 % on ΔT<sub>e</sub>)'],
        ['Critical (maximum) heat flux (Zuber)', 'q″<sub>max</sub> = C h<sub>fg</sub>ρ<sub>v</sub>[σg(ρ<sub>l</sub> − ρ<sub>v</sub>)/ρ<sub>v</sub>²]<sup>1/4</sup>', 'C = 0.149 (Lienhard & Dhir, large horizontal surfaces); Zuber: π/24 = 0.131; other geometries below'],
        ['Subcooling (Ivey & Morris)', 'q″<sub>max,sub</sub>/q″<sub>max</sub> = 1 + 0.1(ρ<sub>v</sub>/ρ<sub>l</sub>)<sup>1/4</sup>[c<sub>p,l</sub>(T<sub>sat</sub> − T<sub>l</sub>)/h<sub>fg</sub>]', ''],
        ['Minimum heat flux, Leidenfrost (Zuber)', 'q″<sub>min</sub> = 0.09 ρ<sub>v</sub>h<sub>fg</sub>[gσ(ρ<sub>l</sub> − ρ<sub>v</sub>)/(ρ<sub>l</sub> + ρ<sub>v</sub>)²]<sup>1/4</sup>', 'large horizontal plate'],
        ['Film boiling (Bromley)', 'N̄u<sub>D</sub> = h̄<sub>conv</sub>D/k<sub>v</sub> = C[g(ρ<sub>l</sub> − ρ<sub>v</sub>)h′<sub>fg</sub>D³/(ν<sub>v</sub>k<sub>v</sub>ΔT<sub>e</sub>)]<sup>1/4</sup>', 'C = 0.62 horizontal cylinder, 0.67 sphere; h′<sub>fg</sub> = h<sub>fg</sub> + 0.80c<sub>p,v</sub>ΔT<sub>e</sub>'],
        ['Film boiling with radiation', 'h̄<sup>4/3</sup> = h̄<sub>conv</sub><sup>4/3</sup> + h̄<sub>rad</sub>h̄<sup>1/3</sup>;  h̄<sub>rad</sub> = εσ(T<sub>s</sub>⁴ − T<sub>sat</sub>⁴)/(T<sub>s</sub> − T<sub>sat</sub>)', 'h̄ ≈ h̄<sub>conv</sub> + 0.75h̄<sub>rad</sub> if h̄<sub>rad</sub> &lt; h̄<sub>conv</sub>'],
        ['Forced convection inside tubes (Chen-type)', 'h = S h<sub>nb</sub> + F h<sub>l</sub>', 'see specialist texts']])}
      <div class="hbgrid">${tab(['Fluid–surface combination', 'C<sub>s,f</sub>', 'n'], [['Water–copper, scored', 0.0068, 1.0], ['Water–copper, polished', 0.0128, 1.0], ['Water–stainless steel, chemically etched', 0.0133, 1.0], ['Water–stainless steel, mechanically polished', 0.0132, 1.0], ['Water–stainless steel, ground and polished', 0.0080, 1.0], ['Water–brass', 0.0060, 1.0], ['Water–nickel', 0.006, 1.0], ['Water–platinum', 0.0130, 1.0], ['n-Pentane–copper, polished', 0.0154, 1.7], ['n-Pentane–copper, lapped', 0.0049, 1.7], ['n-Pentane–chromium', 0.015, 1.7], ['Benzene–chromium', 0.0101, 1.7], ['Ethyl alcohol–chromium', 0.0027, 1.7], ['Carbon tetrachloride–copper', 0.0130, 1.7], ['Isopropanol–copper', 0.0025, 1.7], ['n-Butanol–copper', 0.0030, 1.7]], { cap: 'Rohsenow constants (Vachon et al.; Pioro)' })}
      ${tab(['Heater geometry', 'C in q″<sub>max</sub>', 'Size parameter', 'Range'], [['Large horizontal flat heater', '0.149', 'L* = L[g(ρ<sub>l</sub> − ρ<sub>v</sub>)/σ]<sup>1/2</sup> (L = width or diameter)', 'L* &gt; 27'], ['Large horizontal cylinder', '0.12', 'R* = r[g(ρ<sub>l</sub> − ρ<sub>v</sub>)/σ]<sup>1/2</sup>', 'R* &gt; 1.2'], ['Small horizontal cylinder', '0.12 R*<sup>−0.25</sup>', 'R*', '0.15 &lt; R* &lt; 1.2'], ['Large sphere', '0.11', 'R*', 'R* &gt; 4.26'], ['Small sphere', '0.227 R*<sup>−0.5</sup>', 'R*', '0.15 &lt; R* &lt; 4.26']], { cap: 'Critical heat flux constant for other geometries (Lienhard &amp; Dhir; Sun &amp; Lienhard)', text: [0, 1, 2, 3] })}</div>
      ${h3('Film condensation')}${eqs([
        ['Vertical plate or tube, laminar (Nusselt)', 'h̄<sub>L</sub> = 0.943[gρ<sub>l</sub>(ρ<sub>l</sub> − ρ<sub>v</sub>)k<sub>l</sub>³h′<sub>fg</sub>/(μ<sub>l</sub>(T<sub>sat</sub> − T<sub>s</sub>)L)]<sup>1/4</sup>', 'h′<sub>fg</sub> = h<sub>fg</sub> + 0.68c<sub>p,l</sub>(T<sub>sat</sub> − T<sub>s</sub>); liquid properties at T<sub>f</sub>'],
        ['Film Reynolds number', 'Re<sub>δ</sub> = 4Γ/μ<sub>l</sub> = 4ṁ/(μ<sub>l</sub>b);  ṁ = q/h′<sub>fg</sub> = h̄<sub>L</sub>A(T<sub>sat</sub> − T<sub>s</sub>)/h′<sub>fg</sub>', 'b = plate width or πD'],
        ['Laminar, wave-free', 'h̄<sub>L</sub>(ν<sub>l</sub>²/g)<sup>1/3</sup>/k<sub>l</sub> = 1.47 Re<sub>δ</sub><sup>−1/3</sup>', 'Re<sub>δ</sub> ≤ 30'],
        ['Wavy laminar (Kutateladze)', 'h̄<sub>L</sub>(ν<sub>l</sub>²/g)<sup>1/3</sup>/k<sub>l</sub> = Re<sub>δ</sub>/(1.08 Re<sub>δ</sub><sup>1.22</sup> − 5.2)', '30 ≤ Re<sub>δ</sub> ≤ 1800'],
        ['Turbulent (Labuntsov)', 'h̄<sub>L</sub>(ν<sub>l</sub>²/g)<sup>1/3</sup>/k<sub>l</sub> = Re<sub>δ</sub>/[8750 + 58 Pr<sub>l</sub><sup>−0.5</sup>(Re<sub>δ</sub><sup>0.75</sup> − 253)]', 'Re<sub>δ</sub> ≥ 1800'],
        ['Inclined plate, angle θ from vertical', 'Replace g by g cos θ', 'laminar'],
        ['Single horizontal tube, outside', 'h̄<sub>D</sub> = 0.729[gρ<sub>l</sub>(ρ<sub>l</sub> − ρ<sub>v</sub>)k<sub>l</sub>³h′<sub>fg</sub>/(μ<sub>l</sub>(T<sub>sat</sub> − T<sub>s</sub>)D)]<sup>1/4</sup>', 'Sphere: C = 0.826'],
        ['Vertical column of N horizontal tubes', 'h̄<sub>D,N</sub> = h̄<sub>D</sub>N<sup>−1/4</sup>', 'conservative (Kern: N<sup>−1/6</sup>)'],
        ['Inside horizontal tubes, low vapour velocity (Chato)', 'h̄<sub>D</sub> = 0.555[gρ<sub>l</sub>(ρ<sub>l</sub> − ρ<sub>v</sub>)k<sub>l</sub>³h′<sub>fg</sub>/(μ<sub>l</sub>(T<sub>sat</sub> − T<sub>s</sub>)D)]<sup>1/4</sup>', 'h′<sub>fg</sub> = h<sub>fg</sub> + 0.375c<sub>p,l</sub>(T<sub>sat</sub> − T<sub>s</sub>); Re<sub>v,i</sub> = ρ<sub>v</sub>u<sub>m,v</sub>D/μ<sub>v</sub> &lt; 35 000'],
        ['Dropwise condensation of steam on copper (Griffith)', 'h̄ = 51 104 + 2044 T<sub>sat</sub> (°C) for 22 °C &lt; T<sub>sat</sub> &lt; 100 °C;  h̄ = 255 310 for T<sub>sat</sub> &gt; 100 °C', 'W/m²·K']])}
      ${tab(['Process', 'h (W/m²·K)'], [['Free convection, gases', '2–25'], ['Free convection, liquids', '50–1000'], ['Forced convection, gases', '25–250'], ['Forced convection, liquids', '100–20 000'], ['Boiling, water', '2500–100 000'], ['Film condensation, steam', '5000–25 000'], ['Dropwise condensation, steam', '30 000–200 000'], ['Condensation, refrigerants', '1000–5000']], { text: [0, 1], cap: 'Typical heat transfer coefficients' })}` },

    { id: 'rad', t: 'Radiation', f: () => `
      ${h3('Blackbody radiation')}${eqs([
        ['Planck distribution', 'E<sub>λ,b</sub>(λ, T) = C₁/{λ⁵[exp(C₂/λT) − 1]}', 'C₁ = 3.742 × 10⁸ W·µm⁴/m², C₂ = 1.4388 × 10⁴ µm·K'],
        ['Wien displacement law', 'λ<sub>max</sub>T = 2897.8 µm·K', ''],
        ['Stefan–Boltzmann law', 'E<sub>b</sub> = σT⁴,  σ = 5.670 × 10⁻⁸ W/m²·K⁴;  I<sub>b</sub> = E<sub>b</sub>/π', ''],
        ['Band emission', 'F<sub>(λ₁→λ₂)</sub> = F<sub>(0→λ₂T)</sub> − F<sub>(0→λ₁T)</sub>', 'table below'],
        ['Real surfaces', 'E = εσT⁴;  α + ρ + τ = 1 (opaque: α + ρ = 1);  Kirchhoff: ε<sub>λ</sub> = α<sub>λ</sub>, and ε = α for a grey surface', ''],
        ['Irradiation and radiosity', 'J = εE<sub>b</sub> + ρG;  q″<sub>net</sub> = J − G', '']])}
      ${calcBlock('bbf', 'Blackbody fraction at one wavelength')}${calcBlock('bband', 'Fraction of emission in a band')}
      ${h3('Blackbody radiation functions')}<p class="hbsrc">Computed from the Planck distribution (series of Chang &amp; Rhee).</p>${look(H.bbf)}
      ${h3('Total emissivity of surfaces')}<p class="hbsrc">Sources: Incropera Table A.11; Çengel &amp; Ghajar Table A-18; Siegel &amp; Howell. Emissivity depends strongly on surface finish and oxidation: treat values as typical.</p>${tab(['Surface', 'T (K)', 'ε'], EMIS, { text: [0, 1, 2] })}
      ${h3('Solar absorptivity and emissivity')}<p class="hbsrc">Sources: Incropera Table A.12; Duffie &amp; Beckman. ε at about 300 K.</p>${tab(['Surface', 'α<sub>s</sub>', 'ε', 'α<sub>s</sub>/ε'], SOLAR.map(r => [r[0], r[1], r[2], U.sig(r[1] / r[2], 3)]))}
      ${h3('View factor relations')}${eqs([
        ['Reciprocity', 'A<sub>i</sub>F<sub>ij</sub> = A<sub>j</sub>F<sub>ji</sub>', ''], ['Summation (enclosure)', 'Σ<sub>j</sub>F<sub>ij</sub> = 1', 'F<sub>ii</sub> = 0 for flat or convex surfaces'], ['Superposition', 'F<sub>i(j,k)</sub> = F<sub>ij</sub> + F<sub>ik</sub>', ''],
        ['Symmetry', 'surfaces seen identically by i share F equally', ''],
        ['Crossed-strings method (2-D)', 'F<sub>12</sub> = [(crossed strings) − (uncrossed strings)]/(2 × length of surface 1)', 'infinitely long surfaces']])}
      ${h3('Two-dimensional geometries (infinitely long)')}${eqs([
        ['Parallel plates with midlines connected by a perpendicular, widths w<sub>i</sub>, w<sub>j</sub>, spacing L', 'F<sub>ij</sub> = {[(W<sub>i</sub> + W<sub>j</sub>)² + 4]<sup>1/2</sup> − [(W<sub>j</sub> − W<sub>i</sub>)² + 4]<sup>1/2</sup>}/(2W<sub>i</sub>)', 'W<sub>i</sub> = w<sub>i</sub>/L, W<sub>j</sub> = w<sub>j</sub>/L'],
        ['Inclined plates of equal width w with a common edge, angle α', 'F<sub>ij</sub> = 1 − sin(α/2)', ''],
        ['Perpendicular plates with a common edge, widths w<sub>i</sub>, w<sub>j</sub>', 'F<sub>ij</sub> = {1 + w<sub>j</sub>/w<sub>i</sub> − [1 + (w<sub>j</sub>/w<sub>i</sub>)²]<sup>1/2</sup>}/2', ''],
        ['Three-sided enclosure', 'F<sub>ij</sub> = (w<sub>i</sub> + w<sub>j</sub> − w<sub>k</sub>)/(2w<sub>i</sub>)', ''],
        ['Parallel cylinders of different radii, centres s apart', 'F<sub>ij</sub> = (1/2π){π + [C² − (R + 1)²]<sup>1/2</sup> − [C² − (R − 1)²]<sup>1/2</sup> + (R − 1)cos⁻¹[(R/C) − (1/C)] − (R + 1)cos⁻¹[(R/C) + (1/C)]}', 'R = r<sub>j</sub>/r<sub>i</sub>, S = s/r<sub>i</sub>, C = 1 + R + S'],
        ['Long cylinder of radius r and a parallel strip from s₂ to s₁, axis at distance L from the strip plane', 'F<sub>strip→cyl</sub> = r[tan⁻¹(s₁/L) − tan⁻¹(s₂/L)]/(s₁ − s₂);  F<sub>cyl→strip</sub> = [tan⁻¹(s₁/L) − tan⁻¹(s₂/L)]/(2π)', 's measured along the strip from the foot of the perpendicular'],
        ['Infinite plane and a row of cylinders, diameter D, pitch s', 'F<sub>ij</sub> = 1 − [1 − (D/s)²]<sup>1/2</sup> + (D/s)tan⁻¹[(s² − D²)/D²]<sup>1/2</sup>', 'plane to row']])}
      ${h3('Three-dimensional geometries')}${eqs([
        ['Aligned parallel rectangles a × b, distance L', 'F<sub>ij</sub> = (2/πX̄Ȳ){ln[(1 + X̄²)(1 + Ȳ²)/(1 + X̄² + Ȳ²)]<sup>1/2</sup> + X̄(1 + Ȳ²)<sup>1/2</sup>tan⁻¹[X̄/(1 + Ȳ²)<sup>1/2</sup>] + Ȳ(1 + X̄²)<sup>1/2</sup>tan⁻¹[Ȳ/(1 + X̄²)<sup>1/2</sup>] − X̄ tan⁻¹X̄ − Ȳ tan⁻¹Ȳ}', 'X̄ = a/L, Ȳ = b/L'],
        ['Coaxial parallel discs r<sub>i</sub>, r<sub>j</sub>, distance L', 'F<sub>ij</sub> = ½{S − [S² − 4(r<sub>j</sub>/r<sub>i</sub>)²]<sup>1/2</sup>},  S = 1 + (1 + R<sub>j</sub>²)/R<sub>i</sub>²', 'R<sub>i</sub> = r<sub>i</sub>/L, R<sub>j</sub> = r<sub>j</sub>/L'],
        ['Perpendicular rectangles with a common edge X; i: width Y (base), j: height Z', 'F<sub>ij</sub> = (1/πW){W tan⁻¹(1/W) + H tan⁻¹(1/H) − (H² + W²)<sup>1/2</sup>tan⁻¹(H² + W²)<sup>−1/2</sup> + ¼ ln{[(1 + W²)(1 + H²)/(1 + W² + H²)] × [W²(1 + W² + H²)/((1 + W²)(W² + H²))]<sup>W²</sup> × [H²(1 + H² + W²)/((1 + H²)(H² + W²))]<sup>H²</sup>}}', 'H = Z/X, W = Y/X'],
        ['Small sphere to a large concentric sphere or any enclosing surface', 'F<sub>12</sub> = 1', ''], ['Sphere of radius r to a coaxial disc of radius a at distance h', 'F<sub>12</sub> = ½[1 − 1/(1 + (a/h)²)<sup>1/2</sup>]', ''],
        ['Differential area to a parallel coaxial disc of radius a at distance h', 'F<sub>d1→2</sub> = a²/(h² + a²)', '']])}
      ${calcBlock('vf', 'View factor calculator')}
      ${chart({ title: 'View factor between aligned parallel rectangles', cap: 'Curve label: Ȳ = b/L.', x: [0.1, 20], xlog: true, y: [0, 1], ystep: 0.1, xl: 'X̄ = a/L', yl: 'F<tspan dy="4" font-size="9">ij</tspan>', xs: 'X', ys: 'F', curves: H.vf.parallel, key: 'Ȳ', minorLab: true })}
      ${chart({ title: 'View factor between coaxial parallel discs', cap: 'Curve label: r<sub>j</sub>/L.', x: [0.1, 10], xlog: true, y: [0, 1], ystep: 0.1, xl: 'L/r<tspan dy="4" font-size="9">i</tspan>', yl: 'F<tspan dy="4" font-size="9">ij</tspan>', xs: 'L/r_i', ys: 'F', curves: H.vf.discs, key: 'r_j/L', minorLab: true, labAt: (p, c, i) => p[Math.min(p.length - 1, 22 + (i % 3) * 8)], labDx: 2, labDy: -2 })}
      ${chart({ title: 'View factor between perpendicular rectangles with a common edge', cap: 'Curve label: W = Y/X (Y = width of surface i, Z = height of surface j, X = common edge); H = Z/X.', x: [0.1, 10], xlog: true, y: [0, 0.5], ystep: 0.05, xl: 'H = Z/X', yl: 'F<tspan dy="4" font-size="9">ij</tspan>', xs: 'H', ys: 'F', curves: H.vf.perp, key: 'W', minorLab: true })}
      ${h3('Radiation exchange between grey diffuse surfaces')}${eqs([
        ['Surface resistance', 'q<sub>i</sub> = (E<sub>b,i</sub> − J<sub>i</sub>)/[(1 − ε<sub>i</sub>)/(ε<sub>i</sub>A<sub>i</sub>)]', ''], ['Space resistance', 'q<sub>ij</sub> = (J<sub>i</sub> − J<sub>j</sub>)/(1/(A<sub>i</sub>F<sub>ij</sub>))', ''],
        ['Two-surface enclosure', 'q₁₂ = σ(T₁⁴ − T₂⁴)/[(1 − ε₁)/(ε₁A₁) + 1/(A₁F₁₂) + (1 − ε₂)/(ε₂A₂)]', ''],
        ['Large parallel planes', 'q″₁₂ = σ(T₁⁴ − T₂⁴)/(1/ε₁ + 1/ε₂ − 1)', ''],
        ['Long concentric cylinders (r₁ inside r₂)', 'q′₁₂ = 2πr₁σ(T₁⁴ − T₂⁴)/[1/ε₁ + ((1 − ε₂)/ε₂)(r₁/r₂)]', ''],
        ['Concentric spheres', 'q₁₂ = 4πr₁²σ(T₁⁴ − T₂⁴)/[1/ε₁ + ((1 − ε₂)/ε₂)(r₁/r₂)²]', ''],
        ['Small convex body in a large cavity', 'q₁₂ = ε₁A₁σ(T₁⁴ − T₂⁴)', 'A₁/A₂ → 0'],
        ['N radiation shields between parallel planes, all of emissivity ε', 'q″ = σ(T₁⁴ − T₂⁴)/[(N + 1)(2/ε − 1)]', 'shield emissivities ε<sub>s</sub>: add N(1/ε<sub>s,1</sub> + 1/ε<sub>s,2</sub> − 1) to the denominator of the two-plane result'],
        ['Reradiating (insulated) surface R', 'J<sub>R</sub> = E<sub>b,R</sub>;  q₁ = (E<sub>b1</sub> − E<sub>b2</sub>)/{R<sub>1</sub> + [A₁F₁₂ + (1/(A₁F₁R) + 1/(A₂F₂R))<sup>−1</sup>]<sup>−1</sup> + R<sub>2</sub>}', 'R<sub>i</sub> = (1 − ε<sub>i</sub>)/(ε<sub>i</sub>A<sub>i</sub>)']])}
      ${h3('Gas radiation: mean beam lengths')}<p class="hbsrc">Source: Hottel; Incropera Table 13.4. Emissivity of H₂O–CO₂ mixtures from Hottel or Leckner charts as functions of p<sub>g</sub>L<sub>e</sub> and T<sub>g</sub>.</p>
      ${tab(['Geometry', 'Characteristic length', 'L<sub>e</sub>'], [['Sphere, radiation to surface', 'diameter D', '0.65D'], ['Infinite circular cylinder, to curved surface', 'diameter D', '0.95D'], ['Semi-infinite circular cylinder, to base', 'diameter D', '0.65D'], ['Circular cylinder of equal height and diameter, to entire surface', 'diameter D', '0.60D'], ['Infinite parallel planes, to planes', 'spacing L', '1.80L'], ['Cube, to any surface', 'side L', '0.66L'], ['Arbitrary shape of volume V and surface area A, to surface', 'V/A', '3.6V/A']], { text: [0, 1, 2] })}` },

    { id: 'hx', t: 'Heat exchangers', f: () => `
      ${h3('Basic relations')}${eqs([
        ['Heat rate', 'q = ṁ<sub>h</sub>c<sub>p,h</sub>(T<sub>h,i</sub> − T<sub>h,o</sub>) = ṁ<sub>c</sub>c<sub>p,c</sub>(T<sub>c,o</sub> − T<sub>c,i</sub>) = UAΔT<sub>lm</sub>', 'with condensation: q = ṁh<sub>fg</sub>'],
        ['Log mean temperature difference', 'ΔT<sub>lm</sub> = (ΔT₁ − ΔT₂)/ln(ΔT₁/ΔT₂)', 'parallel: ΔT₁ = T<sub>h,i</sub> − T<sub>c,i</sub>, ΔT₂ = T<sub>h,o</sub> − T<sub>c,o</sub>;  counter: ΔT₁ = T<sub>h,i</sub> − T<sub>c,o</sub>, ΔT₂ = T<sub>h,o</sub> − T<sub>c,i</sub>'],
        ['Multipass and cross flow', 'ΔT<sub>lm</sub> = F ΔT<sub>lm,CF</sub>', 'F from the charts; P = (t<sub>o</sub> − t<sub>i</sub>)/(T<sub>i</sub> − t<sub>i</sub>), R = (T<sub>i</sub> − T<sub>o</sub>)/(t<sub>o</sub> − t<sub>i</sub>); t = tube fluid, T = shell fluid'],
        ['Effectiveness', 'ε = q/q<sub>max</sub>,  q<sub>max</sub> = C<sub>min</sub>(T<sub>h,i</sub> − T<sub>c,i</sub>)', 'C = ṁc<sub>p</sub>'],
        ['Number of transfer units', 'NTU = UA/C<sub>min</sub>;  C<sub>r</sub> = C<sub>min</sub>/C<sub>max</sub>', ''],
        ['1-2 exchanger correction (Bowman)', 'F = [√(R² + 1)/(R − 1)] ln[(1 − P)/(1 − PR)] / ln{[2 − P(R + 1 − √(R² + 1))]/[2 − P(R + 1 + √(R² + 1))]}', 'R ≠ 1']])}
      ${h3('Effectiveness relations')}${eqs([
        ['Parallel flow', 'ε = [1 − exp(−NTU(1 + C<sub>r</sub>))]/(1 + C<sub>r</sub>)', 'NTU = −ln[1 − ε(1 + C<sub>r</sub>)]/(1 + C<sub>r</sub>)'],
        ['Counter flow', 'ε = [1 − exp(−NTU(1 − C<sub>r</sub>))]/[1 − C<sub>r</sub>exp(−NTU(1 − C<sub>r</sub>))] (C<sub>r</sub> &lt; 1);  ε = NTU/(1 + NTU) (C<sub>r</sub> = 1)', 'NTU = [1/(C<sub>r</sub> − 1)] ln[(ε − 1)/(εC<sub>r</sub> − 1)]'],
        ['Shell and tube, one shell pass, 2, 4 … tube passes', 'ε₁ = 2{1 + C<sub>r</sub> + (1 + C<sub>r</sub>²)<sup>1/2</sup>[1 + exp(−NTU₁(1 + C<sub>r</sub>²)<sup>1/2</sup>)]/[1 − exp(−NTU₁(1 + C<sub>r</sub>²)<sup>1/2</sup>)]}<sup>−1</sup>', ''],
        ['n shell passes, 2n, 4n … tube passes', 'ε = {[(1 − ε₁C<sub>r</sub>)/(1 − ε₁)]<sup>n</sup> − 1}{[(1 − ε₁C<sub>r</sub>)/(1 − ε₁)]<sup>n</sup> − C<sub>r</sub>}<sup>−1</sup>', 'NTU per shell = NTU/n'],
        ['Cross flow, both fluids unmixed', 'ε ≈ 1 − exp[(1/C<sub>r</sub>)NTU<sup>0.22</sup>{exp[−C<sub>r</sub>NTU<sup>0.78</sup>] − 1}]', 'charts and calculator use the exact series'],
        ['Cross flow, C<sub>max</sub> mixed, C<sub>min</sub> unmixed', 'ε = (1/C<sub>r</sub>){1 − exp[−C<sub>r</sub>(1 − exp(−NTU))]}', ''],
        ['Cross flow, C<sub>min</sub> mixed, C<sub>max</sub> unmixed', 'ε = 1 − exp(−C<sub>r</sub><sup>−1</sup>{1 − exp[−C<sub>r</sub>NTU]})', ''],
        ['All exchangers with C<sub>r</sub> = 0 (boiler, condenser)', 'ε = 1 − exp(−NTU)', '']])}
      ${calcBlock('entu', 'Effectiveness calculator')}
      ${Object.entries(H.entu).map(([k, v]) => chart({ title: `Effectiveness: ${v.name}`, cap: 'Curve label: C<sub>r</sub> = C<sub>min</sub>/C<sub>max</sub>.', x: [0, 5], y: [0, 1], xstep: 0.5, ystep: 0.1, xl: 'NTU = UA/C<tspan dy="4" font-size="9">min</tspan>', yl: 'Effectiveness ε', xs: 'NTU', ys: 'ε', curves: v.curves, key: 'C_r', h: 380 })).join('')}
      ${Object.entries(H.Ffac).map(([k, v]) => chart({ title: `LMTD correction factor: ${v.name}`, cap: 'Curve label: R = (T<sub>i</sub> − T<sub>o</sub>)/(t<sub>o</sub> − t<sub>i</sub>). Computed from the exact effectiveness relations.', x: [0, 1], y: [0.5, 1], xstep: 0.1, ystep: 0.05, xl: 'P = (t<tspan dy="4" font-size="9">o</tspan><tspan dy="-4"> − t</tspan><tspan dy="4" font-size="9">i</tspan><tspan dy="-4">)/(T</tspan><tspan dy="4" font-size="9">i</tspan><tspan dy="-4"> − t</tspan><tspan dy="4" font-size="9">i</tspan><tspan dy="-4">)</tspan>', yl: 'Correction factor F', xs: 'P', ys: 'F', curves: v.curves, key: 'R', h: 420, labAt: p => p.find(q => q[1] < 0.8) || p[p.length - 1], labDx: 3, labDy: -2 })).join('')}
      ${h3('Typical overall heat transfer coefficients')}<div class="hbgrid">${tab(['Fluid combination', 'U (W/m²·K)'], [['Water to water', '850–1700'], ['Water to oil', '110–350'], ['Water to gasoline or kerosene', '300–1000'], ['Feedwater heaters', '1000–8500'], ['Steam to light fuel oil', '200–400'], ['Steam to heavy fuel oil', '50–200'], ['Steam condenser (water in tubes)', '1000–6000'], ['Ammonia condenser (water in tubes)', '800–1400'], ['Alcohol condenser (water in tubes)', '250–700'], ['Refrigerant condenser (water in tubes)', '300–1000'], ['Gas to gas', '10–40'], ['Water to air in finned tubes (water in tubes)', '30–60 (on air-side area 400–850 bare tube)'], ['Steam to air in finned tubes', '30–300 (bare tube 400–4000)']], { text: [0, 1], cap: 'Sources: Incropera Table 11.2; Çengel Table 11-1' })}
      ${tab(['Fluid', 'R″<sub>f</sub> (m²·K/W)'], [['Seawater and treated boiler feedwater, below 50 °C', '0.0001'], ['Seawater and treated boiler feedwater, above 50 °C', '0.0002'], ['River water, below 50 °C', '0.0002–0.001'], ['Distilled water, closed-loop', '0.0001'], ['City or well water, below 50 °C', '0.0002'], ['Fuel oil', '0.0009'], ['Engine oil (lubricating)', '0.0002'], ['Quench oil', '0.0007'], ['Refrigerating liquids', '0.0002'], ['Refrigerant vapour (oil bearing)', '0.0004'], ['Steam, oil-free', '0.0001'], ['Steam, exhaust (oil bearing)', '0.0002'], ['Industrial air', '0.0004'], ['Alcohol vapour', '0.0001']], { text: [0, 1], cap: 'Representative fouling factors (TEMA; Incropera Table 11.1)' })}</div>` },

    { id: 'mass', t: 'Mass transfer', f: () => `
      ${h3('Diffusion and convection relations')}${eqs([
        ['Fick law (binary, stationary medium)', 'j<sub>A</sub> = −ρD<sub>AB</sub>dm<sub>A</sub>/dx;  J*<sub>A</sub> = −CD<sub>AB</sub>dx<sub>A</sub>/dx', 'm: mass fraction, x: mole fraction'],
        ['Stationary plane layer', 'ṁ<sub>A</sub> = ρD<sub>AB</sub>A(m<sub>A,1</sub> − m<sub>A,2</sub>)/L;  R<sub>m</sub> = L/(D<sub>AB</sub>A)', 'analogous to conduction'],
        ['Evaporation through a stagnant gas column (Stefan flow)', 'N<sub>A</sub> = (CD<sub>AB</sub>/L) ln[(1 − x<sub>A,L</sub>)/(1 − x<sub>A,0</sub>)]', ''],
        ['Equimolar counter-diffusion of ideal gases', 'N<sub>A</sub> = D<sub>AB</sub>(p<sub>A,1</sub> − p<sub>A,2</sub>)/(R̄TL)', ''],
        ['Temperature and pressure dependence of D<sub>AB</sub> (gases)', 'D<sub>AB</sub> ∝ T<sup>3/2</sup>/p (kinetic theory);  ∝ T<sup>1.75</sup>/p (Fuller)', ''],
        ['Fuller–Schettler–Giddings estimate', 'D<sub>AB</sub> (cm²/s) = 0.001 43 T<sup>1.75</sup>/{p M<sub>AB</sub><sup>1/2</sup>[(Σv)<sub>A</sub><sup>1/3</sup> + (Σv)<sub>B</sub><sup>1/3</sup>]²}', 'T in K, p in bar, M<sub>AB</sub> = 2/(1/M<sub>A</sub> + 1/M<sub>B</sub>)'],
        ['Liquids (Wilke & Chang)', 'D<sub>AB</sub> (cm²/s) = 7.4 × 10⁻⁸ (φM<sub>B</sub>)<sup>1/2</sup>T/(μ<sub>B</sub>V<sub>A</sub><sup>0.6</sup>)', 'μ<sub>B</sub> in cP, V<sub>A</sub> molar volume at boiling point (cm³/mol); φ = 2.6 for water'],
        ['Convective mass transfer', 'ṅ<sub>A</sub> = h<sub>m</sub>A(ρ<sub>A,s</sub> − ρ<sub>A,∞</sub>);  Sh = h<sub>m</sub>L/D<sub>AB</sub>', ''],
        ['Heat and mass transfer analogy', 'Sh = Nu with Pr replaced by Sc: e.g. flat plate laminar Sh<sub>L</sub> = 0.664 Re<sub>L</sub><sup>1/2</sup>Sc<sup>1/3</sup>', 'every correlation in the convection chapters'],
        ['Chilton–Colburn analogy', 'j<sub>H</sub> = St Pr<sup>2/3</sup> = j<sub>m</sub> = St<sub>m</sub>Sc<sup>2/3</sup> = C<sub>f</sub>/2', '0.6 &lt; Pr &lt; 60, 0.6 &lt; Sc &lt; 3000'],
        ['Lewis relation', 'h/h<sub>m</sub> = ρc<sub>p</sub>Le<sup>2/3</sup>', 'air–water vapour: Le ≈ 0.85'],
        ['Evaporative cooling (wet surface)', 'q″<sub>evap</sub> = h<sub>m</sub>[ρ<sub>A,sat</sub>(T<sub>s</sub>) − φ<sub>∞</sub>ρ<sub>A,sat</sub>(T<sub>∞</sub>)]h<sub>fg</sub>', 'φ = relative humidity'],
        ['Henry law (dilute gas in a liquid)', 'x<sub>A,liq</sub> = p<sub>A</sub>/H', 'H values below']])}
      ${h3('Binary diffusion coefficients of gases at 1 atm, D<sub>AB</sub>·10⁵ (m²/s)')}<p class="hbsrc">Estimated with the Fuller–Schettler–Giddings method (Fuller et al., 1966); typical error ±5–10 % against measurements. Measured at 25 °C for comparison: H₂O–air 2.6, CO₂–air 1.6, O₂–air 2.1, H₂–air 7.8, NH₃–air 2.3, naphthalene–air 0.61, benzene–air 0.88 (Mills; Cussler).</p>${tab(H.diffgas.cols, H.diffgas.rows)}
      ${h3('Dilute solutes in water at 25 °C')}<p class="hbsrc">Sources: Cussler, Diffusion; Mills, Mass Transfer; Sander (2015) for Henry constants. Approximate values.</p>
      <div class="hbgrid">${tab(['Solute in water', 'D<sub>AB</sub>·10⁹ (m²/s)'], [['Hydrogen', 4.5], ['Oxygen', 2.1], ['Nitrogen', 1.9], ['Carbon dioxide', 1.9], ['Ammonia', 1.6], ['Sodium chloride', 1.6], ['Methanol', 1.6], ['Ethanol', 1.2], ['Glucose', 0.67], ['Sucrose', 0.52]])}
      ${tab(['Gas', 'H (bar), x<sub>A</sub> = p<sub>A</sub>/H, 25 °C'], [['Hydrogen', 71600], ['Nitrogen', 86500], ['Oxygen', 43700], ['Air', 72000], ['Carbon monoxide', 58300], ['Carbon dioxide', 1650], ['Hydrogen sulphide', 550]], { text: [0] })}</div>
      ${h3('Water vapour in air')}<p class="hbsrc">p<sub>sat</sub> and ρ<sub>v,sat</sub> from IAPWS-95 (CoolProp); D from the Fuller method; Sc = ν<sub>air</sub>/D.</p>${look(H.humid)}` },

    { id: 'math', t: 'Mathematical tables', f: () => `
      ${h3('Error function')}${note('erf η = (2/√π)∫₀<sup>η</sup> e<sup>−u²</sup> du;  erfc η = 1 − erf η.')}${look(H.erf)}
      ${h3('Bessel functions')}${note('J, Y: Bessel functions of the first and second kind; I, K: modified Bessel functions. Derivatives: dJ₀/dx = −J₁, dI₀/dx = I₁, dK₀/dx = −K₁.')}${look(H.bessel)}
      ${h3('Hyperbolic functions')}${look(H.hyper)}` },
  ];
  function refBlock(k) {
    const s = H.refsat[k], sh = H.refsh[k];
    return look(s, { title: s.name + ` (critical temperature ${s.Tcrit} °C)` }) + `<h4 class="hbh4">${sh.name}</h4><div class="hbgrid">${sh.p.filter(p => sh.t[p]).map(p => `<div>${tab(sh.t[p].cols.slice(1), sh.t[p].rows.map(r => r.slice(1)), { cap: sh.t[p].name, text: [] })}</div>`).join('')}</div>`;
  }

  /* ------------------------------------------------------------------ page */
  let IDX0 = null;
  function index() {
    if (IDX0) return IDX0; IDX0 = [];
    const keep = uid; CH_.forEach(c => { IDX0.push([c.t, c.id]); const tmp = document.createElement('div'); tmp.innerHTML = c.f(); tmp.querySelectorAll('h3,h4,figcaption b,caption,table.hbeqt td:first-child').forEach(h => { const t = h.textContent.trim(); if (t) IDX0.push([t, c.id, t]); }); });
    return IDX0;
  }
  const ORDER = CH_.map(c => c.id);
  EXT.handbook = function (el, sub) {
    const all = sub === 'all';
    const cur = all ? null : (ORDER.includes(sub) ? sub : null);
    document.title = (cur ? CH_.find(c => c.id === cur).t + ' — ' : '') + 'Heat Transfer Handbook';
    const toc = `<nav class="hbtoc no-print" aria-label="Handbook chapters"><a href="#handbook" class="${!cur && !all ? 'on' : ''}">Contents</a>${CH_.map((c, i) => `<a href="#handbook-s-${c.id}" class="${c.id === cur ? 'on' : ''}"><span class="rno">${i + 1}</span>${c.t}</a>`).join('')}<a href="#handbook-s-all" class="${all ? 'on' : ''}">Whole handbook (print)</a></nav>`;
    let body;
    if (all) body = `<div class="hbprinthead"><h1>Heat Transfer Handbook</h1><p>Heat Transfer Virtual Lab · MITE Moodbidri · ${new Date().getFullYear()}</p></div>` + CH_.map((c, i) => `<section class="hbch"><h2 class="hbh2"><span>${i + 1}</span>${c.t}</h2>${c.f()}</section>`).join('');
    else if (cur) { const i = ORDER.indexOf(cur), c = CH_[i]; body = `<section class="hbch"><p class="eyebrow">Chapter ${i + 1}</p><h2 class="hbh2" style="margin-top:4px">${c.t}</h2>${c.f()}</section>
      <div class="hbpn no-print">${i > 0 ? `<a class="btn quiet" href="#handbook-s-${ORDER[i - 1]}">← ${CH_[i - 1].t}</a>` : '<span></span>'}${i < ORDER.length - 1 ? `<a class="btn quiet" href="#handbook-s-${ORDER[i + 1]}">${CH_[i + 1].t} →</a>` : ''}</div>`; }
    else body = `<p class="muted" style="max-width:78ch;margin-top:8px">A complete heat and mass transfer data book: property tables for solids, gases, liquids, water and steam and refrigerants; correlations for conduction, convection, boiling, condensation, radiation, heat exchangers and mass transfer; charts (Heisler, Gröber, fin efficiency, Moody, view factors, ε–NTU, LMTD correction); and mathematical tables. Every computed table has a look-up box that interpolates for you, every chart shows the coordinates under the pointer, and the calculators give exact answers where the printed charts need reading by eye.</p>
      <div class="hbcards">${CH_.map((c, i) => `<a class="hbcard" href="#handbook-s-${c.id}"><span class="eyebrow">Chapter ${i + 1}</span><b>${c.t}</b><span class="muted">${({ units: 'Constants, unit conversions, dimensionless numbers', solids: '37 metals with k(T), non-metals, building materials, insulation', gases: 'Air, N₂, O₂, CO₂, H₂, He, Ar, CH₄, NH₃, steam: 100–2000 K', liquids: 'Water, oils, glycols, mercury, liquid metals, refrigerants', steam: 'Saturated (T and p tables) and superheated steam', refrig: 'R134a, R22, R410A, R32, R1234yf, R600a, R290, R717, R744', cond: 'Resistances, generation, contact resistance, shape factors, fins', trans: 'Lumped, one-term tables, Heisler and Gröber charts, erf solutions', forced: 'Plates, cylinders, spheres, tube banks, pipes, Moody chart', free: 'Plates, cylinders, spheres, enclosures, mixed convection', phase: 'Rohsenow, CHF, film boiling, Nusselt, tube banks, dropwise', rad: 'Blackbody functions, emissivities, view factors, networks', hx: 'LMTD, F charts, ε–NTU charts, U values, fouling factors', mass: 'Fick, analogies, diffusion coefficients, Henry constants', math: 'erf, Bessel and hyperbolic functions' })[c.id]}</span></a>`).join('')}</div>
      <div class="panel" style="margin-top:18px"><div class="panel-h"><h4>Printing and exams</h4></div><p class="hbsmall">Open <a href="#handbook-s-all">Whole handbook</a> and press <b>Print / save as PDF</b> to make a paper or PDF copy (about 90 A4 pages). Check with your examiner whether a printed copy is permitted in your examination; university examinations usually allow only the data book they name.</p>
      <p class="hbsmall" style="margin-top:8px"><b>Where the numbers come from.</b> Fluid properties, steam and refrigerant tables are computed with CoolProp from the reference equations of state (IAPWS-95 for water); sodium and lead alloys from the ANL and OECD/NEA recommended correlations; the transient, fin, view factor, heat exchanger, Moody and blackbody tables and charts are computed from their analytical solutions. Solids, emissivities, oils and correlation constants are compiled from the standard references cited under each table. Small differences (typically below 1 %) from older printed tables come from newer property formulations.</p></div>`;
    el.innerHTML = `<section class="wrap hbwrap" style="padding-block:28px 40px"><div class="hbtop no-print"><div><p class="eyebrow">Reference</p><h1 style="margin-top:6px">Heat Transfer Handbook</h1></div>
      <div class="hbtools"><input type="search" id="hbq" placeholder="Search tables, correlations…" aria-label="Search the handbook"><button class="btn quiet small" type="button" id="hbprint">Print / save as PDF</button></div></div>
      <div id="hbqr" class="hbqr no-print" hidden></div><div class="hblay">${toc}<div class="hbmain">${body}</div></div></section>`;
    const root = el.querySelector('.hbmain');
    root.addEventListener('input', ev => { if (ev.target.dataset && ev.target.dataset.look) doLook(ev.target); });
    const swap = (selId, outId, fn) => { const s = el.querySelector('#' + selId); if (s) s.onchange = () => { el.querySelector('#' + outId).innerHTML = fn(s.value); bindCharts(root); }; };
    swap('hbg', 'hbgt', k => look(H.gases[k], { title: H.gases[k].name }));
    swap('hbl', 'hblt', k => look(H.satliq[k], { title: H.satliq[k].name }));
    swap('hbr', 'hbrt', refBlock);
    bindCharts(root); bindCalcs(root);
    $('#hbprint').onclick = () => { if (!all) { location.hash = '#handbook-s-all'; setTimeout(() => window.print(), 600); } else window.print(); };
    // search over chapter, section and table titles
    const q = $('#hbq'), qr = $('#hbqr');
    q.oninput = () => {
      const s = q.value.trim().toLowerCase(); if (s.length < 2) { qr.hidden = true; return; }
      const IDX = index();
      const hits = IDX.filter(x => s.split(/\s+/).every(w => x[0].toLowerCase().includes(w))).slice(0, 14);
      qr.hidden = false; qr.innerHTML = hits.length ? hits.map(x => `<a href="#handbook-s-${x[1]}" data-t="${esc(x[2] || '')}">${x[0]}<span class="muted"> · ${CH_.find(c => c.id === x[1]).t}</span></a>`).join('') : '<span class="muted">No match</span>';
      qr.querySelectorAll('a').forEach(a => a.onclick = () => { const t = a.dataset.t; q.value = ''; qr.hidden = true; if (t) setTimeout(() => { const h = [...document.querySelectorAll('.hbmain h3,.hbmain h4,.hbmain figcaption b,.hbmain caption,.hbmain table.hbeqt td:first-child')].find(e => e.textContent.trim() === t); if (h) h.scrollIntoView({ block: 'start' }); }, 120); });
    };
  };
  EXT.handbookChapters = CH_.map(c => [c.id, c.t]);
})();
