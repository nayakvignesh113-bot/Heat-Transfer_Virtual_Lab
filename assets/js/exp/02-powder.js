/* Exp 02 — Thermal conductivity of an insulating powder (concentric spheres). */
(function () {
  const U = LAB.U, G = LAB.G, K = LAB.K, ID = 'powder';
  const POW = {
    mag: { name: '85 % magnesia powder', k: 0.068, b: 0.0016, rho: 270, ref: [0.06, 0.085] },
    dia: { name: 'Diatomaceous earth (kieselguhr)', k: 0.058, b: 0.0018, rho: 320, ref: [0.05, 0.075] },
    ver: { name: 'Exfoliated vermiculite', k: 0.065, b: 0.0022, rho: 130, ref: [0.055, 0.085] },
    per: { name: 'Expanded perlite', k: 0.050, b: 0.0024, rho: 100, ref: [0.042, 0.068] }
  };
  const R1 = 0.05, R2 = 0.10, RH = 300; // m, m, Ω
  const ANG = [20, 110, 200, 290];
  LAB.register({
    id: ID, no: 2, cat: 'cond', title: 'Thermal Conductivity of Insulating Powder', std: 'IS 3346 / ASTM C177 (principle)', short: 'A heater inside a copper sphere drives heat radially through a powder packed between two concentric spheres. From the two surface temperatures, k = Q(r₂ − r₁)/[4πr₁r₂(T_i − T_o)].', tags: 'concentric spheres insulation powder magnesia perlite vermiculite radial conduction spherical shell',
    aim: 'To determine the thermal conductivity of an insulating powder packed between two concentric spheres, and to examine the thermal resistance network from heater to room.',
    objectives: ['Derive and use the conduction resistance of a spherical shell.', 'Judge steady state in a slow, high-resistance system.', 'Determine the powder conductivity at its mean temperature.', 'Estimate the combined convection–radiation coefficient at the outer sphere.'],
    apparatus: ['Inner copper sphere, outer diameter 100 mm, with an internal 230 V heater (≈ 300 Ω)', 'Outer copper sphere, inner diameter 200 mm, on a stand', 'Insulating powder packed in the annular space', 'Eight type-K thermocouples: T1–T4 on the inner sphere surface, T5–T8 on the outer sphere surface', 'Dimmerstat, digital voltmeter and ammeter', 'Digital temperature indicator, 0.1 °C'],
    stdNote: 'Guarded-hot-plate methods (ASTM C177, IS 3346) are the reference for insulation; the concentric-sphere rig gives one-dimensional radial flow without guard heaters because a sphere has no edges.',
    params: [
      { id: 'pow', label: 'Powder', type: 'select', options: Object.entries(POW).map(([k, v]) => [k, v.name]), def: 'mag' },
      { id: 'V', label: 'Heater voltage', type: 'select', options: [['40', '40 V'], ['50', '50 V'], ['60', '60 V']], def: '50' }
    ],
    opSteps: ['Check powder packing and thermocouples at room temperature', 'Switch on the heater and set the voltage', 'Log the eight temperatures every 15 minutes', 'Wait until every reading changes by ≤ 0.2 °C between logs', 'Record voltage, current and room temperature', 'Switch off and let the spheres cool'],
    svg(p) {
      let rings = ''; for (let i = 0; i < 10; i++) { const r = 100 - i * 5; rings += `<circle id="pr${i}" cx="190" cy="150" r="${r}" class="insul"/>`; }
      let tcs = ''; ANG.forEach((a, i) => { const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); tcs += G.tc(190 + 50 * c, 150 - 50 * s, 'T' + (i + 1), null, -6, -6) + G.tc(190 + 103 * c, 150 - 103 * s, 'T' + (i + 5), null, c > 0 ? 6 : -22, 4); });
      return G.svg('0 0 560 300', `${G.r(0, 0, 560, 300, 'bg')}
        <circle cx="190" cy="150" r="104" class="steel" id="osph"/>${rings}<circle cx="190" cy="150" r="50" class="spec" id="isph"/>
        ${G.heater(168, 140, 44, 20, 'htr')}${G.t(170, 178, 'heater', 'm')}${tcs}
        ${G.l(190, 254, 190, 288, 'ln', 6)}${G.r(150, 284, 80, 10, 'mach')}
        ${G.t(300, 60, 'inner Cu sphere r₁ = 50 mm', 'm')}${G.t(300, 76, 'outer Cu sphere r₂ = 100 mm', 'm')}${G.t(300, 92, 'powder packed between', 'm')}
        ${G.cbar(18, 18, 10, 70, 25, 150)}
        <g transform="translate(296,110)">${G.r(0, 0, 250, 76, 'disp', 'rx="4"')}${G.t(10, 14, 'TEMPERATURE INDICATOR °C', 'm', 'style="fill:var(--panel-ink);font-size:7.5px"')}${[0, 1, 2, 3, 4, 5, 6, 7].map(i => G.t(10 + (i % 4) * 60, 34 + Math.floor(i / 4) * 22, `T${i + 1} <tspan id="d${i}" style="fill:var(--straw);font-size:11px">--.-</tspan>`, 'm', 'style="fill:var(--panel-ink);font-size:9px"')).join('')}</g>
        <g transform="translate(296,196)">${G.r(0, 0, 250, 50, 'disp', 'rx="4"')}${G.t(10, 32, '0.0 V', 'big', 'id="dV"')}${G.t(90, 32, '0.000 A', 'big', 'id="dA"')}${G.t(180, 32, '0.0 W', 'big', 'id="dW"')}</g>
        ${G.t(300, 270, 't = 0 min', 'big', 'id="tclk" style="fill:var(--ink)"')}${G.t(430, 270, '', 'm', 'id="tst"')}`, 'Concentric sphere apparatus for insulating powder');
    },
    anim(svg, f, sim) {
      const lo = 25, hi = sim ? Math.ceil(sim.Ti / 10) * 10 + 10 : 150; G.txt(svg, 'cbhi', U.f(hi, 0)); G.txt(svg, 'cblo', U.f(lo, 0)); if (!sim) return;
      const t = f * sim.tEnd, s = K.settle(0, 1, t * 60, sim.tau, 0.85), Ti = sim.Ta + (sim.Ti - sim.Ta) * s, To = sim.Ta + (sim.To - sim.Ta) * K.settle(0, 1, t * 60, sim.tau * 1.15, 0.85);
      for (let i = 0; i < 10; i++) { const r = (100 - i * 5 - 2.5) / 1000; const T = To + (Ti - To) * (1 / r - 1 / R2) / (1 / R1 - 1 / R2); G.fill(svg, 'pr' + i, G.tcol(T, lo, hi)); }
      G.fill(svg, 'isph', G.tcol(Ti, lo, hi)); G.fill(svg, 'osph', G.tcol(To, lo, hi));
      const v = sim.read(t); for (let i = 0; i < 8; i++) G.txt(svg, 'd' + i, U.f(v[i], 1));
      G.txt(svg, 'dV', U.f(sim.V, 1) + ' V'); G.txt(svg, 'dA', U.f(sim.I, 3) + ' A'); G.txt(svg, 'dW', U.f(sim.V * sim.I, 2) + ' W'); G.txt(svg, 'tclk', `t = ${U.f(t, 0)} min`); G.txt(svg, 'tst', t >= sim.L.ssTime ? 'steady state' : 'heating up…');
    },
    liveView(el, f, sim, p, api) {
      api.title('Radial temperature profile'); const t = f * sim.tEnd; api.sub(`t = ${U.f(t, 0)} min`); const v = sim.read(t);
      const Ti = U.mean(v.slice(0, 4)), To = U.mean(v.slice(4)); const rs = U.lin(R1, R2, 40);
      G.profileView(el, { xlabel: 'Radius r (mm)', ylabel: 'Temperature (°C)', series: [{ name: '1/r profile through powder', x: rs.map(r => r * 1000), y: rs.map(r => To + (Ti - To) * (1 / r - 1 / R2) / (1 / R1 - 1 / R2)), color: 's2' }, { name: 'straight line (for comparison)', x: [50, 100], y: [Ti, To], color: 'muted', dash: true }, { name: 'mean readings', x: [50, 100], y: [Ti, To], type: 'scatter', color: 's1' }], xmin: 45, xmax: 105, ymin: 20 }, 210);
    },
    simulate(p, r) {
      const M = POW[p.pow], V = U.q(p.V * (1 + 0.004 * U.gauss(r)), 0.1), I = U.q(V / (RH * (1 + 0.01 * r())), 0.001), Q = V * I;
      const Ta = U.q(26 + 3 * r(), 0.1), k20 = M.k * (1 + 0.06 * U.gauss(r)), A2 = 4 * Math.PI * R2 * R2, Gstem = 0.004;
      let k = k20, To = Ta + 10, Ti = Ta + 80, ho = 9;
      for (let it = 0; it < 60; it++) { const Gp = 4 * Math.PI * k * R1 * R2 / (R2 - R1); const Qp = Q - Gstem * (Ti - Ta); Ti = To + Qp / Gp; const Tf = (To + Ta) / 2, hc = 1.32 * Math.pow((To - Ta) / (2 * R2), 0.25), hr = 0.6 * K.SB * (Math.pow(To + 273.15, 4) - Math.pow(Ta + 273.15, 4)) / Math.max(0.1, To - Ta); ho = hc + hr; void Tf; To = Ta + Q / (ho * A2); k = k20 * (1 + M.b * ((Ti + To) / 2 - 20)); }
      if (Ti > 250) return { error: 'The inner sphere would exceed 250 °C at this voltage. Choose a lower voltage.' };
      const Cin = 330, Cp = M.rho * 900 * (4 / 3) * Math.PI * (R2 ** 3 - R1 ** 3); const tau = 0.35 * (Cin + 0.5 * Cp) / (4 * Math.PI * k * R1 * R2 / (R2 - R1)) * (1 + 0.05 * U.gauss(r)); const dt = 15;
      const dev = [0.9, -0.4, -0.7, 0.3].map(x => x * (Ti - To) / 120), devo = [0.35, -0.1, -0.3, 0.05].map(x => x * (To - Ta) / 15);
      const chans = [...dev.map(d => ({ T0: Ta, Tss: Ti + d, tau, a: 0.85 })), ...devo.map(d => ({ T0: Ta, Tss: To + d, tau: tau * 1.15, a: 0.85 }))];
      const L = K.log(chans, { dt, thr: 0.2, extra: 2, maxN: 40 }, r); const last = L.last, rd = L.vals.map(v => v[last]);
      const T = { Q: V * I, V, I, Ti: U.mean(rd.slice(0, 4)), To: U.mean(rd.slice(4)), Ta }; T.dT = T.Ti - T.To; T.k = T.Q * (R2 - R1) / (4 * Math.PI * R1 * R2 * T.dT); T.Tm = (T.Ti + T.To) / 2; T.ho = T.Q / (A2 * (T.To - Ta)); T.Rp = T.dT / T.Q; T.Ro = (T.To - Ta) / T.Q; T.kref = M.k * (1 + M.b * (T.Tm - 20));
      const tEnd = L.times[last], fine = K.curves(chans, tEnd, 140);
      const rows = L.times.map((t, k2) => [t, ...L.vals.map(v => U.f(v[k2], 1))]);
      return { M, V, I, Ta, L, tEnd, tau, Ti, To, truth: T, dur: 12,
        read: tm => { const k2 = Math.min(last, Math.floor(tm / dt + 1e-9)); return L.vals.map(v => v[k2]); },
        readout(f) { const tm = f * tEnd, v = this.read(tm); return [['Time', U.f(tm, 0), 'min'], ['Inner mean', U.f(U.mean(v.slice(0, 4)), 1), '°C'], ['Outer mean', U.f(U.mean(v.slice(4)), 1), '°C'], ['Room', U.f(Ta, 1), '°C'], ['Power', U.f(V * I, 2), 'W']]; },
        plot: { title: 'Temperature log', xlabel: 'Time (min)', ylabel: 'Temperature (°C)', series: [...[0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ name: 'T' + (i + 1), x: fine.t, y: fine.y[i], color: i < 4 ? ['s5', 's2', 'straw', 's4'][i] : ['s1', 's6', 's3', 'muted'][i - 4], width: 1.4 }))], vlines: [{ x: L.ssTime, label: 'steady', color: 'ok' }], parallel: true, caption: 'Inner (T1–T4) and outer (T5–T8) sphere temperatures against time' },
        plots: [{ xlabel: 'Radius r (mm)', ylabel: 'Temperature (°C)', series: [{ name: 'theory: T ∝ 1/r', x: U.lin(50, 100, 30), y: U.lin(50, 100, 30).map(rr => T.To + T.dT * (1 / rr - 1 / 100) / (1 / 50 - 1 / 100)), color: 's2' }, { name: 'measured means', x: [50, 100], y: [T.Ti, T.To], type: 'scatter', color: 's1' }], caption: 'Steady radial temperature distribution through the powder' }],
        specimen: [['Powder', M.name, ''], ['Inner sphere radius r₁', R1 * 1000, 'mm'], ['Outer sphere radius r₂', R2 * 1000, 'mm'], ['Room temperature T_a', U.f(Ta, 1), '°C'], ['Logging interval', dt, 'min'], ['Packing density (approx.)', M.rho, 'kg/m³']],
        obs: [{ title: 'Table 1. Temperature log (°C)', cols: ['Time (min)', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'], rows, note: 'T1–T4 on the inner sphere, T5–T8 on the outer sphere, at four angular positions. Use the last row once steady state is reached.' },
          { title: 'Table 2. Electrical input', cols: ['Quantity', 'Reading', 'Unit'], textCols: [0, 2], rows: [['Voltage V', U.f(V, 1), 'V'], ['Current I', U.f(I, 3), 'A'], ['Room temperature', U.f(Ta, 1), '°C']] }],
        truth: T };
    },
    calcs(sim) { const T = sim.truth; return [K.ssCalc(sim.L),
      { key: 'Q', label: 'Heat input Q = VI', unit: 'W', truth: T.Q, tol: 0.01 },
      { key: 'Ti', label: 'Mean inner sphere temperature T_i (T1–T4)', unit: '°C', truth: T.Ti, abs: 0.15 },
      { key: 'To', label: 'Mean outer sphere temperature T_o (T5–T8)', unit: '°C', truth: T.To, abs: 0.15 },
      { key: 'k', label: 'Thermal conductivity of the powder k', unit: 'W/m·K', truth: T.k, tol: 0.02, hint: 'k = Q(r₂ − r₁) / [4π r₁ r₂ (T_i − T_o)]' },
      { key: 'Rp', label: 'Thermal resistance of the powder shell', unit: 'K/W', truth: T.Rp, tol: 0.02, hint: '(T_i − T_o)/Q' },
      { key: 'ho', label: 'Outer surface coefficient (convection + radiation) h_o', unit: 'W/m²·K', truth: T.ho, tol: 0.03, hint: 'Q / [4πr₂² (T_o − T_a)]' }]; },
    reference(sim) { const T = sim.truth, M = sim.M; return [{ label: `k of ${M.name} at ${U.f(T.Tm, 0)} °C`, unit: 'W/m·K', value: T.k, lo: T.kref * 0.85, hi: T.kref * 1.15, src: 'Manufacturer data / Kothandaraman (±15 %)', fmt: v => U.f(v, 4), range: `${U.f(T.kref * 0.85, 3)} – ${U.f(T.kref * 1.15, 3)}` }, { label: 'Outer coefficient h_o (free convection + radiation)', unit: 'W/m²·K', value: T.ho, lo: 6, hi: 14, src: 'Churchill (sphere) + radiation, ε ≈ 0.6', fmt: v => U.f(v, 1) }, { label: 'Share of total resistance in the powder', unit: '%', value: T.Rp / (T.Rp + T.Ro) * 100, lo: 80, hi: 99, src: 'Good insulation dominates', fmt: v => U.f(v, 1) }]; },
    valExtra(el, sim) { const T = sim.truth; el.innerHTML = `<div class="panel"><div class="panel-h"><h4>Resistance network</h4><span class="eyebrow">heater → room</span></div>${LAB.tableHTML({ cols: ['Resistance', 'Value (K/W)', 'Temperature drop (K)'], textCols: [0], rows: [['Powder shell, (r₂ − r₁)/(4πk r₁ r₂)', U.f(T.Rp, 2), U.f(T.dT, 1)], ['Outer surface, 1/(h_o 4π r₂²)', U.f(T.Ro, 3), U.f(T.To - T.Ta, 1)], ['Total', U.f(T.Rp + T.Ro, 2), U.f(T.Ti - T.Ta, 1)]] })}<p class="muted" style="font-size:.84rem">Because the powder carries ${U.f(T.Rp / (T.Rp + T.Ro) * 100, 0)} % of the total resistance, small errors in the outer temperature hardly affect k, but an error in Q affects it directly.</p></div>`; },
    sample(sim) { const T = sim.truth; return `<div class="eq">Q = VI = ${U.f(T.V, 1)} × ${U.f(T.I, 3)} = <b>${U.f(T.Q, 3)} W</b></div><div class="eq">T_i = mean(T1…T4) = <b>${U.f(T.Ti, 2)} °C</b>;  T_o = mean(T5…T8) = <b>${U.f(T.To, 2)} °C</b></div><div class="eq">k = Q(r₂ − r₁) / [4π r₁ r₂ (T_i − T_o)] = ${U.f(T.Q, 3)} × 0.05 / (4π × 0.05 × 0.10 × ${U.f(T.dT, 2)}) = <b>${U.f(T.k, 4)} W/m·K</b></div><div class="eq">h_o = Q / [4π r₂² (T_o − T_a)] = ${U.f(T.Q, 3)} / (0.1257 × ${U.f(T.To - T.Ta, 2)}) = <b>${U.f(T.ho, 2)} W/m²·K</b></div>`; },
    uncert(sim) { const T = sim.truth, uT = 0.15 / Math.sqrt(4), uD = Math.SQRT2 * uT; const uQ = T.Q * Math.hypot(0.005, 0.005); return [{ q: 'Heat input Q', expr: '√[(u_V/V)² + (u_I/I)²], 0.5 % each', val: T.Q, u: uQ, unit: 'W' }, { q: 'Temperature difference', expr: '√2 × 0.15/√4 °C (four-junction means)', val: T.dT, u: uD, unit: 'K' }, { q: 'Conductivity k', expr: '√[(u_Q/Q)² + (u_ΔT/ΔT)² + radius terms (1 mm)]', val: T.k, u: T.k * Math.hypot(uQ / T.Q, uD / T.dT, 0.02, 0.01), unit: 'W/m·K' }]; },
    conclude(sim) { const T = sim.truth; return `${sim.M.name} packed between spheres of radii 50 and 100 mm carried ${U.f(T.Q, 2)} W from the inner sphere at ${U.f(T.Ti, 1)} °C to the outer sphere at ${U.f(T.To, 1)} °C. Its thermal conductivity is ${U.f(T.k, 4)} W/m·K at a mean temperature of ${U.f(T.Tm, 0)} °C, against a handbook value of about ${U.f(T.kref, 3)} W/m·K. The powder carries ${U.f(T.Rp / (T.Rp + T.Ro) * 100, 0)} % of the total thermal resistance; the outer surface loses heat with a combined coefficient of ${U.f(T.ho, 1)} W/m²·K. Steady state took about ${sim.L.ssTime} min.`; },
    summary: 'For steady radial conduction through a spherical shell, the heat flow is the same through every concentric surface, so Q = 4πk r₁r₂(T_i − T_o)/(r₂ − r₁) and the temperature varies as 1/r. A heater inside the inner sphere supplies Q = VI, all of which must pass through the powder because a sphere has no edges to leak from. Thermocouples on both sphere surfaces give T_i and T_o; the conductivity follows directly. Insulating powders have conductivities of a few hundredths of a W/m·K, rising with mean temperature as radiation across the pores increases.',
    formulas: [['Spherical shell', 'Q = 4πk r₁ r₂ (T_i − T_o) / (r₂ − r₁)'], ['Conductivity', 'k = Q (r₂ − r₁) / [4π r₁ r₂ (T_i − T_o)]'], ['Shell resistance', 'R = (r₂ − r₁) / (4πk r₁ r₂)'], ['Temperature distribution', '(T − T_o)/(T_i − T_o) = (1/r − 1/r₂)/(1/r₁ − 1/r₂)'], ['Outer surface', 'Q = h_o · 4π r₂² (T_o − T_a)'], ['Electrical power', 'Q = V I']],
    theory: `<h3>Conduction through a spherical shell</h3><p>In a sphere heat flows radially outward. At steady state the same heat Q crosses every spherical surface of radius r, whose area is 4πr². Fourier’s law then reads Q = −k·4πr² dT/dr. Integrating from r₁ to r₂ gives Q = 4πk r₁ r₂ (T<sub>i</sub> − T<sub>o</sub>)/(r₂ − r₁).</p>
      <p>Because the area grows with radius, the temperature does not fall linearly. It varies as 1/r: steep near the inner sphere and flatter near the outer one.</p>
      <h3>Why spheres</h3><p>A slab or a cylinder of finite size loses heat from its edges or ends, and guard heaters are needed to stop that. A sphere has no edges, so all the heat generated inside the inner sphere must cross the powder. This makes the concentric-sphere method simple and accurate for loose materials such as powders, which cannot be cut into slabs.</p>
      <h3>Insulating powders</h3><p>Powders such as magnesia, diatomaceous earth, vermiculite and perlite trap air in tiny pores. Heat crosses them by conduction through particle contacts, conduction through the still air and radiation across the pores. Their conductivity, typically 0.04 to 0.09 W/m·K, rises with temperature, because radiation grows with the cube of the absolute temperature. The measured k is therefore quoted at the mean temperature of the powder.</p>
      <h3>A slow system</h3><p>The powder resists heat flow strongly but also stores heat, so the apparatus takes two to three hours to settle. Readings are taken every fifteen minutes, and steady state is reached only when they stop changing.</p>
      <h3>The outer surface</h3><p>The outer sphere loses the same heat to the room by free convection and radiation. Dividing Q by 4πr₂²(T<sub>o</sub> − T<sub>a</sub>) gives the combined surface coefficient, usually 6 to 12 W/m²·K.</p>`,
    procedure: ['Check that the powder is evenly packed and that all eight thermocouples read room temperature.', 'Switch on the heater and set the voltage with the dimmerstat.', 'Record T1–T8 every 15 minutes.', 'Continue until every reading changes by no more than 0.2 °C between logs (usually two to three hours).', 'Record the voltage, current and room temperature.', 'Calculate the mean inner and outer temperatures and the conductivity.', 'Switch off the heater.'],
    precautions: ['Pack the powder uniformly, without voids, and keep the spheres concentric.', 'Raise the voltage slowly; the inner sphere must not exceed the rated temperature.', 'Do not disturb the apparatus or open the filling port during the test.', 'Keep the apparatus away from draughts and fans; they change the outer temperature.', 'Wait for true steady state; this apparatus responds slowly.'],
    applications: ['Selection of loose-fill insulation for furnaces, kilns and cryogenic vessels.', 'Insulation of hot pipes and tanks in process plants.', 'Quality control of insulation powders in production.', 'Thermal design of building fill materials (vermiculite, perlite).'],
    errors: ['Non-uniform packing or eccentric spheres give unequal thermocouple readings.', 'Heat conducted along the support stem and heater leads.', 'Settling of the powder over time, changing its density and conductivity.', 'Taking readings before steady state.', 'Temperature dependence of k across the shell.'],
    discussion: ['Why does the temperature in the powder fall as 1/r rather than linearly?', 'Why is no guard heater needed with spheres? Where could heat still escape?', 'Compare the four inner readings. What do their differences tell you about the packing?', 'How would k change if the mean temperature were raised? Why?'],
    refs: ['F. P. Incropera et al., Fundamentals of Heat and Mass Transfer, 7th ed., Wiley, 2011, Sec. 3.4.', 'IS 3346:1980, Method for the Determination of Thermal Conductivity of Thermal Insulation Materials (Two Slab, Guarded Hot-Plate Method).', 'ASTM C177-19, Steady-State Heat Flux Measurements and Thermal Transmission Properties by Means of the Guarded-Hot-Plate Apparatus.', 'C. P. Kothandaraman, S. Subramanyan, Heat and Mass Transfer Data Book, 8th ed., New Age, 2014.', 'Y. A. Çengel, A. J. Ghajar, Heat and Mass Transfer, 5th ed., McGraw-Hill, 2015, Ch. 3.'],
    pre: [
      { q: 'For steady radial conduction in a spherical shell, the temperature varies with radius as', o: ['r', 'ln r', '1/r', 'r²'], a: 2, why: 'Integrating Q = −k4πr² dT/dr gives T linear in 1/r.' },
      { q: 'Why is a concentric sphere apparatus used for powders?', o: ['Powders are spherical', 'A sphere has no edges, so no heat escapes except through the powder', 'It heats faster', 'It is cheaper than a slab'], a: 1, why: 'There are no edge losses, so guard heaters are not needed.' },
      { q: 'A typical insulating powder has a conductivity of about', o: ['0.006 W/m·K', '0.06 W/m·K', '6 W/m·K', '60 W/m·K'], a: 1, why: 'Loose-fill insulation lies in the range 0.04–0.09 W/m·K.' },
      { q: 'The heat flowing through the powder at steady state equals', o: ['Zero', 'The heater power VI', 'The heat stored in the powder', 'Half the heater power'], a: 1, why: 'All the heat from the inner sphere must cross the powder.' },
      { q: 'This apparatus takes a long time to reach steady state mainly because', o: ['The heater is weak and the powder both resists and stores heat', 'Copper is a poor conductor', 'The thermocouples are slow', 'The room is cold'], a: 0, why: 'The time constant is roughly the shell resistance times the heat capacity.' }
    ],
    post: [
      { q: 'Q = 10 W, r₁ = 0.05 m, r₂ = 0.10 m, T_i − T_o = 100 K. k is about', o: ['0.008 W/m·K', '0.080 W/m·K', '0.80 W/m·K', '0.016 W/m·K'], a: 1, why: 'k = 10 × 0.05/(4π × 0.05 × 0.1 × 100) = 0.0796 W/m·K.' },
      { q: 'If the readings are taken while the spheres are still warming, the calculated k will be', o: ['Too low', 'Too high, because part of VI is still being stored and T_i − T_o is not yet at its final value', 'Exact', 'Negative'], a: 1, why: 'Before steady state the temperature difference has not built up fully, so Q/ΔT is too large.' },
      { q: 'Inner readings of 132, 128, 127 and 131 °C suggest', o: ['A faulty voltmeter', 'Uneven packing or slightly eccentric spheres', 'Perfect steady state', 'Radiation inside the copper'], a: 1, why: 'With uniform packing the inner sphere would be isothermal within a fraction of a degree.' },
      { q: 'The conductivity of the powder at a higher mean temperature will be', o: ['Lower', 'Higher, because radiation across the pores increases', 'The same', 'Zero'], a: 1, why: 'Radiative transfer across pores grows roughly as T³.' },
      { q: 'Doubling the outer radius while keeping r₁ and the materials the same will', o: ['Double the shell resistance', 'Increase the resistance by less than double', 'Halve the resistance', 'Leave it unchanged'], a: 1, why: 'R ∝ (1/r₁ − 1/r₂): going from 1/r₂ = 10 to 5 m⁻¹ raises (1/r₁ − 1/r₂) from 10 to 15, a 50 % increase.' }
    ]
  });
  LAB.VALID[ID] = ['p', 'Spherical-shell conduction exact; powder conductivities and their temperature coefficients are typical published values, so magnitudes are representative of each powder class.', 'Incropera Sec. 3.4; Kothandaraman data book; manufacturer data'];
  LAB.NOMEN[ID] = [['Q', 'Heat input (= heat through the powder)', 'W'], ['k', 'Thermal conductivity of the powder', 'W/m·K'], ['r₁, r₂', 'Radii of the inner and outer spheres', 'm'], ['T_i', 'Mean inner sphere temperature (T1–T4)', '°C'], ['T_o', 'Mean outer sphere temperature (T5–T8)', '°C'], ['T_a', 'Room temperature', '°C'], ['T_m', 'Mean powder temperature, (T_i + T_o)/2', '°C'], ['R', 'Thermal resistance of the shell', 'K/W'], ['h_o', 'Combined convection–radiation coefficient at the outer sphere', 'W/m²·K'], ['V, I', 'Heater voltage and current', 'V, A']];
  const E = U.ease, tag = K.tag;
  LAB.SETUP[ID] = [
    { op: 0, d: 2.6, title: 'Check packing and thermocouples', note: s => `Powder level at the filling port; all channels read ${U.f(s.Ta, 1)} °C ± 0.5 °C`, why: 'The packing and thermocouples are checked before heating; the powder cannot be topped up once it is hot.',
      draw(L, u, c) { for (let i = 0; i < 8; i++) c.txt('d' + i, u > (i + 1) / 9 ? U.f(c.sim.Ta + 0.1 * Math.sin(i * 2), 1) : '--.-'); L.innerHTML = c.active ? tag(60, 22, 'filling port closed', 190, 46) : ''; } },
    { op: 1, d: 2.6, title: 'Switch on the heater and set the voltage', note: s => `Dimmerstat to ${U.f(s.V, 0)} V; I = ${U.f(s.I, 3)} A`, why: 'The heater goes on only after the apparatus has been checked at room temperature.',
      draw(L, u, c) { const v = c.sim.V * E(u); c.txt('dV', U.f(v, 1) + ' V'); c.txt('dA', U.f(v / RH, 3) + ' A'); c.txt('dW', U.f(v * v / RH, 2) + ' W'); L.innerHTML = c.active ? K.knob(500, 268, E(u), 'dimmer') : ''; } }
  ];
  LAB.EXPL[ID] = { scenes: [
    { title: 'Two spheres and a powder', lines: [
      ['Loose powders cannot be cut into slabs, so their conductivity is measured between two concentric copper spheres.', { s: 0 }],
      ['A heater inside the small sphere supplies a known power. Four thermocouples sit on each sphere.', { s: 0 }],
      ['A sphere has no edges, so all the heat must pass through the powder. No guard heater is needed.', { s: 1 }]],
      q: { q: 'What is the main advantage of a spherical geometry for this measurement?', o: ['Spheres are easier to fill', 'There are no edges, so all the heat crosses the powder', 'The temperature is the same everywhere', 'Copper spheres do not conduct'], a: 1, why: 'Slabs and cylinders lose heat from edges or ends; a closed sphere does not.' } },
    { title: 'A very slow approach', lines: [
      ['When the heater starts, the inner sphere warms quickly but the powder holds the heat back.', { r: [0, 0.35] }],
      ['Over two to three hours, both spheres level off. The temperature difference across the powder is then fixed.', { r: [0.35, 1] }]],
      q: { q: 'Why does the inner sphere temperature keep rising long after the heater is switched on?', o: ['The heater power increases', 'The powder both resists and stores heat, so it takes hours to fill up', 'The room is cooling', 'Copper stores no heat'], a: 1, why: 'The time constant is about the shell resistance times the heat capacity, which is large for insulation.' } },
    { title: 'Working out k', lines: [
      ['At steady state, the heater power crosses every spherical surface. Because the area grows as r squared, the temperature falls as one over r.', null],
      ['The conductivity is the power times the gap, divided by four pi, the two radii and the temperature difference.', null]],
      q: { q: 'Through the powder, where is the temperature gradient steepest?', o: ['Near the outer sphere', 'Near the inner sphere, where the area is smallest', 'It is the same everywhere', 'In the middle'], a: 1, why: 'The same Q crosses a smaller area near r₁, so dT/dr must be larger there.' } }
  ] };
  LAB.SAFETY[ID] = {
    haz: ['Inner sphere and heater terminals reach 100–200 °C.', 'Mains voltage at the dimmerstat and heater leads.', 'Fine powder dust irritates eyes and lungs during filling.'],
    ppe: ['Safety glasses', 'Dust mask (FFP2) when filling or emptying powder', 'Closed shoes'],
    rules: ['Fill the powder only with the apparatus cold and switched off.', 'Raise the voltage slowly and do not exceed the rated value.', 'Keep the filling port closed during the test.', 'Do not touch the spheres until they have cooled.'],
    emerg: ['Switch off the mains isolator.', 'For burns, cool under running water for 20 minutes and report.', 'For powder in the eyes, rinse with an eyewash for 15 minutes.'] };
  LAB.LIB[ID] = { cols: ['Item', 'Specification', 'Purpose / note'], rows: [['Inner sphere', 'Copper, OD 100 mm, wall 2 mm', 'Houses the heater; nearly isothermal'], ['Outer sphere', 'Copper, ID 200 mm, two hemispheres', 'Bolted flange; filling port at top'], ['Heater', 'Nichrome on mica former, ≈ 300 Ω', 'Fed from dimmerstat'], ['Powders', 'Magnesia, kieselguhr, vermiculite, perlite', 'Dry in an oven at 110 °C before filling'], ['Thermocouples', 'Type K, 4 + 4, cemented to surfaces', 'Four angles on each sphere'], ['Funnel and tamping rod', '—', 'Even packing']], note: 'Store powders in sealed containers; absorbed moisture raises k considerably.' };
  const R = K.R, Pk = K.P, s = K.s;
  LAB.NUM[ID] = [
    r => { const Q = R(r, 6, 16, 1), dT = R(r, 60, 160), r1 = Pk(r, [0.04, 0.05, 0.06]), r2 = +(r1 * 2).toFixed(2), ans = Q * (r2 - r1) / (4 * Math.PI * r1 * r2 * dT); return { title: 'Conductivity from a sphere test', q: `In a concentric sphere apparatus r₁ = ${r1 * 1000} mm and r₂ = ${r2 * 1000} mm. With ${Q} W supplied, the steady temperature difference across the powder is ${dT} K. Find k.`, ans, unit: 'W/m·K', hints: ['Q = 4πk r₁ r₂ ΔT/(r₂ − r₁).', 'Use radii in metres.'], sol: `k = Q(r₂ − r₁)/(4π r₁ r₂ ΔT) = ${Q} × ${s(r2 - r1)}/(4π × ${r1} × ${r2} × ${dT}) = <b>${s(ans)} W/m·K</b>.` }; },
    r => { const k = Pk(r, [0.05, 0.065, 0.08]), r1 = 0.05, r2 = 0.10, dT = R(r, 80, 150), ans = 4 * Math.PI * k * r1 * r2 * dT / (r2 - r1); return { title: 'Heat loss through a spherical shell', q: `A spherical vessel of outer radius 50 mm is covered with insulation (k = ${k} W/m·K) to a radius of 100 mm. The inner and outer insulation surfaces are at a difference of ${dT} K. Find the heat loss.`, ans, unit: 'W', hints: ['Spherical shell resistance R = (r₂ − r₁)/(4πk r₁ r₂).', 'Q = ΔT/R.'], sol: `R = 0.05/(4π × ${k} × 0.05 × 0.10) = ${s((r2 - r1) / (4 * Math.PI * k * r1 * r2))} K/W. Q = ${dT}/R = <b>${s(ans)} W</b>.` }; },
    r => { const Ti = R(r, 120, 180), To = R(r, 35, 50), r1 = 50, r2 = 100, rr = Pk(r, [60, 70, 75, 80, 90]), ans = To + (Ti - To) * (1 / rr - 1 / r2) / (1 / r1 - 1 / r2); return { title: 'Temperature inside the shell', q: `The inner sphere (r₁ = 50 mm) is at ${Ti} °C and the outer (r₂ = 100 mm) at ${To} °C. Find the temperature in the powder at r = ${rr} mm.`, ans, unit: '°C', hints: ['T varies linearly with 1/r.', '(T − T_o)/(T_i − T_o) = (1/r − 1/r₂)/(1/r₁ − 1/r₂).'], sol: `(1/${rr} − 1/100)/(1/50 − 1/100) = ${s((1 / rr - 0.01) / 0.01)}. T = ${To} + ${Ti - To} × ${s((1 / rr - 0.01) / 0.01)} = <b>${s(ans)} °C</b>.` }; }
  ];
})();
