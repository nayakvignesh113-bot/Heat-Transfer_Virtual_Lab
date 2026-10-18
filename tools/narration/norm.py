# Turns formulas, symbols, units and abbreviations in the lab text into speakable English for the TTS voice.
# Order matters: exact formula fragments first, then generic symbols, units and abbreviations.
import re

FIX = [
 ('Q = −kA dT/dx', 'Q equals minus k A d T by d x'), ('Q = −k·4πr² dT/dr', 'Q equals minus k times 4 pi r squared, d T by d r'), ('Q = −k·2πrL dT/dr', 'Q equals minus k times 2 pi r L, d T by d r'),
 ('Q = ṁ c<sub>p</sub> (T<sub>o</sub> − T<sub>i</sub>)', 'Q equals m dot c p times T o minus T i'), ('ṁc_p', 'm dot c p'), ('ṁ', 'm dot'),
 ('k = Q / (A |dT/dx|)', 'k equals Q over A times the temperature gradient'), ('|dT/dx|', 'the temperature gradient'), ('dT/dx', 'd T by d x'), ('dT/dt', 'd T by d t'), ('dT/dr', 'd T by d r'),
 ('α = k/(ρc)', 'alpha equals k over rho c'), ('ρcV dT/dt = −hA(T − T<sub>∞</sub>)', 'rho c V d T by d t equals minus h A times T minus T infinity'),
 ('Q = 4πk r₁ r₂ (T<sub>i</sub> − T<sub>o</sub>)/(r₂ − r₁)', 'Q equals 4 pi k r 1 r 2 times T i minus T o, over r 2 minus r 1'),
 ('Q = 2πkL(T<sub>in</sub> − T<sub>out</sub>)/ln(r<sub>out</sub>/r<sub>in</sub>)', 'Q equals 2 pi k L times the temperature difference, over the natural log of the radius ratio'),
 ('ln(r<sub>out</sub>/r<sub>in</sub>)/(2πkL)', 'the natural log of the radius ratio over 2 pi k L'), ('1/(h<sub>o</sub>·2πr₃L)', 'one over h o times 2 pi r 3 L'), ('r<sub>c</sub> = k/h<sub>o</sub>', 'r c equals k over h o'),
 ('δ/(kA)', 'delta over k A'), ('1/(hA)', 'one over h A'), ('1/U = Σδ/k + 1/h', 'one over U equals the sum of delta over k, plus one over h'), ('Q = UAΔT<sub>overall</sub>', 'Q equals U A delta T overall'),
 ('Q = kAΔT/δ', 'Q equals k A delta T over delta'),
 ('d²θ/dx² = m²θ', 'd squared theta by d x squared equals m squared theta'), ('m = √(hP/kA<sub>c</sub>)', 'm equals the square root of h P over k A c'), ('P/A<sub>c</sub> = 4/D', 'P over A c equals 4 over D'), ('m = √(4h/kD)', 'm equals the square root of 4 h over k D'),
 ('L<sub>c</sub> = L + D/4', 'L c equals L plus D over 4'), ('θ/θ<sub>b</sub> = cosh m(L<sub>c</sub> − x)/cosh mL<sub>c</sub>', 'theta over theta b equals cosh of m times L c minus x, over cosh m L c'), ('η = tanh(mL<sub>c</sub>)/(mL<sub>c</sub>)', 'eta equals tanh of m L c over m L c'),
 ('Ra<sub>D</sub> = gβ(T̄ − T<sub>∞</sub>)D³/(να)', 'Ra D equals g beta times the temperature difference times D cubed, over nu alpha'), ('Re<sub>D</sub> = vD/ν', 'Re D equals v D over nu'), ('Nu = C Re<sup>m</sup> Pr<sup>1/3</sup>', 'Nu equals C Re to the m, Pr to the one third'),
 ('Ra = gβΔTL³/(να)', 'Ra equals g beta delta T L cubed over nu alpha'), ('β = 1/T', 'beta equals one over T'), ('h̄L/k', 'h L over k'), ('x<sup>−¼</sup>', 'x to the minus one quarter'),
 ('Q = hA(T<sub>w</sub> − T<sub>b</sub>)', 'Q equals h A times T w minus T b'), ('ṁ = C<sub>d</sub>A₀√(2ρ<sub>a</sub>Δp)/√(1 − β⁴)', 'm dot equals C d A nought, times the square root of 2 rho a delta p, over the square root of one minus beta to the fourth'), ('Δp = ρ<sub>w</sub>gh<sub>w</sub>', 'delta p equals rho w g h w'),
 ('Nu = 0.023Re<sup>0.8</sup>Pr<sup>0.4</sup>', 'Nu equals 0.023 Re to the 0.8, Pr to the 0.4'),
 ('E<sub>b</sub> = σT⁴', 'E b equals sigma T to the fourth'), ('σT⁴', 'sigma T to the fourth'), ('T⁴', 'T to the fourth'), ('⁴', ' to the fourth'), ('5.67 × 10⁻⁸ W/m²·K⁴', '5.67 times ten to the minus 8 watts per square metre kelvin to the fourth'),
 ('W<sub>b</sub> − W<sub>t</sub> = (ε<sub>b</sub> − ε)σA(T<sub>s</sub>⁴ − T<sub>a</sub>⁴)', 'W b minus W t equals epsilon b minus epsilon, times sigma A times T s to the fourth minus T a to the fourth'),
 ('m c dT/dt = σA(T<sub>H</sub>⁴ − T<sub>d</sub>⁴)', 'm c d T by d t equals sigma A times T H to the fourth minus T d to the fourth'),
 ('q″<sub>max</sub> ∝ h<sub>fg</sub>ρ<sub>v</sub>[σg(ρ<sub>l</sub> − ρ<sub>v</sub>)/ρ<sub>v</sub>²]<sup>¼</sup>', 'the critical heat flux is proportional to h f g times rho v times the fourth root of sigma g delta rho over rho v squared'),
 ('ΔT<sub>e</sub> = T<sub>w</sub> − T<sub>sat</sub>', 'delta T e equals T w minus T sat'), ('ΔT<sub>e</sub>³', 'delta T e cubed'), ('q″', 'q'),
 ('h = 0.943[ρ<sub>l</sub>(ρ<sub>l</sub> − ρ<sub>v</sub>)gh′<sub>fg</sub>k<sub>l</sub>³/(μ<sub>l</sub>LΔT)]<sup>¼</sup>', 'h equals 0.943 times the fourth root of rho l delta rho g h f g prime k l cubed, over mu l L delta T'),
 ('1/U<sub>o</sub> = D<sub>o</sub>/(h<sub>i</sub>D<sub>i</sub>) + D<sub>o</sub>ln(D<sub>o</sub>/D<sub>i</sub>)/(2k) + 1/h<sub>o</sub>', 'one over U o equals the sum of the inside film, wall and outside film resistances'),
 ('dQ = U(T<sub>h</sub> − T<sub>c</sub>)dA', 'd Q equals U times T h minus T c, d A'), ('Q = UA·ΔT<sub>lm</sub>', 'Q equals U A delta T l m'),
 ('C<sub>min</sub>(T<sub>h,in</sub> − T<sub>c,in</sub>)', 'C min times the inlet temperature difference'), ('NTU = UA/C<sub>min</sub>', 'N T U equals U A over C min'),
 ('h = ρc(V/A)CR/(T − T<sub>q</sub>)', 'h equals rho c V over A, times the cooling rate, over T minus T q'),
 ('θ/θᵢ', 'theta over theta i'), ('θᵢ', 'theta i'), ('τ = ρcV/(hA)', 'tau equals rho c V over h A'), ('h = ρcV/(Aτ)', 'h equals rho c V over A tau'), ('V/A = R/3', 'V over A equals R over 3'), ('Bi = h(V/A)/k', 'Bi equals h V over A, over k'), ('Fo = αt/R²', 'Fo equals alpha t over R squared'), ('1 − ζ cot ζ = Bi', 'one minus zeta cot zeta equals Bi'), ('ζ₁²α/R²', 'zeta 1 squared alpha over R squared'), ('ζ₁', 'zeta 1'),
 ('W/m·K', ' watts per metre kelvin'), ('W/m²·K', ' watts per square metre kelvin'), ('kW/m²', ' kilowatts per square metre'), ('MW/m²', ' megawatts per square metre'), ('W/m²', ' watts per square metre'), ('m²/s', ' square metres per second'), ('J/kg·K', ' joules per kilogram kelvin'), ('kJ/kg', ' kilojoules per kilogram'), ('L/min', ' litres per minute'), ('mL/min', ' millilitres per minute'),
 ('h′_fg', 'h f g prime'), ('c_p,v', 'c p v'), ('AΔT', 'A delta T'), ('R134a', 'R 134 a'), ('T<sub>∞</sub>', 'T infinity'), ('T∞', 'T infinity'), ('∞', 'infinity'), ('ISO 9950', 'I S O 99 50'), ('Inconel 600', 'Inconel six hundred'), ('6061', 'sixty sixty-one'), ('CuZn30', 'copper zinc 30'),
]
# theory text arrives with <sub>x</sub> as _x and <sup>x</sup> as ^x (see extract.js)
FIX = [(re.sub(r'<sup>(.*?)</sup>', r'^\1', re.sub(r'<sub>(.*?)</sub>', r'_\1', a)), b) for a, b in FIX]

GREEK = [('ε̇', 'strain rate'), ('ℓ̄', 'mean intercept'), ('σ′', 'sigma prime'), ('σ', 'sigma'), ('ε', 'epsilon'), ('τ', 'tau'), ('θ', 'theta'), ('γ', 'gamma'), ('α', 'alpha'), ('β', 'beta'), ('δ', 'delta'),
         ('Δ', 'delta '), ('λ', 'lambda'), ('η', 'eta'), ('ζ', 'zeta'), ('ε', 'epsilon'), ('ψ', 'psi'), ('μ', 'mu'), ('π', 'pi'), ('ρ', 'rho'), ('φ', 'phi'), ('ν', 'nu'), ('κ', 'kappa'), ('Σ', 'sum of ')]
SUBS = {'₀': ' nought', '₁': ' 1', '₂': ' 2', '₃': ' 3', '₄': ' 4', '₅': ' 5'}
SUPS = [('²', ' squared'), ('³', ' cubed'), ('ⁿ', ' to the n')]
UNITS = [('°C', ' degrees Celsius'), ('µm', ' micrometres'), ('mm²', ' square millimetres'), ('mm⁴', ' millimetres to the fourth'), ('mm/min', ' millimetres per minute'),
         ('rpm', ' revolutions per minute'), ('MPa', ' megapascals'), ('GPa', ' gigapascals'), ('kgf', ' kilogram force'), ('kN', ' kilonewtons'), ('N·m', ' newton metres'),
         ('kHz', ' kilohertz'), ('MHz', ' megahertz'), ('kV', ' kilovolts'), ('mA', ' milliamps'), ('keV', ' kilo electron volts'), ('nm', ' nanometres'), ('mm', ' millimetres'),
         ('dB', ' decibels'), ('Å', ' angstroms'), ('°', ' degrees'), ('%', ' percent'), ('min', ' minutes'), ('kg', ' kilograms'), ('lux', ' lux'), ('Hz', ' hertz'), ('h', ' hours')]
ACR = {'COP': 'C O P', 'LMTD': 'L M T D', 'NTU': 'N T U', 'CHF': 'C H F', 'PAG': 'P A G', 'TEMA': 'T E M A', 'VI': 'V I', 'GI': 'G I', 'IR': 'I R', 'CPU': 'C P U', 'GPU': 'G P U', 'LED': 'L E D', 'HVAC': 'H V A C', 'Nu': 'Nusselt number', 'Re': 'Reynolds number', 'Ra': 'Rayleigh number', 'Pr': 'Prandtl number', 'Bi': 'Biot number', 'Fo': 'Fourier number', 'CR': 'cooling rate', 'NaCl': 'sodium chloride', 'Al₂O₃': 'alumina', 'IS': 'I S', 'ASTM': 'A S T M', 'ISO': 'I S O', 'FCC': 'F C C', 'BCC': 'B C C', 'BCT': 'B C T', 'HV': 'H V', 'HB': 'H B', 'HBW': 'H B W', 'HRC': 'H R C', 'HRB': 'H R B',
       'HRA': 'H R A', 'HRE': 'H R E', 'HRF': 'H R F', 'HR': 'H R', 'LMP': 'L M P', 'EDS': 'E D S', 'SEM': 'S E M', 'XRD': 'X R D', 'NDT': 'N D T', 'LVDT': 'L V D T', 'CCT': 'C C T',
       'TTT': 'T T T', 'SiC': 'silicon carbide', 'SAE': 'S A E', 'ZAF': 'Z A F', 'SRM': 'S R M', 'DBTT': 'D B T T', 'FATT': 'F A T T', 'RT': 'room temperature', 'MoS2': 'molybdenum disulphide',
       'HNO3': 'nitric acid', 'HCl': 'hydrochloric acid', 'HF': 'H F', 'Nital': 'nital', 'SDH': 'side drilled hole', 'UTM': 'U T M', 'LM6': 'L M 6', 'AC': 'A C', 'DC': 'D C', 'HWDC': 'half wave D C',
       'ASME': 'A S M E', 'MPI': 'M P I', 'Fe3C': 'iron carbide', 'PPE': 'P P E'}

def norm(t):
    for a, b in FIX:
        t = t.replace(a, b)
    for a, b in GREEK:
        t = t.replace(a, b)
    t = t.replace('̄', '').replace('̇', '')
    for a, b in SUBS.items():
        t = t.replace(a, b)
    t = re.sub(r'10⁻?[⁰¹²³⁴⁵⁶⁷⁸⁹]+', lambda m: 'ten to the ' + ('minus ' if '⁻' in m.group(0) else '') + ''.join('0123456789'['⁰¹²³⁴⁵⁶⁷⁸⁹'.index(c)] for c in m.group(0)[2:] if c != '⁻'), t)
    for a, b in SUPS:
        t = t.replace(a, b)
    t = re.sub(r'(\w)_(\w+)', r'\1 \2', t)          # sigma_t -> sigma t
    t = re.sub(r'\^(\w+)', r' to the power \1', t)
    t = re.sub(r'(\d)\s(\d{3})\b', r'\1\2', t)       # 35 000 -> 35000
    t = re.sub(r'(\d(?:\.\d+)?)\s?[–-]\s?(\d)', r'\1 to \2', t)  # numeric ranges
    for u, w in UNITS:
        t = re.sub(r'(?<=\d)\s?' + re.escape(u) + r'(?![A-Za-z²³⁴])', w, t)
    t = re.sub(r'\b(' + '|'.join(sorted(map(re.escape, ACR), key=len, reverse=True)) + r')\b', lambda m: ACR[m.group(1)], t)
    rep = [(' = ', ' equals '), ('≈', ' about '), ('∝', ' proportional to '), ('≤', ' at most '), ('≥', ' at least '), (' < ', ' less than '), (' > ', ' greater than '),
           ('→', ', which gives '), ('×', ' times '), ('±', ' plus or minus '), ('√', ' the square root of '), ('−', ' minus '), ('·', ' '), ('…', '.'), ('—', ', '), ('~', 'about '),
           ('½', ' half'), ('’', "'"), ('′', ' prime'), ('″', ' inch'), ('+', ' plus ')]
    for a, b in rep:
        t = t.replace(a, b)
    t = t.replace('–', ' ')                          # en dash between words: S–N, Coulomb–Mohr
    t = re.sub(r'(?<=[A-Za-z])/(?=[A-Za-z])', ' or ', t)
    t = t.replace('/', ' over ')
    t = t.replace('(', ', ').replace(')', ',').replace('[', ', ').replace(']', ',').replace('{', '').replace('}', '')
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'\s+([,.;:?])', r'\1', t)
    t = re.sub(r',\s*([,.;:?])', r'\1', t)
    t = re.sub(r'^,\s*', '', t)
    t = re.sub(r',\s*$', '.', t)
    return t

if __name__ == '__main__':
    import json, sys
    d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'tools/narration/narration.json'))
    bad = 0
    for k, v in d.items():
        for t in v['theory'] + [l for s in v['expl'] for l in s] + [q for q in v['q'] if q]:
            n = norm(t)
            if re.search(r'[^\x00-\x7F’üèöÜ]|[=_^<>{}\[\]/]', n):
                bad += 1; print(k, '|', n[:300])
    print('remaining', bad)
