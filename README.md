# Heat Transfer Virtual Lab

**Version 1.1** · Developed by Dr. Vignesh Nayak Ullal, Department of Mechanical Engineering, Mangalore Institute of Technology & Engineering (MITE), Moodbidri · [CC BY-NC-SA 4.0](LICENSE.md)

Live site: <https://nayakvignesh113-bot.github.io/Heat-Transfer_Virtual_Lab/>

A static, dependency-free virtual heat transfer laboratory with 18 experiments. Each experiment runs through eight stages:

**Pre-test → Theory → Operate → Experiment → Validation → Numericals → Post-test → Report**

Every rig is a heat-transfer model, not a recording. Steady temperatures come from the governing equations with properties at the right temperature; the approach to steady state follows the rig's own time constants; and each run adds thermocouple calibration offsets, resolution and noise, and the losses the textbook method neglects. Each student therefore gets their own numbers, and the losses show up honestly in the validation.

## What is new compared with the earlier labs

Built on the engine of the [Materials Testing & Characterization Virtual Lab](https://nayakvignesh113-bot.github.io/Materials-Testing/) (narrated explainers, Listen, safety gate, do-it-yourself set-up with interlocks, numericals, feedback, submission, certificates), with features specific to heat transfer:

- **Live thermal field.** Rig drawings are coloured by temperature as they heat up, with a colour bar, and a *Live view* panel shows the axial, radial or through-wall profile, the false-colour field inside a sphere, probe or liquid cell, a boiling curve, a Nu–Re plot or the refrigeration cycle on the p–h diagram, as appropriate.
- **You judge steady state.** Steady-state experiments log every channel at fixed intervals until the readings stop drifting. The first calculation asks when steady state was reached (every channel within 0.2 °C of the previous log); the run takes as long as the real rig would (minutes for copper, hours for a powder sphere).
- **Energy balance and loss honesty.** Heat lost through lagging, heater ends, radiation, guard imbalance or shell losses is modelled, so electrical input and measured heat flow differ as they do on the bench, and the validation tables show where the watts went.
- **Heat Transfer Handbook** (`#handbook`, its own tab): a complete heat and mass transfer data book so students need not buy one. 15 chapters: units and dimensionless groups; solids (37 metals with k(T), non-metals, building materials, insulation); gases at 1 atm (10 gases, 100–2000 K); liquids (water, oils, glycols, mercury, liquid metals, 12 refrigerants and organics); steam tables (T, p and superheated); refrigerant tables (9 refrigerants, saturated and superheated); steady and transient conduction with one-term tables and Heisler/Gröber charts; forced and free convection; boiling and condensation; radiation (blackbody functions, emissivities, view factors); heat exchangers (ε–NTU and F charts, U, fouling); mass transfer; erf, Bessel and hyperbolic tables. Every computed table has an interpolating look-up, charts show coordinates under the pointer, and calculators give exact transient, ε–NTU, view factor and blackbody results. *Whole handbook* prints to a PDF of about 90 A4 pages. Fluid tables are computed with CoolProp from reference equations of state (IAPWS-95 for water) by `tools/handbook/gen.py`, which writes `assets/js/hbdata.js`; hand-compiled tables carry their sources in `assets/js/handbook.js`.
- **Heat transfer data book** (`#databook`): property calculators for air at 1 atm (Incropera A.4), saturated water and steam (A.6) and R134a, each with a property-versus-temperature plot; tables of conductivity of solids, insulators and liquids; emissivities; typical h ranges; and a correlation sheet. Students look up film-temperature properties here.
- **Teaching parameters that show real effects:** guard heater on/off (liquid k), polished vs black surfaces (radiation share in free convection), Biot number large enough to break lumped analysis (transient, quench probe), heat pipe orientation and dry-out, subcooling and burnout, parallel vs counter flow.

## Experiments

| No. | Experiment | Basis | Status |
|---|---|---|---|
| 1 | Thermal conductivity of a metal rod | Fin-type rod equation with lagging loss, water calorimeter | Validated |
| 2 | Thermal conductivity of insulating powder (concentric spheres) | Spherical shell conduction, k(T) of powders | Partly validated |
| 3 | Lagging materials (lagged pipe, two layers) | Cylindrical shells in series, guards, critical radius | Partly validated |
| 4 | Composite wall: overall U | Plane-wall series resistances, symmetric stack | Partly validated |
| 5 | Thermal conductivity of liquids (incl. Al₂O₃ nanofluid) | Guarded layer heated from above; Maxwell model | Validated |
| 6 | Transient conduction: lumped and distributed cooling | Exact sphere series solution, Whitaker/Churchill h | Validated |
| 7 | Pin fin in free and forced convection | Fin equation, Churchill–Chu, Hilpert, radiation | Partly validated |
| 8 | Free convection from a vertical cylinder | Churchill–Chu, grey-body radiation correction | Validated |
| 9 | Forced convection inside a tube | Orifice meter, Gnielinski with entry effect, Dittus–Boelter | Validated |
| 10 | Heated cylinder in cross flow (velocity sweep, fit your own Nu–Re) | Churchill–Bernstein, Hilpert | Validated |
| 11 | Emissivity of a test surface | Black-disc comparison method | Validated |
| 12 | Stefan–Boltzmann constant | Initial heating rate of a disc in a black hemisphere | Partly validated |
| 13 | Pool boiling and critical heat flux | Zuber, Sun–Lienhard small wire, Ivey–Morris subcooling | Partly validated |
| 14 | Filmwise and dropwise condensation | Nusselt film theory, coolant-side Gnielinski | Partly validated |
| 15 | Double-pipe heat exchanger, parallel and counter flow | LMTD, ε–NTU, Gnielinski inner and annulus | Validated |
| 16 | Heat pipe vs solid copper rod (advanced) | Resistance model, orientation-dependent capillary limit | Teaching model |
| 17 | Vapour compression refrigeration test rig (R134a) | p–h states, actual, cycle and Carnot COP | Partly validated |
| 18 | Quenchant cooling curve, ISO 9950 probe (advanced) | Radial FD conduction, h(T_s) per quenchant, lumped-h failure | Teaching model |

Totals: 18 experiments, 54 randomised numerical problem types, 180 pre- and post-test questions, 54 explainer concept checks.

## Hosting on GitHub Pages

The repository root is the site. **Settings → Pages → Deploy from a branch → main / (root)**.

| Item | Needed on the site? |
|---|---|
| `index.html` | Yes: the whole lab in one file |
| `config.js` | Yes: the submission URL (empty = submission off) |
| `audio/` | Yes, for narration. Without it the explainer runs with captions only |
| `apps-script/` | No: Google Sheet receiver and set-up guide for faculty |
| `assets/`, `dev.html`, `tools/` | No: source files for editing and testing |

Each experiment has its own link, e.g. `…/#rod`, `…/#fin-s-operate`; also `…/#handbook`, `…/#handbook-s-trans` (one chapter), `…/#handbook-s-all` (whole handbook for printing), `…/#databook`, `…/#about`, `…/#faculty`.

## Report submission and certificates

Follow `apps-script/SUBMISSIONS_SETUP.md` (about 10 minutes) and paste the web-app URL into `config.js`. Use a new Google Sheet, separate from the NTM and Materials Testing labs. Certificate IDs start with `HTL-`.

## Structure

```
index.html              built single-file site (do not edit; run node tools/build.js)
dev.html                page shell that loads the separate source files (open this while editing)
config.js               submission URL (window.HTL_CONFIG)
assets/css/lab.css      design tokens (light and dark themes), layout, rig colours
assets/js/core.js       engine: router, 8 stages, quiz, plotter, operate (safety gate, DIY set-up), validation, report
assets/js/kit.js        heat-transfer toolkit: thermal colour map, rig glyphs, live field/profile views,
                        steady-state logger (K.log), property data (air, water/steam, R134a, solids)
assets/js/exp/NN-*.js   one self-contained file per experiment: model, rig drawing, set-up steps, explainer,
                        safety, tools, numericals, nomenclature and validation status
assets/js/site.js       rail, About, Data book, explainer player, Listen, numericals stage, feedback, submission
assets/js/cert.js       certificates: request, faculty page, PDF/PNG, verification
assets/js/handbook.js   Heat Transfer Handbook: chapters, charts, look-ups, calculators, print view
assets/js/hbdata.js     computed handbook data (generated by tools/handbook/gen.py; do not edit)
assets/js/logo.js       MITE logo as a data URI
audio/                  narration MP3s and manifest.json (generated)
apps-script/            Google Apps Script receiver and set-up guide
tools/test.js           headless check of every model, set-up step, explainer cue and numerical (node tools/test.js)
tools/e2e.py            browser run of all experiments through all 8 stages (Playwright)
tools/build.js          builds index.html from dev.html and assets/ (also syncs the experiment list)
tools/handbook/gen.py   regenerates hbdata.js (pip install CoolProp scipy numpy; python3 tools/handbook/gen.py)
tools/narration/        narration text extraction, speech normaliser and Kokoro TTS generator
```

## Editing

1. Edit files under `assets/` (open `dev.html` through a local web server, e.g. `python3 -m http.server`).
2. Run `node tools/test.js` (must end with `fails: 0`).
3. Run `node tools/build.js` to rebuild `index.html`, and upload it.

To add an experiment, copy any file in `assets/js/exp/`, change the `id` and `no`, and fill in the same blocks: `LAB.register({...})`, then `LAB.VALID`, `LAB.NOMEN`, `LAB.SETUP` (each step with a `why` for the interlock), `LAB.EXPL`, `LAB.SAFETY`, `LAB.LIB` and three `LAB.NUM` generators. `build.js` picks the file up automatically. For a steady-state rig, build the channels and call `K.log(chans, {dt, thr})`; `K.ssCalc(L)` adds the steady-state question.

If you change explainer lines or theory paragraphs, delete the affected MP3s and run `node tools/narration/extract.js`, then `python3 tools/narration/generate.py audio` (see `tools/narration/README.md`).

## Notes

- Progress and answers are stored in the browser only. Nothing leaves the browser unless the student presses *Submit feedback* or *Submit to faculty* with a submission URL configured.
- Narration voice: Kokoro-82M (Apache 2.0), voice af_heart, generated offline.
- Cite: see `CITATION.cff` or the About page.
