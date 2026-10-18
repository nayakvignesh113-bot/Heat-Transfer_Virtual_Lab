/* Exp 01 — Thermal conductivity of a metal rod (longitudinal heat flow, water-cooled end). */
(function () {
  const U = LAB.U, G = LAB.G, K = LAB.K, P = LAB.P, ID = 'rod';
  const MAT = { cu: P.SOLID.cu, brass: P.SOLID.brass, al: P.SOLID.al6061, ms: P.SOLID.ms };
  const D = 0.025, A = Math.PI * D * D / 4, LR = 0.35, XS = [60, 110, 160, 210, 260, 310], RH = 100; // m, m², m, mm, Ω
  const px = xmm => 96 + xmm * 0.9;

  /* steady 1-D rod with lateral loss through lagging: θ'' = m²θ, flux Q_in at x = 0, jacket (UA) at x = LR */
  function steady(M, Pel, mw, Tin, Tamb) {
    const Gp = 0.10, UAj = 7.2, Gh = 0.02, cp = 4179; let k = M.k, Qin = Pel * 0.95, Qout = 0, Tw = Tin, sol;
    for (let it = 0; it < 40; it++) {
      const kA = k * A, m = Math.sqrt(Gp / kA), s = Math.sinh(m * LR), c = Math.cosh(m * LR), thw = Tw - Tamb;
      const C2 = -Qin / (kA * m), C1 = -(UAj * (C2 * s - thw) + kA * m * C2 * c) / (kA * m * s + UAj * c);
      const T = x => Tamb + C1 * Math.cosh(m * x) + C2 * Math.sinh(m * x);
      Qout = UAj * (T(LR) - Tw); Tw = Tin + Qout / (2 * mw * cp); Qin = Pel - Gh * (T(0) - Tamb);
      const Tm = (T(XS[0] / 1000) + T(XS[5] / 1000)) / 2; k = P.kAt(M, Tm); sol = { T, Qin, Qout, k, Tm, T0: T(0), TL: T(LR) };
    }
    sol.Tout = Tin + Qout / (mw * cp); return sol;
  }

  LAB.register({
    id: ID, no: 1, cat: 'cond', title: 'Thermal Conductivity of a Metal Rod', std: 'ASTM E1225 (comparative principle) / IS 3346', short: 'Heat flows along a lagged rod from an electric heater to a water-cooled end. Six thermocouples give the gradient and the cooling water gives the heat flow: k = Q / (A dT/dx).', tags: 'fourier law longitudinal bar searle conductivity copper brass aluminium steel gradient steady state',
    aim: 'To determine the thermal conductivity of a metal rod by measuring the steady axial temperature gradient and the heat carried away by the cooling water, and to compare it with handbook data.',
    objectives: ['Operate the rod apparatus and judge when steady state has been reached.', 'Determine the heat flow from the cooling water energy balance.', 'Fit the axial temperature distribution and obtain the temperature gradient.', 'Calculate the thermal conductivity and compare it with handbook values at the mean temperature.', 'Close the energy balance between electrical input and water heat gain.'],
    apparatus: ['Metal rod Ø 25 mm × 400 mm, heated end in a nichrome band heater, cooled end in a water jacket', 'Glass-wool lagging (75 mm) in a sheet-metal box', 'Six type-K thermocouples peened into the rod at 50 mm pitch (x = 60 to 310 mm) and two at the water inlet and outlet', 'Dimmerstat (0–230 V), digital voltmeter and ammeter; heater resistance ≈ 100 Ω', '8-channel digital temperature indicator, resolution 0.1 °C', 'Measuring jar (500 mL) and stopwatch for the water flow rate'],
    stdNote: 'ASTM E1225 uses a guarded comparative stack; this teaching rig uses the absolute method with a water calorimeter at the cold end, which is the arrangement found in most undergraduate laboratories.',
    params: [
      { id: 'mat', label: 'Rod material', type: 'select', options: Object.entries(MAT).map(([k, v]) => [k, v.name]), def: 'brass' },
      { id: 'V', label: 'Heater voltage', type: 'select', options: [['40', '40 V'], ['60', '60 V'], ['80', '80 V']], def: '60' },
      { id: 'q', label: 'Cooling water flow', type: 'select', options: [['60', '≈ 60 mL/min'], ['120', '≈ 120 mL/min'], ['200', '≈ 200 mL/min']], def: '120' }
    ],
    opSteps: ['Check the thermocouples: all read room temperature', 'Open the cooling water and set the flow', 'Switch on the heater and set the voltage', 'Log all temperatures at regular intervals', 'Wait until every reading changes by ≤ 0.2 °C between logs', 'Measure water flow (jar and stopwatch), voltage and current', 'Switch off the heater; keep water flowing until the rod cools'],
    svg(p) {
      let seg = ''; for (let i = 0; i < 40; i++) seg += `<rect id="rs${i}" x="${56 + i * 10}" y="132" width="10.4" height="16" class="spec"/>`;
      let tcs = ''; XS.forEach((x, i) => { tcs += `<line x1="${px(x)}" y1="132" x2="${px(x)}" y2="${78 - (i % 2) * 6}" class="tcw"/>` + G.tc(px(x), 132, 'T' + (i + 1), null, -6, i % 2 ? 26 : -8); });
      return G.svg('0 0 560 300', `${G.r(0, 0, 560, 300, 'bg')}
        <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" class="insul"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--line)" stroke-width="2"/></pattern></defs>
        ${G.r(70, 96, 340, 88, 'hatch', 'rx="4" stroke="var(--muted)"')}${G.t(150, 196, 'glass-wool lagging in sheet-metal box', 'm')}
        ${seg}
        ${G.heater(52, 122, 46, 36, 'htr')}${G.t(54, 116, 'HEATER', 'm')}
        <path d="M380 140 H405" class="ln"/>${G.r(402, 118, 50, 44, 'glass', 'rx="4"')}<rect x="404" y="120" width="46" height="40" class="cool" opacity=".35" id="jw"/>
        <path d="M520 190 H440 V162" class="flow flowc" stroke-width="4" id="wi"/><path d="M414 118 V96 H520" class="flow flowc" stroke-width="4"/>
        ${G.tc(490, 190, 'Ti', null, -4, 16)}${G.tc(490, 96, 'To', null, -4, -8)}${G.t(500, 206, 'water in', 'm')}${G.t(500, 86, 'to jar', 'm')}
        ${tcs}${G.r(140, 52, 236, 20, 'mach2', 'rx="3"')}${G.t(148, 66, 'thermocouple selector → indicator', 'm', 'style="fill:var(--panel-ink)"')}
        <g transform="translate(256,214)">${G.r(0, 0, 290, 62, 'disp', 'rx="4"')}${G.t(10, 14, 'TEMPERATURE INDICATOR °C', 'm', 'style="fill:var(--panel-ink);font-size:7.5px"')}${[0, 1, 2, 3, 4, 5, 6, 7].map(i => G.t(10 + (i % 4) * 70, 32 + Math.floor(i / 4) * 18, `${['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'Ti', 'To'][i]} <tspan id="d${i}" style="fill:var(--straw);font-size:11px">--.-</tspan>`, 'm', 'style="fill:var(--panel-ink);font-size:9px"')).join('')}</g>
        ${G.cbar(14, 18, 10, 70, 25, 125)}
        <g transform="translate(14,214)">${G.r(0, 0, 230, 62, 'disp', 'rx="4"')}${G.t(10, 14, 'HEATER SUPPLY', 'm', 'style="fill:var(--panel-ink);font-size:7.5px"')}${G.t(10, 40, '0.0 V', 'big', 'id="dV"')}${G.t(84, 40, '0.00 A', 'big', 'id="dA"')}${G.t(160, 40, '0.0 W', 'big', 'id="dW"')}${G.t(10, 54, 'dimmerstat', 'm', 'style="fill:var(--panel-ink);font-size:7.5px"')}</g>
        ${G.t(420, 26, 't = 0 min', 'big', 'id="tclk" style="fill:var(--ink)"')}${G.t(420, 42, '', 'm', 'id="tst"')}`, 'Thermal conductivity of a metal rod: heater, lagged rod with six thermocouples and water-cooled end');
    },
    anim(svg, f, sim, p) {
      const lo = 25, hi = sim ? Math.max(60, Math.ceil(sim.Tmax / 10) * 10) : 125; G.txt(svg, 'cbhi', U.f(hi, 0)); G.txt(svg, 'cblo', U.f(lo, 0));
      const t = sim ? f * sim.tEnd : 0, Ta = sim ? sim.Ta : 27;
      for (let i = 0; i < 40; i++) { const xm = ((56 + i * 10 + 5) - 96) / 0.9; const T = sim ? sim.Tat(U.clamp(xm, 0, LR * 1000), t) : Ta; G.fill(svg, 'rs' + i, G.tcol(T, lo, hi)); }
      if (!sim) return; const v = sim.read(t); for (let i = 0; i < 8; i++) G.txt(svg, 'd' + i, U.f(v[i], 1));
      G.txt(svg, 'dV', U.f(sim.V, 1) + ' V'); G.txt(svg, 'dA', U.f(sim.I, 2) + ' A'); G.txt(svg, 'dW', U.f(sim.V * sim.I, 1) + ' W');
      G.txt(svg, 'tclk', `t = ${U.f(t, 0)} min`); G.txt(svg, 'tst', t >= sim.L.ssTime ? 'steady state' : 'heating up…'); G.flow(svg, f, 900);
    },
    liveView(el, f, sim, p, api) {
      api.title('Axial temperature profile'); const t = f * sim.tEnd; api.sub(`t = ${U.f(t, 0)} min`);
      const xs = U.lin(0, LR * 1000, 50); const v = sim.read(t);
      G.profileView(el, { xlabel: 'Distance from heated end x (mm)', ylabel: 'Temperature (°C)', series: [{ name: 'rod (model)', x: xs, y: xs.map(x => sim.Tat(x, t)), color: 's2', width: 1.6 }, { name: 'thermocouples', x: XS, y: v.slice(0, 6), type: 'scatter', color: 's1' }], ymin: 20, ymax: Math.ceil(sim.Tmax / 10) * 10 + 5, xmax: 350 }, 210);
    },
    simulate(p, r) {
      const M = MAT[p.mat], V = U.q(p.V * (1 + 0.004 * U.gauss(r)), 0.1), I = U.q(V / (RH * (1 + 0.01 * r())), 0.01), Pel = V * I;
      const Ta = U.q(26 + 3 * r(), 0.1), Tin = U.q(Ta - 0.5 - 1.5 * r(), 0.1); const mw = p.q * (1 + 0.06 * U.gauss(r)) / 60 / 1000 * 0.997; // kg/s
      const S = steady(M, Pel, mw, Tin, Ta);
      if (S.T0 > 260) return { error: `With ${p.V} V the heated end of the ${M.name.toLowerCase()} rod would exceed 260 °C and the over-temperature cut-out would trip. Choose a lower voltage.` };
      const al = M.k / (M.rho * M.c), tauRod = 0.6 * Math.pow(2 * LR / Math.PI, 2) / al + 120 / (M.k * A / LR);
      const tau = tauRod * (1 + 0.05 * U.gauss(r)), dt = tau < 600 ? 5 : tau < 1800 ? 10 : 15;
      const Tss = [...XS.map(x => S.T(x / 1000)), Tin, S.Tout];
      const chans = Tss.map((T, i) => ({ T0: i >= 6 ? Tin : Ta, Tss: T, tau: tau * (i < 6 ? (0.92 + 0.12 * i / 5) : 1.05), a: 0.88, sd: i >= 6 ? 0.05 : 0.15 }));
      const L = K.log(chans, { dt, thr: 0.2, extra: 2, maxN: 40 }, r);
      const last = L.last, rd = L.vals.map(v => v[last]);
      // water flow by timing 500 mL
      const Vj = 500, tj = U.q(Vj / 1000 * 0.997 / mw, 0.1);
      const T = { mw: Vj / 1000 * 0.997 / tj, Ti: rd[6], To: rd[7], cp: 4179 }; T.Q = T.mw * T.cp * (T.To - T.Ti);
      const fit = U.linfit(XS.map(x => x / 1000), rd.slice(0, 6)); T.grad = -fit.m; T.r2 = fit.r2; T.k = T.Q / (A * T.grad); T.Tm = U.mean(rd.slice(0, 6)); T.Pel = V * I; T.loss = (T.Pel - T.Q) / T.Pel * 100; T.kref = P.kAt(M, T.Tm); T.fit = fit; T.A = A; T.tj = tj; T.Vj = Vj; T.V = V; T.I = I;
      const tEnd = L.times[last]; const fine = K.curves(chans, tEnd, 140);
      const Tat = (xmm, tm) => { const ss = S.T(xmm / 1000); return K.settle(Ta, ss, tm * 60, tau * (0.92 + 0.12 * U.clamp((xmm - 60) / 250, 0, 1)), 0.88); };
      const rows = L.times.map((t, k) => [t, ...L.vals.map(v => U.f(v[k], 1))]);
      return {
        M, V, I, Ta, L, tEnd, Tat, truth: T, Tmax: S.T0, dur: 12,
        read: tm => { const k = Math.min(last, Math.floor(tm / dt + 1e-9)); return L.vals.map(v => v[k]); },
        readout(f) { const tm = f * tEnd, v = this.read(tm); return [['Time', U.f(tm, 0), 'min'], ['T1 (hot)', U.f(v[0], 1), '°C'], ['T6 (cold)', U.f(v[5], 1), '°C'], ['Water rise', U.f(v[7] - v[6], 1), '°C'], ['Power', U.f(V * I, 1), 'W']]; },
        plot: { title: 'Temperature log', xlabel: 'Time (min)', ylabel: 'Temperature (°C)', series: [...['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'Ti', 'To'].map((n, i) => ({ name: n, x: fine.t, y: fine.y[i], color: ['s5', 's2', 'straw', 's3', 's6', 's1', 'muted', 's4'][i], width: 1.5, dash: i >= 6 })), { x: L.times, y: L.vals[0], type: 'scatter', color: 's5', nolegend: true, r: 2.4 }], vlines: [{ x: L.ssTime, label: 'steady', color: 'ok' }], parallel: true, caption: 'Thermocouple readings against time while the rod approaches steady state' },
        plotFrac: f => f,
        plots: [{ xlabel: 'Distance from heated end x (mm)', ylabel: 'Steady temperature (°C)', series: [{ name: 'measured', x: XS, y: rd.slice(0, 6), type: 'scatter', color: 's1' }, { name: `fit: T = ${U.f(fit.c, 2)} − ${U.f(T.grad, 1)}·x`, x: [0, 350], y: [fit.c, fit.c + fit.m * 0.35], color: 's2', dash: true }], caption: 'Steady axial temperature distribution with least-squares line' }],
        specimen: [['Rod material', M.name, ''], ['Rod diameter D', U.f(D * 1000, 1), 'mm'], ['Cross-sectional area A', U.sci(A, 4), 'm²'], ['Thermocouple positions x', XS.join(', '), 'mm'], ['Heater resistance (nominal)', RH, 'Ω'], ['Room temperature', U.f(Ta, 1), '°C'], ['Logging interval', dt, 'min'], ['Water c_p (taken)', 4179, 'J/kg·K']],
        obs: [{ title: 'Table 1. Temperature log (°C)', cols: ['Time (min)', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'Ti (water in)', 'To (water out)'], rows, note: 'Thermocouples T1–T6 at x = 60, 110, 160, 210, 260, 310 mm from the heated end. Use the last row for the calculations, once steady state has been reached.' },
          { title: 'Table 2. Electrical input and water flow (at the end of the test)', cols: ['Quantity', 'Reading', 'Unit'], textCols: [0, 2], rows: [['Voltage V', U.f(V, 1), 'V'], ['Current I', U.f(I, 2), 'A'], ['Water collected', Vj, 'mL'], ['Time to collect', U.f(tj, 1), 's'], ['Water density (taken)', 997, 'kg/m³']] }],
        truth: T
      };
    },
    calcs(sim) { const T = sim.truth, L = sim.L; return [K.ssCalc(L),
      { key: 'mw', label: 'Water mass flow rate ṁ', unit: 'kg/s', truth: T.mw, tol: 0.01, hint: 'ṁ = ρ V / t', fmt: v => U.sci(v, 4) },
      { key: 'Q', label: 'Heat flow Q (water gain)', unit: 'W', truth: T.Q, tol: 0.02, hint: 'Q = ṁ c_p (T_o − T_i)' },
      { key: 'g', label: 'Temperature gradient |dT/dx| (least-squares slope of T1–T6)', unit: 'K/m', truth: T.grad, tol: 0.02, hint: 'slope of T against x, x in metres' },
      { key: 'k', label: 'Thermal conductivity k', unit: 'W/m·K', truth: T.k, tol: 0.03, hint: 'k = Q / (A |dT/dx|)' },
      { key: 'Tm', label: 'Mean rod temperature (T1–T6)', unit: '°C', truth: T.Tm, abs: 0.2 },
      { key: 'loss', label: 'Heat not reaching the water, (VI − Q)/VI', unit: '%', truth: T.loss, abs: 1.5, hint: 'losses through lagging and heater end' }]; },
    reference(sim) { const T = sim.truth, M = sim.M; return [{ label: `k of ${M.name} at ${U.f(T.Tm, 0)} °C`, unit: 'W/m·K', value: T.k, lo: T.kref * 0.9, hi: T.kref * 1.1, src: 'Incropera Table A.1 (±10 %)', range: `${U.sig(T.kref * 0.9, 3)} – ${U.sig(T.kref * 1.1, 3)}` }, { label: 'Linearity of T(x), R²', unit: '', value: T.r2, lo: 0.98, hi: 1, src: 'Good lagging gives a straight line', fmt: v => U.f(v, 4) }, { label: 'Energy balance: heat lost before the water', unit: '%', value: T.loss, lo: 2, hi: 20, src: 'Typical for a lagged rod rig', fmt: v => U.f(v, 1) }]; },
    valExtra(el, sim) { const T = sim.truth; el.innerHTML = `<div class="panel"><div class="panel-h"><h4>Energy balance</h4><span class="eyebrow">where the electrical power went</span></div>${LAB.tableHTML({ cols: ['Stream', 'Power (W)', 'Share'], textCols: [0], rows: [['Electrical input V·I', U.f(T.Pel, 2), '100 %'], ['Carried away by cooling water', U.f(T.Q, 2), U.f(T.Q / T.Pel * 100, 1) + ' %'], ['Lost through lagging and heater end', U.f(T.Pel - T.Q, 2), U.f(T.loss, 1) + ' %']] })}<p class="muted" style="font-size:.84rem">The water measures the heat leaving the cold end. Heat leaking through the lagging between the thermocouples makes the gradient near the hot end slightly steeper than near the cold end; using the water heat flow therefore gives k slightly low. Using V·I instead would give k ${U.f(T.Pel / T.Q * 100 - 100, 0)} % higher.</p></div>`; },
    sample(sim) { const T = sim.truth; return `<div class="eq">ṁ = ρV/t = 997 × ${T.Vj}×10⁻⁶ / ${U.f(T.tj, 1)} = <b>${U.sci(T.mw, 4)} kg/s</b></div><div class="eq">Q = ṁ c_p (T_o − T_i) = ${U.sci(T.mw, 4)} × 4179 × (${U.f(T.To, 1)} − ${U.f(T.Ti, 1)}) = <b>${U.f(T.Q, 2)} W</b></div><div class="eq">Least-squares slope of T1–T6 against x: dT/dx = <b>−${U.f(T.grad, 1)} K/m</b> (R² = ${U.f(T.r2, 4)})</div><div class="eq">k = Q/(A|dT/dx|) = ${U.f(T.Q, 2)} / (${U.sci(T.A, 4)} × ${U.f(T.grad, 1)}) = <b>${U.f(T.k, 1)} W/m·K</b></div><div class="eq">Loss = (VI − Q)/VI = (${U.f(T.Pel, 2)} − ${U.f(T.Q, 2)})/${U.f(T.Pel, 2)} = <b>${U.f(T.loss, 1)} %</b></div>`; },
    uncert(sim) { const T = sim.truth; const uD = 0.15 * Math.SQRT2, uQ = T.Q * Math.hypot(uD / (T.To - T.Ti), 0.1 / T.tj, 0.005), ug = 0.15 / Math.sqrt(XS.reduce((q, x) => q + ((x - 185) / 1000) ** 2, 0)) / T.grad; return [{ q: 'Heat flow Q', expr: '√[(u_ΔT/ΔT)² + (u_t/t)² + (u_V/V)²], u_ΔT = 0.21 °C (matched pair)', val: T.Q, u: uQ, unit: 'W' }, { q: 'Gradient dT/dx', expr: 'u_T/√Σ(x − x̄)², u_T = 0.15 °C', val: T.grad, u: T.grad * ug, unit: 'K/m' }, { q: 'Conductivity k', expr: '√[(u_Q/Q)² + (u_g/g)² + (2u_D/D)²]', val: T.k, u: T.k * Math.hypot(uQ / T.Q, ug, 2 * 0.02 / 25), unit: 'W/m·K' }]; },
    conclude(sim) { const T = sim.truth; return `The ${sim.M.name.toLowerCase()} rod reached steady state after about ${sim.L.ssTime} min. The cooling water carried away ${U.f(T.Q, 1)} W of the ${U.f(T.Pel, 1)} W supplied, and the steady temperature fell linearly along the rod (R² = ${U.f(T.r2, 3)}) with a gradient of ${U.f(T.grad, 0)} K/m. The thermal conductivity is ${U.f(T.k, 0)} W/m·K at a mean temperature of ${U.f(T.Tm, 0)} °C, ${Math.abs(T.k / T.kref - 1) < 0.1 ? 'within' : 'outside'} 10 % of the handbook value of ${U.f(T.kref, 0)} W/m·K. About ${U.f(T.loss, 0)} % of the electrical input was lost through the lagging and the heater end.`; },
    summary: 'In steady one-dimensional conduction the heat flow through a bar is given by Fourier’s law, Q = −kA dT/dx. A rod is heated at one end and cooled at the other by water flowing through a jacket; lagging keeps the heat flow nearly axial. At steady state the heat flow is measured by the temperature rise of the cooling water, Q = ṁ c_p (T_o − T_i), and the gradient is the slope of the line through the thermocouple readings. Then k = Q / (A |dT/dx|). Steady state is judged from the temperature log: the readings must stop changing. Heat lost through the lagging is the main systematic error and is found from the energy balance between electrical input and water heat gain.',
    formulas: [['Fourier’s law', 'Q = −k A dT/dx'], ['Heat gained by water', 'Q = ṁ c_p (T_o − T_i)'], ['Mass flow rate', 'ṁ = ρ V / t'], ['Conductivity', 'k = Q / (A |dT/dx|)'], ['Least-squares slope', 'm = Σ(x − x̄)(T − T̄) / Σ(x − x̄)²'], ['Time constant (order of)', 'τ ≈ L² / (π²α/4),  α = k / (ρc)']],
    theory: `<h3>Fourier’s law</h3><p>Heat conducts through a solid from hot to cold at a rate proportional to the temperature gradient. For one-dimensional flow along a bar of cross-section A, Fourier’s law gives Q = −kA dT/dx. The constant k is the thermal conductivity, a material property: about 400 W/m·K for copper, 110 for brass, 167 for 6061 aluminium and 64 for mild steel.</p>
      <h3>The rod apparatus</h3><p>A metal rod is heated at one end by an electric band heater and cooled at the other by water flowing through a jacket. The rod is surrounded by thick glass-wool lagging so that almost all the heat flows along it. Six thermocouples, inserted into small holes at known positions, measure the temperature distribution, and two more measure the water temperature entering and leaving the jacket.</p>
      <h3>Steady state</h3><p>When the heater is switched on, the rod warms up. Each thermocouple rises towards its final value roughly exponentially, with a time constant that grows with the square of the rod length and falls with the thermal diffusivity α = k/(ρc). A copper rod settles in minutes; brass takes about an hour; steel takes much longer. Readings are logged at regular intervals, and steady state is declared when every reading changes by less than about 0.2 °C between logs. Only then does the heat leaving equal the heat entering, so that the water heat gain represents the heat flowing through the rod.</p>
      <h3>Heat flow and gradient</h3><p>At steady state the heat reaching the cold end is carried away by the water: Q = ṁ c<sub>p</sub> (T<sub>o</sub> − T<sub>i</sub>). The mass flow is found by timing the collection of a known volume. The thermocouple readings plotted against position fall on a nearly straight line; its slope, found by least squares, is the gradient dT/dx. The conductivity follows as k = Q / (A |dT/dx|).</p>
      <h3>Losses</h3><p>Lagging is never perfect. Some heat escapes radially, so less heat crosses the cold end than enters the hot end, and the temperature profile curves slightly. The electrical input V·I is larger than the water heat gain; the difference, a few per cent to about fifteen per cent, is the loss. Using the water heat flow, measured close to where the gradient is measured, gives the better estimate of k.</p>`,
    procedure: ['Check that all eight thermocouples read room temperature within about 0.5 °C.', 'Open the cooling water and adjust the flow to a steady trickle (about 60–200 mL/min).', 'Switch on the heater and set the dimmerstat to the chosen voltage.', 'Record T1–T6, Ti and To at regular intervals (5–15 min depending on the rod).', 'Continue until every reading changes by no more than 0.2 °C between two successive logs.', 'Record the voltage and current, and time the collection of 500 mL of outlet water.', 'Switch off the heater; keep the water flowing until the rod has cooled.', 'Plot T against x, find the slope by least squares and calculate k.'],
    precautions: ['Never switch on the heater without cooling water flowing.', 'Increase the voltage gradually; do not exceed the rated heater voltage.', 'Keep the water flow steady during the test; a change in flow disturbs steady state.', 'Do not disturb the lagging or thermocouple leads once the test has started.', 'Take the water flow measurement at the same time as the final temperature readings.'],
    applications: ['Selection of materials for heat sinks, heat exchanger tubes and cooking vessels.', 'Quality control of copper and aluminium conductors and castings.', 'Basis of comparative conductivity meters (ASTM E1225) and the guarded heat-flow method.', 'Estimating heat flow through structural members and fasteners (thermal bridges).'],
    errors: ['Heat lost radially through imperfect lagging.', 'Thermocouple position uncertainty (±0.5 mm) and calibration offsets.', 'Small water temperature rise, so the difference To − Ti carries a large relative error.', 'Not waiting long enough for steady state.', 'Variation of k with temperature along the rod.'],
    discussion: ['How did you decide that steady state had been reached? What would happen to k if you took readings too early?', 'Compare the electrical input with the water heat gain. Where did the difference go?', 'Is your temperature profile a straight line? What would make it curve?', 'Why does a steel rod take much longer to reach steady state than a copper rod of the same size?'],
    refs: ['F. P. Incropera, D. P. DeWitt, T. L. Bergman, A. S. Lavine, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley, 2011, Ch. 2–3 and Table A.1.', 'ASTM E1225-20, Standard Test Method for Thermal Conductivity of Solids Using the Guarded-Comparative-Longitudinal Heat Flow Technique.', 'Y. A. Çengel, A. J. Ghajar, Heat and Mass Transfer: Fundamentals and Applications, 5th ed., McGraw-Hill, 2015, Ch. 2.', 'C. P. Kothandaraman, S. Subramanyan, Heat and Mass Transfer Data Book, 8th ed., New Age International, 2014.', 'ASM Handbook Vol. 2, Properties and Selection: Nonferrous Alloys and Special-Purpose Materials, ASM International, 1990.'],
    pre: [
      { q: 'Fourier’s law for one-dimensional conduction is', o: ['Q = hAΔT', 'Q = −kA dT/dx', 'Q = εσAT⁴', 'Q = ṁ c_p ΔT'], a: 1, why: 'Conduction heat flow is proportional to area and temperature gradient.' },
      { q: 'The SI unit of thermal conductivity is', o: ['W/m²·K', 'W/m·K', 'J/kg·K', 'm²/s'], a: 1, why: 'k = Q/(A dT/dx): W/(m² × K/m) = W/m·K.' },
      { q: 'Why is the rod surrounded by lagging?', o: ['To heat it faster', 'So that heat flows along the rod rather than out of its surface', 'To protect the thermocouples from water', 'To increase k'], a: 1, why: 'Lagging makes the flow one-dimensional (axial).' },
      { q: 'In this experiment the heat flowing through the rod is best measured by', o: ['The heater rating on its label', 'The temperature rise and flow rate of the cooling water', 'The colour of the rod', 'The room temperature'], a: 1, why: 'The water calorimeter measures the heat actually leaving the cold end.' },
      { q: 'Which metal has the highest thermal conductivity?', o: ['Mild steel', 'Stainless steel', 'Brass', 'Copper'], a: 3, why: 'Copper ≈ 400 W/m·K; brass ≈ 110; mild steel ≈ 60; stainless ≈ 15.' }
    ],
    post: [
      { q: 'Water at 0.0035 kg/s warms by 2.5 °C. The heat flow is about', o: ['3.7 W', '36.6 W', '8.8 W', '366 W'], a: 1, why: 'Q = 0.0035 × 4179 × 2.5 ≈ 36.6 W.' },
      { q: 'If readings are taken before steady state, the measured k will usually be', o: ['Too high', 'Too low, because part of the heat is still being stored in the rod and the water gain is small', 'Unaffected', 'Negative'], a: 1, why: 'Before steady state the cold end has not yet received the full heat flow, so Q is under-estimated.' },
      { q: 'The thermocouple readings fall on a line with slope −220 K/m; Q = 40 W; A = 4.91 × 10⁻⁴ m². k is', o: ['37 W/m·K', '370 W/m·K', '82 W/m·K', '0.37 W/m·K'], a: 1, why: 'k = 40/(4.91 × 10⁻⁴ × 220) ≈ 370 W/m·K.' },
      { q: 'With identical rods and heater power, which rod shows the largest temperature difference between T1 and T6?', o: ['Copper', 'Aluminium', 'Brass', 'Mild steel'], a: 3, why: 'ΔT = QL/(kA): the lowest k gives the largest ΔT.' },
      { q: 'The electrical input exceeds the water heat gain by 10 %. This difference is mainly', o: ['An error in Fourier’s law', 'Heat lost radially through the lagging and from the heater', 'Energy stored permanently in the rod', 'Heat generated by the thermocouples'], a: 1, why: 'At steady state nothing is stored; the deficit escapes to the room.' }
    ]
  });

  LAB.VALID[ID] = ['v', 'Steady profile from the exact solution of the fin-type rod equation with lagging loss and a convective water jacket; k(T) from Incropera Table A.1. Recovered k lies within 10 % of handbook values for all four rods.', 'Incropera Table A.1; ASTM E1225'];

  LAB.NOMEN[ID] = [['Q', 'Heat flow along the rod (from water gain)', 'W'], ['k', 'Thermal conductivity', 'W/m·K'], ['A', 'Cross-sectional area of the rod, πD²/4', 'm²'], ['D', 'Rod diameter', 'm'], ['x', 'Distance from the heated end', 'm'], ['dT/dx', 'Axial temperature gradient', 'K/m'], ['T1–T6', 'Rod thermocouple readings', '°C'], ['T_i, T_o', 'Cooling water inlet and outlet temperatures', '°C'], ['ṁ', 'Water mass flow rate', 'kg/s'], ['c_p', 'Specific heat of water', 'J/kg·K'], ['V, I', 'Heater voltage and current', 'V, A'], ['α', 'Thermal diffusivity, k/(ρc)', 'm²/s'], ['T_m', 'Mean rod temperature', '°C']];

  const E = U.ease, tag = K.tag;
  LAB.SETUP[ID] = [
    { op: 0, d: 2.8, title: 'Check all thermocouples at room temperature', note: s => `Every channel should read room temperature (${U.f(s.Ta, 1)} °C) within about 0.5 °C; a broken junction reads far off`, why: 'Thermocouples are checked first, while the rod is still at room temperature; a faulty channel cannot be found once heating has begun.',
      draw(L, u, c) { for (let i = 0; i < 8; i++) c.txt('d' + i, u > (i + 1) / 9 ? U.f(c.sim.Ta + (i === 6 ? -1 : 0) + 0.1 * Math.sin(i * 3), 1) : '--.-'); L.innerHTML = c.active ? tag(180, 20, 'scan T1 … To', 300, 52) : K.tick(530, 92); } },
    { op: 1, d: 2.6, title: 'Open the cooling water and set the flow', note: s => `A steady trickle through the jacket, about ${U.f(s.truth.mw * 60000 / 0.997, 0)} mL/min`, why: 'Cooling water must be flowing before the heater is switched on, otherwise the cold end overheats and can boil the jacket dry.',
      draw(L, u, c) { c.op('jw', 0.35 + 0.5 * E(u)); c.set('wi', 'stroke-dashoffset', String(-u * 120)); L.innerHTML = (c.active ? K.jar(480, 236, E(u) * 0.6, '') : '') + (c.active && u > .4 ? tag(330, 214, 'water on', 440, 200) : ''); } },
    { op: 2, d: 2.6, title: s => 'Switch on the heater and set the voltage', note: s => `Dimmerstat raised slowly to ${U.f(s.V, 0)} V; I = ${U.f(s.I, 2)} A`, why: 'The heater is switched on only once the thermocouples are checked and water is flowing.',
      draw(L, u, c) { const v = c.sim.V * E(u); c.txt('dV', U.f(v, 1) + ' V'); c.txt('dA', U.f(v / RH, 2) + ' A'); c.txt('dW', U.f(v * v / RH, 1) + ' W'); L.innerHTML = c.active ? K.knob(270, 245, E(u), 'dimmer') : ''; } }
  ];

  LAB.EXPL[ID] = { scenes: [
    { title: 'The rod rig', lines: [
      ['This rig measures how well a metal conducts heat. A rod is heated at one end and cooled by water at the other, and it is wrapped in thick lagging.', { s: 0 }],
      ['Six thermocouples sit in small holes along the rod, fifty millimetres apart. Two more measure the cooling water going in and coming out.', { s: 0 }],
      ['The water is turned on first, and only then the heater, through a dimmerstat that sets the voltage.', { s: 2 }]],
      q: { q: 'Why is the cooling water switched on before the heater?', o: ['So the thermocouples read zero', 'Otherwise the cold end overheats and the jacket can boil dry', 'To fill the measuring jar', 'To make the rod expand'], a: 1, why: 'The jacket is the heat sink. Without flow, heat accumulates at the cold end and the water in the jacket can boil.' } },
    { title: 'Waiting for steady state', lines: [
      ['When the heater starts, the hot end warms first. Heat spreads along the rod, and every thermocouple climbs.', { r: [0, 0.3] }],
      ['The rise slows down and the readings level off. The rod is no longer storing heat: what enters at the hot end leaves at the cold end.', { r: [0.3, 0.75] }],
      ['Steady state is declared only when every reading changes by less than about two tenths of a degree between logs.', { r: [0.75, 1] }]],
      q: { q: 'Two rods of the same size are tested at the same power: one copper, one steel. Which reaches steady state first?', o: ['Steel, because it heats up more', 'Copper, because its higher diffusivity spreads heat faster', 'Both at the same time', 'Neither ever reaches steady state'], a: 1, why: 'The settling time scales as L²/α. Copper’s diffusivity is about eight times that of mild steel.' } },
    { title: 'From readings to conductivity', lines: [
      ['At steady state the water carries away the heat flowing through the rod. Its mass flow times specific heat times temperature rise gives that heat.', null],
      ['The rod temperatures, plotted against position, fall on a straight line. The slope is the temperature gradient.', null],
      ['Fourier’s law then gives the conductivity: heat flow divided by area and gradient.', null]],
      q: { q: 'Heat leaks out through the lagging between the thermocouples. How does this show in the temperature plot?', o: ['The line becomes perfectly straight', 'The line curves: it is steeper near the hot end', 'The temperatures all become equal', 'The water outlet becomes colder than the inlet'], a: 1, why: 'More heat flows near the hot end than near the cold end, so the gradient there is larger and the profile bends.' } }
  ] };

  LAB.SAFETY[ID] = {
    haz: ['Heater and hot end of the rod reach 100–250 °C; contact burns.', 'Mains voltage at the dimmerstat and heater terminals.', 'Water close to electrical equipment.', 'Glass-wool fibres irritate skin and eyes if the lagging box is opened.'],
    ppe: ['Safety glasses', 'Closed shoes', 'Heat-resistant gloves only if hot parts must be touched after the test'],
    rules: ['Never run the heater without cooling water flowing.', 'Raise the voltage slowly and stay within the heater rating.', 'Keep the bench dry; route the outlet hose into the drain or jar.', 'Do not open the lagging box during or after a test until the rod is cool.', 'Switch off and isolate the supply before touching any terminal.'],
    emerg: ['Switch off the mains isolator; then the dimmerstat.', 'For a burn, cool the skin under running water for 20 minutes and report to the laboratory in-charge.', 'If water leaks onto the electrics, isolate the supply before mopping up.'] };
  LAB.LIB[ID] = { cols: ['Item', 'Specification', 'Purpose / note'], rows: [['Test rod', 'Ø 25 × 400 mm; Cu, brass, Al 6061 or mild steel', 'Six 1.5 mm holes at 50 mm pitch for thermocouples'], ['Thermocouples', 'Type K, mineral insulated, Ø 1.5 mm', 'Special limits ±1.1 °C; peened into the holes'], ['Thermal paste', 'Silicone, k ≈ 1 W/m·K', 'Improves thermocouple contact in the holes'], ['Band heater', 'Nichrome, ≈ 100 Ω, 230 V max', 'Fed from a dimmerstat'], ['Lagging', 'Glass wool, 75 mm, k ≈ 0.04 W/m·K', 'Keeps flow axial'], ['Measuring jar and stopwatch', '500 mL, ±5 mL; 0.1 s', 'Water flow rate'], ['Digital indicator', '8 channels, 0.1 °C', 'Cold-junction compensated']], note: 'Check the thermocouple holes for oxide and refill paste once a semester.' };

  const R = K.R, Pk = K.P, s = K.s;
  LAB.NUM[ID] = [
    r => { const d = Pk(r, [20, 25, 30]), Q = R(r, 20, 60, 1), g = R(r, 150, 600), A = Math.PI * (d / 1000) ** 2 / 4, ans = Q / (A * g); return { title: 'Conductivity from gradient', q: `Heat flows at ${Q} W along a lagged rod of diameter ${d} mm. The measured temperature gradient is ${g} K/m. Find the thermal conductivity.`, ans, unit: 'W/m·K', hints: ['Fourier: Q = kA|dT/dx|.', `A = πd²/4 = ${s(A)} m².`], sol: `A = π × ${d / 1000}²/4 = ${s(A)} m². k = Q/(A g) = ${Q}/(${s(A)} × ${g}) = <b>${s(ans)} W/m·K</b>.` }; },
    r => { const V = Pk(r, [400, 500, 750]), t = R(r, 80, 300, 1), Ti = R(r, 24, 28, 1), To = +(Ti + R(r, 1.5, 6, 1)).toFixed(1), m = V / 1e6 * 997 / t, ans = m * 4179 * (To - Ti); return { title: 'Heat flow from cooling water', q: `${V} mL of cooling water is collected in ${t} s. Its temperature rises from ${Ti} °C to ${To} °C. Taking ρ = 997 kg/m³ and c_p = 4179 J/kg·K, find the heat carried away.`, ans, unit: 'W', hints: ['ṁ = ρV/t with V in m³.', 'Q = ṁ c_p (T_o − T_i).'], sol: `ṁ = 997 × ${V}×10⁻⁶/${t} = ${s(m)} kg/s. Q = ${s(m)} × 4179 × ${(To - Ti).toFixed(1)} = <b>${s(ans)} W</b>.` }; },
    r => { const k = Pk(r, [110, 167, 386, 54]), d = 25, Q = R(r, 15, 45, 1), L = Pk(r, [0.2, 0.25, 0.3]), A = Math.PI * 0.025 ** 2 / 4, ans = Q * L / (k * A); return { title: 'Temperature drop along a rod', q: `A rod of diameter ${d} mm and conductivity ${k} W/m·K carries ${Q} W. Assuming perfect lagging, find the temperature difference between two thermocouples ${L * 1000} mm apart.`, ans, unit: 'K', hints: ['ΔT = Q L/(kA).', `A = ${s(A)} m².`], sol: `ΔT = ${Q} × ${L}/(${k} × ${s(A)}) = <b>${s(ans)} K</b>.` }; }
  ];
})();
