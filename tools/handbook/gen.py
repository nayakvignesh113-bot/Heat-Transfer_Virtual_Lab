"""Generates assets/js/hbdata.js, the computed part of the Heat Transfer Handbook.

Everything here is computed from open reference formulations, not copied:
  * fluids: CoolProp (IAPWS-95 water, Lemmon air, reference EOS + transport models)
  * liquid sodium: Fink & Leibowitz (ANL), lead-bismuth eutectic and lead: OECD/NEA LBE handbook (2015)
  * transient eigenvalues, Heisler/Groeber charts, fin efficiency, F factors, e-NTU, view factors,
    Moody, blackbody functions, erf and Bessel tables: computed from the analytical results.
Run from the repository root:  python3 tools/handbook/gen.py
"""
import json, math, os
import numpy as np
import CoolProp.CoolProp as CP
from scipy import special as sp, optimize as opt, integrate

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
P0 = 101325.0
HB = {}

def sig(x, n=4):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))): return None
    if x == 0: return 0
    return float(f'{x:.{n}g}')

def tbl(cols, rows, **kw):
    d = dict(cols=cols, rows=[[sig(v) if isinstance(v, float) else v for v in r] for r in rows]); d.update(kw); return d

# ------------------------------------------------------------------ gases at 1 atm
GCOLS = ['T (K)', 'ρ (kg/m³)', 'c<sub>p</sub> (kJ/kg·K)', 'μ·10⁷ (N·s/m²)', 'ν·10⁶ (m²/s)', 'k·10³ (W/m·K)', 'α·10⁶ (m²/s)', 'Pr']
def gas_rows(fl, Ts):
    out = []
    for T in Ts:
        try:
            rho = CP.PropsSI('D', 'T', T, 'P', P0, fl); cp = CP.PropsSI('C', 'T', T, 'P', P0, fl)
            mu = CP.PropsSI('V', 'T', T, 'P', P0, fl); k = CP.PropsSI('L', 'T', T, 'P', P0, fl)
        except Exception:
            continue
        out.append([T, rho, cp / 1e3, mu * 1e7, mu / rho * 1e6, k * 1e3, k / (rho * cp) * 1e6, mu * cp / k])
    return out

def rng(a, b, s): return [float(x) for x in np.arange(a, b + s / 2, s)]
air_T = rng(100, 1000, 50) + rng(1100, 2000, 100)
GASES = [
    ('air', 'Air', 'Air', air_T),
    ('n2', 'Nitrogen (N₂)', 'Nitrogen', rng(100, 1000, 50) + rng(1100, 2000, 100)),
    ('o2', 'Oxygen (O₂)', 'Oxygen', rng(100, 1000, 50) + rng(1100, 2000, 100)),
    ('co2', 'Carbon dioxide (CO₂)', 'CarbonDioxide', rng(250, 1000, 50) + rng(1100, 2000, 100)),
    ('h2', 'Hydrogen (H₂)', 'Hydrogen', rng(100, 1000, 50)),
    ('he', 'Helium (He)', 'Helium', rng(100, 1000, 50) + rng(1100, 2000, 100)),
    ('ar', 'Argon (Ar)', 'Argon', rng(100, 1000, 50) + rng(1100, 2000, 100)),
    ('ch4', 'Methane (CH₄)', 'Methane', rng(150, 600, 50)),
    ('nh3v', 'Ammonia vapour (NH₃)', 'Ammonia', rng(250, 700, 50)),
    ('steam', 'Water vapour (steam) at 1 atm', 'Water', [380.0] + rng(400, 1000, 50) + rng(1100, 2000, 100)),
]
HB['gases'] = {}
for key, name, fl, Ts in GASES:
    HB['gases'][key] = tbl(GCOLS, gas_rows(fl, Ts), name=name, src='CoolProp ' + CP.get_global_param_string('version') + ' (reference equation of state and transport models)')

# ------------------------------------------------------------------ saturated water (transport)
def sat_liq_transport(fl, Ts):
    rows = []
    for T in Ts:
        try:
            p = CP.PropsSI('P', 'T', T, 'Q', 0, fl); rl = CP.PropsSI('D', 'T', T, 'Q', 0, fl); rv = CP.PropsSI('D', 'T', T, 'Q', 1, fl)
            hfg = CP.PropsSI('H', 'T', T, 'Q', 1, fl) - CP.PropsSI('H', 'T', T, 'Q', 0, fl)
            cpl = CP.PropsSI('C', 'T', T, 'Q', 0, fl); cpv = CP.PropsSI('C', 'T', T, 'Q', 1, fl)
            mul = CP.PropsSI('V', 'T', T, 'Q', 0, fl); muv = CP.PropsSI('V', 'T', T, 'Q', 1, fl)
            kl = CP.PropsSI('L', 'T', T, 'Q', 0, fl); kv = CP.PropsSI('L', 'T', T, 'Q', 1, fl)
            sig_ = CP.PropsSI('I', 'T', T, 'Q', 0, fl)
            beta = CP.PropsSI('isobaric_expansion_coefficient', 'T', T, 'Q', 0, fl)
        except Exception as ex:
            continue
        rows.append(dict(T=T, p=p, rl=rl, rv=rv, hfg=hfg, cpl=cpl, cpv=cpv, mul=mul, muv=muv, kl=kl, kv=kv, s=sig_, beta=beta))
    return rows

wT = [273.16] + rng(275, 370, 5) + [373.15] + rng(375, 640, 5) + [645.0, 647.0]
W = sat_liq_transport('Water', wT)
HB['satwater'] = tbl(['T (K)', 'T (°C)', 'p<sub>sat</sub> (bar)', 'ρ<sub>l</sub> (kg/m³)', 'ρ<sub>v</sub> (kg/m³)', 'h<sub>fg</sub> (kJ/kg)',
                      'c<sub>p,l</sub> (kJ/kg·K)', 'c<sub>p,v</sub> (kJ/kg·K)', 'μ<sub>l</sub>·10⁶ (N·s/m²)', 'μ<sub>v</sub>·10⁶ (N·s/m²)',
                      'k<sub>l</sub>·10³ (W/m·K)', 'k<sub>v</sub>·10³ (W/m·K)', 'Pr<sub>l</sub>', 'Pr<sub>v</sub>', 'σ·10³ (N/m)', 'β<sub>l</sub>·10⁶ (1/K)'],
                     [[r['T'], round(r['T'] - 273.15, 2), r['p'] / 1e5, r['rl'], r['rv'], r['hfg'] / 1e3, r['cpl'] / 1e3, r['cpv'] / 1e3, r['mul'] * 1e6, r['muv'] * 1e6,
                       r['kl'] * 1e3, r['kv'] * 1e3, r['mul'] * r['cpl'] / r['kl'], r['muv'] * r['cpv'] / r['kv'], r['s'] * 1e3, r['beta'] * 1e6] for r in W],
                     name='Saturated water: liquid and vapour transport properties', src='CoolProp (IAPWS-95, IAPWS 2008 viscosity, IAPWS 2011 conductivity, IAPWS 2014 surface tension)')

# ------------------------------------------------------------------ steam tables (thermodynamic)
def steam_by_T(Ts):
    rows = []
    for Tc in Ts:
        T = Tc + 273.15
        g = lambda prop, q: CP.PropsSI(prop, 'T', T, 'Q', q, 'Water')
        hf, hg, sf, sg = g('H', 0) / 1e3, g('H', 1) / 1e3, g('S', 0) / 1e3, g('S', 1) / 1e3
        rows.append([Tc, g('P', 0) / 1e5, 1 / g('D', 0), 1 / g('D', 1), hf, hg - hf, hg, sf, sg - sf, sg])
    return rows
def steam_by_p(ps):
    rows = []
    for pb in ps:
        p = pb * 1e5
        g = lambda prop, q: CP.PropsSI(prop, 'P', p, 'Q', q, 'Water')
        hf, hg, sf, sg = g('H', 0) / 1e3, g('H', 1) / 1e3, g('S', 0) / 1e3, g('S', 1) / 1e3
        rows.append([pb, g('T', 0) - 273.15, 1 / g('D', 0), 1 / g('D', 1), hf, hg - hf, hg, sf, sg - sf, sg])
    return rows
SCOLS = ['v<sub>f</sub> (m³/kg)', 'v<sub>g</sub> (m³/kg)', 'h<sub>f</sub> (kJ/kg)', 'h<sub>fg</sub> (kJ/kg)', 'h<sub>g</sub> (kJ/kg)', 's<sub>f</sub> (kJ/kg·K)', 's<sub>fg</sub> (kJ/kg·K)', 's<sub>g</sub> (kJ/kg·K)']
sT = [0.01] + rng(5, 370, 5) + [373.0]
HB['steamT'] = tbl(['T (°C)', 'p (bar)'] + SCOLS, steam_by_T(sT), name='Saturated water and steam: temperature table', src='CoolProp IAPWS-95; reference: u and s of saturated liquid at the triple point = 0')
sP = [0.006117, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.75, 1.0, 1.01325, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10,
      12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220]
HB['steamP'] = tbl(['p (bar)', 'T<sub>sat</sub> (°C)'] + SCOLS, steam_by_p(sP), name='Saturated water and steam: pressure table', src='CoolProp IAPWS-95')
# superheated steam
SH_P = [0.1, 0.5, 1, 2, 5, 10, 20, 40, 60, 80, 100, 150, 200]
sh = {}
for pb in SH_P:
    p = pb * 1e5; Ts = CP.PropsSI('T', 'P', p, 'Q', 1, 'Water') - 273.15
    rows = [['Sat.', round(Ts, 2), 1 / CP.PropsSI('D', 'P', p, 'Q', 1, 'Water'), CP.PropsSI('H', 'P', p, 'Q', 1, 'Water') / 1e3, CP.PropsSI('S', 'P', p, 'Q', 1, 'Water') / 1e3]]
    for Tc in [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800]:
        if Tc <= Ts + 0.5: continue
        T = Tc + 273.15
        rows.append(['', Tc, 1 / CP.PropsSI('D', 'T', T, 'P', p, 'Water'), CP.PropsSI('H', 'T', T, 'P', p, 'Water') / 1e3, CP.PropsSI('S', 'T', T, 'P', p, 'Water') / 1e3])
    sh[str(pb)] = tbl(['', 'T (°C)', 'v (m³/kg)', 'h (kJ/kg)', 's (kJ/kg·K)'], rows, name=f'p = {pb} bar (T<sub>sat</sub> = {Ts:.2f} °C)')
HB['steamSH'] = dict(src='CoolProp IAPWS-95', p=SH_P, t=sh)

# ------------------------------------------------------------------ saturated liquids: refrigerants & organics (transport)
LCOLS = ['T (K)', 'T (°C)', 'p<sub>sat</sub> (bar)', 'ρ<sub>l</sub> (kg/m³)', 'c<sub>p,l</sub> (kJ/kg·K)', 'μ<sub>l</sub>·10⁶ (N·s/m²)', 'ν<sub>l</sub>·10⁷ (m²/s)', 'k<sub>l</sub>·10³ (W/m·K)', 'α<sub>l</sub>·10⁷ (m²/s)', 'Pr<sub>l</sub>', 'h<sub>fg</sub> (kJ/kg)', 'ρ<sub>v</sub> (kg/m³)', 'σ·10³ (N/m)', 'β<sub>l</sub>·10³ (1/K)']
def sat_liq_rows(fl, Ts):
    out = []
    for r in sat_liq_transport(fl, Ts):
        a = r['kl'] / (r['rl'] * r['cpl'])
        out.append([r['T'], round(r['T'] - 273.15, 2), r['p'] / 1e5, r['rl'], r['cpl'] / 1e3, r['mul'] * 1e6, r['mul'] / r['rl'] * 1e7, r['kl'] * 1e3, a * 1e7,
                    r['mul'] * r['cpl'] / r['kl'], r['hfg'] / 1e3, r['rv'], r['s'] * 1e3 if r['s'] else None, r['beta'] * 1e3])
    return out
SATL = [
    ('r134a', 'Refrigerant R134a', 'R134a', rng(230, 360, 10)),
    ('r22', 'Refrigerant R22', 'R22', rng(230, 360, 10)),
    ('r410a', 'Refrigerant R410A', 'R410A', rng(230, 340, 10)),
    ('r32', 'Refrigerant R32', 'R32', rng(230, 340, 10)),
    ('r1234yf', 'Refrigerant R1234yf', 'R1234yf', rng(230, 360, 10)),
    ('r600a', 'Isobutane R600a', 'IsoButane', rng(240, 380, 10)),
    ('r290', 'Propane R290', 'n-Propane', rng(230, 360, 10)),
    ('nh3', 'Ammonia R717', 'Ammonia', rng(220, 400, 10)),
    ('co2l', 'Carbon dioxide R744', 'CarbonDioxide', rng(220, 300, 5)),
    ('ethanol', 'Ethanol', 'Ethanol', rng(250, 450, 10)),
    ('methanol', 'Methanol', 'Methanol', rng(250, 450, 10)),
    ('benzene', 'Benzene', 'Benzene', rng(280, 500, 10)),
]
HB['satliq'] = {}
for key, name, fl, Ts in SATL:
    HB['satliq'][key] = tbl(LCOLS, sat_liq_rows(fl, Ts), name=name + ', saturated liquid', src='CoolProp (reference EOS; transport models as implemented in CoolProp)')

# ------------------------------------------------------------------ refrigerant thermodynamic tables (ASHRAE reference)
RCOLS = ['T (°C)', 'p (kPa)', 'v<sub>f</sub>·10³ (m³/kg)', 'v<sub>g</sub> (m³/kg)', 'h<sub>f</sub> (kJ/kg)', 'h<sub>fg</sub> (kJ/kg)', 'h<sub>g</sub> (kJ/kg)', 's<sub>f</sub> (kJ/kg·K)', 's<sub>g</sub> (kJ/kg·K)']
REFS = [('r134a', 'R134a', 'R134a'), ('r22', 'R22', 'R22'), ('r410a', 'R410A', 'R410A'), ('r32', 'R32', 'R32'), ('r1234yf', 'R1234yf', 'R1234yf'),
        ('r600a', 'R600a (isobutane)', 'IsoButane'), ('r290', 'R290 (propane)', 'n-Propane'), ('nh3', 'R717 (ammonia)', 'Ammonia'), ('co2', 'R744 (carbon dioxide)', 'CarbonDioxide')]
HB['refsat'] = {}; HB['refsh'] = {}
for key, name, fl in REFS:
    CP.set_reference_state(fl, 'ASHRAE')
    Tc_ = CP.PropsSI('Tcrit', fl) - 273.15; Tt = CP.PropsSI('Ttriple', fl) - 273.15
    rows = []
    for Tc in rng(-50, 70, 2) if key != 'co2' else rng(-50, 30, 2):
        if Tc >= Tc_ - 0.3 or Tc <= Tt + 0.3: continue
        T = Tc + 273.15
        g = lambda prop, q: CP.PropsSI(prop, 'T', T, 'Q', q, fl)
        hf, hg = g('H', 0) / 1e3, g('H', 1) / 1e3
        rows.append([Tc, g('P', 0) / 1e3, 1e3 / g('D', 0), 1 / g('D', 1), hf, hg - hf, hg, g('S', 0) / 1e3, g('S', 1) / 1e3])
    note = 'ASHRAE reference: h = 0 and s = 0 for saturated liquid at −40 °C.' + (' For the zeotropic blend R410A, liquid values are on the bubble line and vapour values on the dew line; glide is about 0.1 K.' if key == 'r410a' else '')
    HB['refsat'][key] = tbl(RCOLS, rows, name=name + ' saturated', src='CoolProp; ' + note, Tcrit=round(Tc_, 2))
    # superheated
    sh = {}
    plist = {'co2': [1000, 2000, 3000, 4000, 5000, 6000]}.get(key, [100, 140, 200, 320, 400, 500, 600, 800, 1000, 1200, 1400, 1600])
    for pk in plist:
        p = pk * 1e3
        try: Ts = CP.PropsSI('T', 'P', p, 'Q', 1, fl) - 273.15
        except Exception: continue
        rr = [['Sat.', round(Ts, 2), 1 / CP.PropsSI('D', 'P', p, 'Q', 1, fl), CP.PropsSI('H', 'P', p, 'Q', 1, fl) / 1e3, CP.PropsSI('S', 'P', p, 'Q', 1, fl) / 1e3]]
        t0 = math.ceil((Ts + 0.5) / 10) * 10
        for Tc in rng(t0, t0 + 100, 10):
            T = Tc + 273.15
            rr.append(['', Tc, 1 / CP.PropsSI('D', 'T', T, 'P', p, fl), CP.PropsSI('H', 'T', T, 'P', p, fl) / 1e3, CP.PropsSI('S', 'T', T, 'P', p, fl) / 1e3])
        sh[str(pk)] = tbl(['', 'T (°C)', 'v (m³/kg)', 'h (kJ/kg)', 's (kJ/kg·K)'], rr, name=f'p = {pk/1000:g} MPa (T<sub>sat</sub> = {Ts:.2f} °C)')
    HB['refsh'][key] = dict(name=name + ' superheated vapour', p=plist, t=sh)
    CP.set_reference_state(fl, 'DEF')

# ------------------------------------------------------------------ liquid metals
LMC = ['T (K)', 'ρ (kg/m³)', 'c<sub>p</sub> (kJ/kg·K)', 'μ·10⁴ (N·s/m²)', 'ν·10⁷ (m²/s)', 'k (W/m·K)', 'α·10⁵ (m²/s)', 'Pr']
def lm_rows(Ts, rho, cp, mu, k):
    return [[T, rho(T), cp(T) / 1e3, mu(T) * 1e4, mu(T) / rho(T) * 1e7, k(T), k(T) / (rho(T) * cp(T)) * 1e5, mu(T) * cp(T) / k(T)] for T in Ts]
na = lm_rows(rng(400, 1200, 50),
             lambda T: 219 + 275.32 * (1 - T / 2503.7) + 511.58 * (1 - T / 2503.7) ** 0.5,
             lambda T: 1e3 * (1.6582 - 8.4790e-4 * T + 4.4541e-7 * T ** 2 - 2992.6 / T ** 2),
             lambda T: math.exp(-6.4406 - 0.3958 * math.log(T) + 556.835 / T),
             lambda T: 124.67 - 0.11381 * T + 5.5226e-5 * T ** 2 - 1.1842e-8 * T ** 3)
lbe = lm_rows(rng(400, 1100, 50), lambda T: 11065 - 1.293 * T, lambda T: 164.8 - 3.94e-2 * T + 1.25e-5 * T ** 2 - 4.56e5 / T ** 2,
              lambda T: 4.94e-4 * math.exp(754.1 / T), lambda T: 3.284 + 1.617e-2 * T - 2.305e-6 * T ** 2)
pb = lm_rows(rng(650, 1200, 50), lambda T: 11441 - 1.2795 * T, lambda T: 175.1 - 4.961e-2 * T + 1.985e-5 * T ** 2 - 2.099e-9 * T ** 3 - 1.524e6 / T ** 2,
             lambda T: 4.55e-4 * math.exp(1069 / T), lambda T: 9.2 + 0.011 * T)
HB['lmetal'] = {
    'na': tbl(LMC, na, name='Sodium (Na), liquid', src='Fink & Leibowitz, ANL/RE-95/2 (1995), recommended correlations'),
    'lbe': tbl(LMC, lbe, name='Lead–bismuth eutectic (44.5 Pb–55.5 Bi), liquid', src='OECD/NEA Handbook on lead-bismuth eutectic alloy and lead properties (2015), recommended correlations'),
    'pb': tbl(LMC, pb, name='Lead (Pb), liquid', src='OECD/NEA Handbook on lead-bismuth eutectic alloy and lead properties (2015), recommended correlations'),
}

# ------------------------------------------------------------------ transient conduction: eigenvalues
def roots_wall(Bi, n):
    r = []
    for i in range(n):
        a, b = i * math.pi + 1e-12, i * math.pi + math.pi / 2 - 1e-12
        r.append(opt.brentq(lambda z: z * math.tan(z) - Bi, a, b))
    return r
def roots_cyl(Bi, n):
    f = lambda z: z * sp.j1(z) - Bi * sp.j0(z)
    zs = [0.0] + list(sp.jn_zeros(0, n + 1))  # roots lie between zeros of J1 and next zero of J0
    j1z = [0.0] + list(sp.jn_zeros(1, n + 1))
    r = []
    for i in range(n):
        a, b = j1z[i] + 1e-12, zs[i + 1] - 1e-12
        r.append(opt.brentq(f, a, b))
    return r
def roots_sph(Bi, n):
    r = []
    for i in range(n):
        a, b = i * math.pi + 1e-9, (i + 1) * math.pi - 1e-9
        f = lambda z: 1 - z / math.tan(z) - Bi
        r.append(opt.brentq(f, a, b))
    return r
def C_wall(z): return 4 * math.sin(z) / (2 * z + math.sin(2 * z))
def C_cyl(z): return 2 / z * sp.j1(z) / (sp.j0(z) ** 2 + sp.j1(z) ** 2)
def C_sph(z): return 4 * (math.sin(z) - z * math.cos(z)) / (2 * z - math.sin(2 * z))
BIS = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.15, 0.20, 0.25, 0.30, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 20.0, 30.0, 40.0, 50.0, 100.0]
rows = []
for Bi in BIS:
    zw, zc, zs = roots_wall(Bi, 1)[0], roots_cyl(Bi, 1)[0], roots_sph(Bi, 1)[0]
    rows.append([Bi, zw, C_wall(zw), zc, C_cyl(zc), zs, C_sph(zs)])
rows.append(['∞', math.pi / 2, 4 / math.pi, sp.jn_zeros(0, 1)[0], C_cyl(sp.jn_zeros(0, 1)[0]), math.pi, 2.0])
HB['oneterm'] = tbl(['Bi', 'ζ₁ (rad), plane wall', 'C₁, plane wall', 'ζ₁, cylinder', 'C₁, cylinder', 'ζ₁, sphere', 'C₁, sphere'], [[r[0]] + [round(float(v), 4) for v in r[1:]] for r in rows])
rows = []
for Bi in [0, 0.001, 0.002, 0.004, 0.006, 0.008, 0.01, 0.02, 0.04, 0.06, 0.08, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10, 15, 20, 30, 40, 50, 60, 80, 100, '∞']:
    if Bi == '∞': rr = [(2 * i + 1) * math.pi / 2 for i in range(6)]
    elif Bi == 0: rr = [i * math.pi for i in range(6)]
    else: rr = roots_wall(Bi, 6)
    rows.append([Bi] + [round(v, 4) for v in rr])
HB['wallroots'] = tbl(['Bi = hL/k', 'ζ₁', 'ζ₂', 'ζ₃', 'ζ₄', 'ζ₅', 'ζ₆'], rows)

def series(geo, Bi, Fo, xs, N=60):
    """exact series: theta/theta_i at positions xs (fraction of L or r0) and Q/Q0"""
    zf = {'wall': roots_wall, 'cyl': roots_cyl, 'sph': roots_sph}[geo](Bi, N)
    th = np.zeros(len(xs)); Q = 0.0
    for z in zf:
        e = math.exp(-z * z * Fo)
        if geo == 'wall':
            C = C_wall(z); th += C * e * np.cos(z * np.asarray(xs)); Q += C * e * math.sin(z) / z
        elif geo == 'cyl':
            C = C_cyl(z); th += C * e * sp.j0(z * np.asarray(xs)); Q += C * e * 2 * sp.j1(z) / z
        else:
            C = C_sph(z); x = np.asarray(xs) * z
            th += C * e * np.where(x == 0, 1.0, np.sin(x) / np.where(x == 0, 1, x)); Q += C * e * 3 * (math.sin(z) - z * math.cos(z)) / z ** 3
    return th, 1 - Q

# Heisler centre charts: theta_o vs Fo for 1/Bi
invBi = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100]  # panels: <=2.5 | 3-14 | 16-100
heis = {}
for geo in ['wall', 'cyl', 'sph']:
    curves = []
    for ib in invBi:
        Bi = 1e6 if ib == 0 else 1 / ib
        pts = []
        for Fo in np.concatenate([np.linspace(0.01, 4, 50), np.linspace(4.5, 100, 45), np.linspace(105, 720, 40)]):
            th, _ = series(geo, Bi, float(Fo), [0.0], N=40 if Fo < 0.2 else 8)
            v = float(th[0])
            if v < 0.001: break
            if v <= 1.0: pts.append([round(float(Fo), 4), sig(v, 4)])
        curves.append(dict(label=f'{ib:g}', pts=pts))
    heis[geo] = curves
# position correction theta/theta_o vs 1/Bi (one-term, valid Fo > 0.2)
pos = {}
for geo in ['wall', 'cyl', 'sph']:
    curves = []
    for xr in [0.2, 0.4, 0.6, 0.8, 0.9, 1.0]:
        pts = []
        for ib in np.geomspace(0.01, 100, 80):
            Bi = 1 / ib; z = {'wall': roots_wall, 'cyl': roots_cyl, 'sph': roots_sph}[geo](Bi, 1)[0]
            v = math.cos(z * xr) if geo == 'wall' else (sp.j0(z * xr) if geo == 'cyl' else math.sin(z * xr) / (z * xr))
            pts.append([sig(float(ib), 4), sig(float(v), 4)])
        curves.append(dict(label=f'{xr:g}', pts=pts))
    pos[geo] = curves
# Groeber heat ratio Q/Q0 vs Bi^2 Fo for Bi
grob = {}
for geo in ['wall', 'cyl', 'sph']:
    curves = []
    for Bi in [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]:
        pts = []
        for x in np.geomspace(1e-5, 1e4, 60):
            Fo = x / Bi ** 2
            if Fo < 1e-4: continue
            _, q = series(geo, Bi, float(Fo), [0.0], N=60 if Fo < 0.05 else 15)
            pts.append([sig(float(x), 4), sig(float(min(max(q, 0), 1)), 4)])
            if q > 0.9995: break
        curves.append(dict(label=f'{Bi:g}', pts=pts))
    grob[geo] = curves
HB['heisler'] = dict(centre=heis, pos=pos, grober=grob)

# ------------------------------------------------------------------ math tables
HB['erf'] = tbl(['η', 'erf η', 'erfc η', 'e<sup>−η²</sup>'], [[round(x, 2), sp.erf(x), sp.erfc(x), math.exp(-x * x)] for x in np.arange(0, 3.61, 0.02)])
HB['bessel'] = tbl(['x', 'J₀(x)', 'J₁(x)', 'Y₀(x)', 'Y₁(x)', 'I₀(x)', 'I₁(x)', 'K₀(x)', 'K₁(x)', 'e<sup>−x</sup>I₀', 'e<sup>x</sup>K₀'],
                   [[round(x, 2), sp.j0(x), sp.j1(x), sp.y0(x) if x > 0 else None, sp.y1(x) if x > 0 else None, sp.i0(x), sp.i1(x), sp.k0(x) if x > 0 else None, sp.k1(x) if x > 0 else None, sp.i0e(x), sp.k0e(x) if x > 0 else None]
                    for x in list(np.arange(0, 3.01, 0.1)) + list(np.arange(3.2, 6.01, 0.2)) + list(np.arange(6.5, 10.01, 0.5))])
HB['hyper'] = tbl(['x', 'sinh x', 'cosh x', 'tanh x'], [[round(x, 2), math.sinh(x), math.cosh(x), math.tanh(x)] for x in list(np.arange(0, 2.01, 0.05)) + list(np.arange(2.2, 5.01, 0.2)) + [6, 7, 8, 9, 10]])

# ------------------------------------------------------------------ blackbody functions
C2 = 14387.77  # um K
def F0(lt):
    z = C2 / lt; s = 0.0
    for n in range(1, 60):
        s += math.exp(-n * z) / n * (z ** 3 + 3 * z * z / n + 6 * z / n ** 2 + 6 / n ** 3)
    return 15 / math.pi ** 4 * s
C1 = 3.741771852e8  # W um^4/m^2
SIG = 5.670374419e-8
def Ebl_over_sT5(lt): return C1 / (lt ** 5 * (math.exp(C2 / lt) - 1)) / SIG  # (um K W/m2)^-1 ... per (um·K)^-1 *1e? -> report as 1/(um K)
lts = list(range(200, 2000, 100)) + list(range(2000, 6000, 100)) + list(range(6000, 10000, 200)) + list(range(10000, 20001, 1000)) + [25000, 30000, 40000, 50000, 75000, 100000]
HB['bbf'] = tbl(['λT (µm·K)', 'F<sub>0→λT</sub>', 'E<sub>λ,b</sub>/σT⁵ ·10⁴ (µm·K)⁻¹', 'E<sub>λ,b</sub>(λT)/E<sub>λ,b</sub>(λ<sub>max</sub>T)'],
                [[lt, F0(lt), Ebl_over_sT5(lt) * 1e4, Ebl_over_sT5(lt) / Ebl_over_sT5(2897.77)] for lt in lts])

# ------------------------------------------------------------------ fin efficiency curves  x = Lc^1.5 (h/(k Ap))^0.5
xs = np.linspace(0.005, 2.5, 120)
fins = []
fins.append(dict(label='Rectangular (straight or pin, corrected length)', pts=[[sig(x), sig(math.tanh(math.sqrt(2) * x) / (math.sqrt(2) * x))] for x in xs]))
fins.append(dict(label='Triangular', pts=[[sig(x), sig(sp.i1(2 * x) / (x * sp.i0(2 * x)))] for x in xs]))
fins.append(dict(label='Concave parabolic', pts=[[sig(x), sig(2 / (math.sqrt(4 * (x * math.sqrt(2 / 3)) ** 2 + 1) + 1))] for x in xs]))
ann = []
for rr in [1.0001, 2, 3, 4, 5]:
    pts = []
    for x in xs:
        mlc = math.sqrt(2) * x
        if rr < 1.01: eta = math.tanh(mlc) / mlc
        else:
            mr1 = mlc / (rr - 1); mr2 = mr1 * rr
            C = 2 * mr1 / (mr2 ** 2 - mr1 ** 2)
            eta = C * (sp.k1(mr1) * sp.i1(mr2) - sp.i1(mr1) * sp.k1(mr2)) / (sp.i0(mr1) * sp.k1(mr2) + sp.k0(mr1) * sp.i1(mr2))
        pts.append([sig(float(x)), sig(float(eta))])
    ann.append(dict(label=f'{1 if rr < 1.01 else rr:g}', pts=pts))
HB['fineff'] = dict(straight=fins, annular=ann)

# ------------------------------------------------------------------ heat exchangers: e-NTU and F
def eps(kind, N, Cr):
    if Cr < 1e-9: return 1 - math.exp(-N)
    if kind == 'parallel': return (1 - math.exp(-N * (1 + Cr))) / (1 + Cr)
    if kind == 'counter':
        return N / (1 + N) if abs(Cr - 1) < 1e-9 else (1 - math.exp(-N * (1 - Cr))) / (1 - Cr * math.exp(-N * (1 - Cr)))
    if kind == 'shell1':
        s = math.sqrt(1 + Cr * Cr); return 2 / (1 + Cr + s * (1 + math.exp(-N * s)) / (1 - math.exp(-N * s)))
    if kind == 'shell2':
        e1 = eps('shell1', N / 2, Cr)
        if abs(Cr - 1) < 1e-9: return 2 * e1 / (1 + e1)
        a = ((1 - e1 * Cr) / (1 - e1)) ** 2; return (a - 1) / (a - Cr)
    if kind == 'xunmixed':  # exact series (Mason 1954 / Baclic)
        s = 0.0
        for n in range(0, 80):
            pn = 1 - sum(N ** k / math.factorial(k) * math.exp(-N) for k in range(n + 1))
            pnc = 1 - sum((Cr * N) ** k / math.factorial(k) * math.exp(-Cr * N) for k in range(n + 1))
            s += pn * pnc
        return s / (Cr * N)
    if kind == 'xCmaxmixed': return (1 / Cr) * (1 - math.exp(-Cr * (1 - math.exp(-N))))
    if kind == 'xCminmixed': return 1 - math.exp(-(1 / Cr) * (1 - math.exp(-Cr * N)))
    raise ValueError(kind)
EK = [('parallel', 'Parallel flow'), ('counter', 'Counter flow'), ('shell1', 'One shell pass, 2, 4, 6 … tube passes'), ('shell2', 'Two shell passes, 4, 8 … tube passes'),
      ('xunmixed', 'Cross flow, both fluids unmixed'), ('xCmaxmixed', 'Cross flow, C<sub>max</sub> mixed, C<sub>min</sub> unmixed'), ('xCminmixed', 'Cross flow, C<sub>min</sub> mixed, C<sub>max</sub> unmixed')]
ent = {}
for k, lab in EK:
    cs = []
    for Cr in [0, 0.25, 0.5, 0.75, 1.0]:
        pts = [[sig(float(N)), sig(eps(k, float(N), Cr))] for N in np.linspace(0.02, 5, 50)]
        cs.append(dict(label=f'{Cr:g}', pts=pts))
    ent[k] = dict(name=lab, curves=cs)
HB['entu'] = ent

def Ffactor(kind, P, R):
    """F for tube-side P, R (R = (T1-T2)/(t2-t1) = Ct/Cs)"""
    if P <= 0: return 1.0
    if R * P >= 1 or P >= 1: return None
    Cr = R if R <= 1 else 1 / R
    e = P if R <= 1 else P * R
    # find NTU (on Cmin) giving e
    try:
        f = lambda N: eps(kind if kind != 'xmixed_s' else ('xCmaxmixed' if R <= 1 else 'xCminmixed'), N, Cr) - e
        if f(60) < 0: return None
        N = opt.brentq(f, 1e-8, 60)
    except Exception:
        return None
    Nt = N if R <= 1 else N / R  # NTU on tube fluid
    d1, d2 = 1 - P, 1 - R * P
    lm = d1 if abs(d1 - d2) < 1e-12 else (d1 - d2) / math.log(d1 / d2)
    return P / (Nt * lm)
FK = [('shell1', 'One shell pass and 2, 4, 6 … tube passes'), ('shell2', 'Two shell passes and 4, 8 … tube passes'),
      ('xunmixed', 'Single-pass cross flow, both fluids unmixed'), ('xmixed_s', 'Single-pass cross flow, shell-side (T) fluid mixed, tube-side (t) fluid unmixed')]
Fd = {}
for k, lab in FK:
    cs = []
    for R in [0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0]:
        pts = []; Pmax = min(1.0, 1.0 / R)
        for s_ in np.concatenate([np.linspace(0.005, 0.8, 40), 1 - np.geomspace(0.2, 1e-5, 90)]):
            P = Pmax * float(s_)
            F = Ffactor(k, P, R)
            if F is None: continue
            if F < 0.5: break
            pts.append([sig(P, 4), sig(F, 4)])
        cs.append(dict(label=f'{R:g}', pts=pts))
    Fd[k] = dict(name=lab, curves=cs)
HB['Ffac'] = Fd

# ------------------------------------------------------------------ view factors (3D analytical)
def vf_parallel(X, Y):
    a = math.log(math.sqrt((1 + X * X) * (1 + Y * Y) / (1 + X * X + Y * Y)))
    return 2 / (math.pi * X * Y) * (a + X * math.sqrt(1 + Y * Y) * math.atan(X / math.sqrt(1 + Y * Y)) + Y * math.sqrt(1 + X * X) * math.atan(Y / math.sqrt(1 + X * X)) - X * math.atan(X) - Y * math.atan(Y))
def vf_perp(H, W):
    t1 = W * math.atan(1 / W) + H * math.atan(1 / H) - math.sqrt(H * H + W * W) * math.atan(1 / math.sqrt(H * H + W * W))
    a = (1 + W * W) * (1 + H * H) / (1 + W * W + H * H)
    b = (W * W * (1 + W * W + H * H) / ((1 + W * W) * (W * W + H * H))) ** (W * W)
    c = (H * H * (1 + H * H + W * W) / ((1 + H * H) * (H * H + W * W))) ** (H * H)
    return (t1 + 0.25 * math.log(a * b * c)) / (math.pi * W)
def vf_discs(Ri, Rj):
    S = 1 + (1 + Rj * Rj) / (Ri * Ri)
    return 0.5 * (S - math.sqrt(S * S - 4 * (Rj / Ri) ** 2))
HB['vf'] = {
    'parallel': [dict(label=f'{Y:g}', pts=[[sig(float(X)), sig(vf_parallel(float(X), Y))] for X in np.geomspace(0.1, 20, 70)]) for Y in [0.1, 0.2, 0.4, 0.6, 1.0, 2.0, 4.0, 10.0, 20.0]],
    'perp': [dict(label=f'{Wv:g}', pts=[[sig(float(Hh)), sig(vf_perp(float(Hh), Wv))] for Hh in np.geomspace(0.1, 10, 70)]) for Wv in [0.05, 0.1, 0.2, 0.4, 0.6, 1.0, 1.5, 2.0, 4.0, 10.0]],
    'discs': [dict(label=f'{rj:g}', pts=[[sig(float(L)), sig(vf_discs(1 / float(L), rj / float(L)))] for L in np.geomspace(0.1, 10, 70)]) for rj in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0, 8.0]],
}
# check: perp H=W=1 -> 0.2000, parallel X=Y=1 -> 0.1998
assert abs(vf_perp(1, 1) - 0.20004) < 1e-3, vf_perp(1, 1)
assert abs(vf_parallel(1, 1) - 0.1998) < 1e-3, vf_parallel(1, 1)

# ------------------------------------------------------------------ Moody chart (Colebrook)
def colebrook(Re, rr):
    f = 0.02
    for _ in range(60):
        f = (-2 * math.log10(rr / 3.7 + 2.51 / (Re * math.sqrt(f)))) ** -2
    return f
moody = [dict(label='Laminar 64/Re', pts=[[sig(float(R)), sig(64 / float(R))] for R in np.geomspace(600, 4000, 12)])]
for rr in [0, 1e-6, 5e-6, 1e-5, 5e-5, 1e-4, 2e-4, 5e-4, 1e-3, 2e-3, 5e-3, 0.01, 0.02, 0.03, 0.05]:
    moody.append(dict(label=('smooth' if rr == 0 else f'{rr:g}'), pts=[[sig(float(R)), sig(colebrook(float(R), rr))] for R in np.geomspace(2300, 1e8, 70)]))
HB['moody'] = moody

# ------------------------------------------------------------------ gas diffusion coefficients (Fuller-Schettler-Giddings)
FV = {'Air': (28.97, 19.7), 'H₂O': (18.015, 13.1), 'CO₂': (44.01, 26.7), 'O₂': (32.0, 16.3), 'N₂': (28.013, 18.5), 'H₂': (2.016, 6.12), 'He': (4.003, 2.67), 'NH₃': (17.03, 20.7),
      'CO': (28.01, 18.0), 'Ar': (39.95, 16.2), 'SO₂': (64.07, 41.8), 'CH₄': (16.04, 15.9 + 4 * 2.31), 'C₂H₅OH (ethanol)': (46.07, 2 * 15.9 + 6 * 2.31 + 6.11), 'CH₃OH (methanol)': (32.04, 15.9 + 4 * 2.31 + 6.11),
      'C₆H₆ (benzene)': (78.11, 6 * 15.9 + 6 * 2.31 - 18.3), 'C₁₀H₈ (naphthalene)': (128.17, 10 * 15.9 + 8 * 2.31 - 2 * 18.3), 'CH₃COCH₃ (acetone)': (58.08, 3 * 15.9 + 6 * 2.31 + 6.11), 'Toluene': (92.14, 7 * 15.9 + 8 * 2.31 - 18.3)}
def fuller(a, b, T, pbar=1.01325):
    Ma, va = FV[a]; Mb, vb = FV[b]; Mab = 2 / (1 / Ma + 1 / Mb)
    return 0.00143 * T ** 1.75 / (pbar * math.sqrt(Mab) * (va ** (1 / 3) + vb ** (1 / 3)) ** 2) * 1e-4
rows = []
for a in ['H₂O', 'CO₂', 'O₂', 'N₂', 'H₂', 'He', 'NH₃', 'CO', 'Ar', 'SO₂', 'CH₄', 'C₂H₅OH (ethanol)', 'CH₃OH (methanol)', 'CH₃COCH₃ (acetone)', 'C₆H₆ (benzene)', 'Toluene', 'C₁₀H₈ (naphthalene)']:
    rows.append([a + ' – air'] + [fuller(a, 'Air', T) * 1e5 for T in [273.15, 298.15, 323.15, 373.15, 473.15]])
rows += [['H₂ – O₂', fuller('H₂', 'O₂', 273.15) * 1e5, fuller('H₂', 'O₂', 298.15) * 1e5, fuller('H₂', 'O₂', 323.15) * 1e5, fuller('H₂', 'O₂', 373.15) * 1e5, fuller('H₂', 'O₂', 473.15) * 1e5],
         ['CO₂ – N₂', fuller('CO₂', 'N₂', 273.15) * 1e5, fuller('CO₂', 'N₂', 298.15) * 1e5, fuller('CO₂', 'N₂', 323.15) * 1e5, fuller('CO₂', 'N₂', 373.15) * 1e5, fuller('CO₂', 'N₂', 473.15) * 1e5],
         ['H₂O – N₂', fuller('H₂O', 'N₂', 273.15) * 1e5, fuller('H₂O', 'N₂', 298.15) * 1e5, fuller('H₂O', 'N₂', 323.15) * 1e5, fuller('H₂O', 'N₂', 373.15) * 1e5, fuller('H₂O', 'N₂', 473.15) * 1e5],
         ['He – N₂', fuller('He', 'N₂', 273.15) * 1e5, fuller('He', 'N₂', 298.15) * 1e5, fuller('He', 'N₂', 323.15) * 1e5, fuller('He', 'N₂', 373.15) * 1e5, fuller('He', 'N₂', 473.15) * 1e5]]
HB['diffgas'] = tbl(['Pair A – B', '0 °C', '25 °C', '50 °C', '100 °C', '200 °C'], rows)
# water vapour in air: saturation (for evaporation problems)
rows = []
for Tc in rng(0, 100, 5):
    T = Tc + 273.15; ps = CP.PropsSI('P', 'T', T, 'Q', 0, 'Water'); rv = CP.PropsSI('D', 'T', T, 'Q', 1, 'Water')
    rows.append([Tc, ps / 1e3, rv, 0.622 * ps / (P0 - ps) if ps < P0 else None, fuller('H₂O', 'Air', T) * 1e5, fuller('H₂O', 'Air', T) and (CP.PropsSI('V', 'T', T, 'P', P0, 'Air') / CP.PropsSI('D', 'T', T, 'P', P0, 'Air')) / fuller('H₂O', 'Air', T)])
HB['humid'] = tbl(['T (°C)', 'p<sub>sat</sub> (kPa)', 'ρ<sub>v,sat</sub> (kg/m³)', 'ω<sub>sat</sub> at 1 atm (kg/kg dry air)', 'D<sub>H₂O–air</sub>·10⁵ (m²/s)', 'Sc (air)'], rows)

with open(os.path.join(ROOT, 'assets', 'js', 'hbdata.js'), 'w', encoding='utf-8') as f:
    f.write('/* Heat Transfer Handbook: computed data. Generated by tools/handbook/gen.py — do not edit by hand. */\n')
    f.write('window.LAB = window.LAB || {}; window.LAB.HB = ' + json.dumps(HB, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('hbdata.js', os.path.getsize(os.path.join(ROOT, 'assets', 'js', 'hbdata.js')) // 1024, 'KB')
