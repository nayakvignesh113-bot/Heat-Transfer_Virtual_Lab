// Builds the single-file index.html from dev.html by inlining assets/css/*.css and assets/js/*.js.
// Run from the repository root:  node tools/build.js
// Edit the files under assets/ and dev.html, never index.html directly. config.js and audio/ stay separate files.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
// keep the experiment script list in dev.html in step with assets/js/exp/
{ const dev = path.join(root, 'dev.html'); const exps = fs.readdirSync(path.join(root, 'assets/js/exp')).filter(f => f.endsWith('.js')).sort();
  let d = fs.readFileSync(dev, 'utf8'); d = d.replace(/<!-- EXP -->[\s\S]*?<!-- \/EXP -->/, '<!-- EXP -->\n' + exps.map(f => `<script src="assets/js/exp/${f}"></script>`).join('\n') + '\n<!-- /EXP -->');
  d = d.replace(/· \d+ experiments/, `· ${exps.length} experiments`); fs.writeFileSync(dev, d); }
let html = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
html = html.replace(/<link rel="stylesheet" href="(assets\/[^"]+)">/g, (m, f) => `<style>\n${fs.readFileSync(path.join(root, f), 'utf8')}\n</style>`);
const js = [];
html = html.replace(/<!-- \/?EXP -->\n?/g, '');
html = html.replace(/<script src="(assets\/[^"]+)"><\/script>\n?/g, (m, f) => { js.push(`/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(root, f), 'utf8')); return ''; });
html = html.replace(/<script>(LAB\.ext\.buildRail\(\); LAB\.boot\(\);)<\/script>/, (m, b) => `<script>\n${safe(js.join('\n'))}\n${b}\n</script>`);
html = html.replace('<head>', '<head>\n<!-- Built file: edit dev.html and assets/, then run  node tools/build.js -->');
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0), 'KB,', js.length, 'scripts inlined');
