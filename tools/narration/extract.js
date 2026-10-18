// Writes tools/narration/narration.json: theory paragraphs (p and li of each Theory article, in page order),
// explainer lines and concept-check questions, as plain text.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const sb = { window: {}, console, Math, JSON, Date, localStorage: { getItem: () => null, setItem() { } }, document: { createElement: () => ({ getContext: () => ({}) }), documentElement: {}, body: {} }, getComputedStyle: () => ({ getPropertyValue: () => '' }) };
sb.window = sb; vm.createContext(sb);
['assets/js/core.js', 'assets/js/kit.js', ...fs.readdirSync(path.join(root, 'assets/js/exp')).sort().map(f => 'assets/js/exp/' + f)].forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb));
const strip = s => s.replace(/<sub>(.*?)<\/sub>/g, '_$1').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const out = {};
for (const e of sb.LAB.list) {
  const paras = [...e.theory.matchAll(/<(p|li)>([\s\S]*?)<\/\1>/g)].map(m => strip(m[2]));
  const X = sb.LAB.EXPL[e.id];
  out[e.id] = { name: e.title, theory: paras, expl: X ? X.scenes.map(s => s.lines.map(l => l[0])) : [], q: X ? X.scenes.map(s => s.q ? s.q.q : null) : [] };
}
fs.writeFileSync(path.join(__dirname, 'narration.json'), JSON.stringify(out, null, 1));
console.log('experiments', Object.keys(out).length, 'theory clips', Object.values(out).reduce((a, v) => a + v.theory.length, 0), 'explainer clips', Object.values(out).reduce((a, v) => a + v.expl.flat().length + v.q.filter(Boolean).length, 0));
