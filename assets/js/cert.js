/* Certificates of completion, approved by the faculty in the Google Sheet (same Apps Script as submissions).
   Student: Report tab → Request certificate (after post-test pass, feedback and report submission) → Check status → download PDF/PNG.
   Faculty: #faculty page with FACULTY_KEY (approve, revoke, preview, draft, bulk PDF, copy link; submissions with full reports, issue without request).  Anyone: #verify-<ID>.
   Optional config.js keys: certMinPost (post-test pass %, default 60), certInstitution, certDepartment, certFaculty. */
(function () {
  'use strict';
  const U = LAB.U, esc = U.esc, $ = (s, el) => (el || document).querySelector(s), EXT = LAB.ext;
  const CFG = window.HTL_CONFIG || {};
  const CERT = { min: CFG.certMinPost != null ? CFG.certMinPost : 60, inst: CFG.certInstitution || 'Mangalore Institute of Technology & Engineering (MITE), Moodbidri',
    dept: CFG.certDepartment || 'Department of Mechanical Engineering', fac: CFG.certFaculty || 'Dr. Vignesh Nayak Ullal',
    site: 'https://nayakvignesh113-bot.github.io/Heat-Transfer_Virtual_Lab/' };
  const url = () => (window.HTL_CONFIG || {}).submitUrl || '';
  const stu = () => LAB.Store.get('student', {}) || {};
  const code = () => (LAB.Store.get('classCode', '') || '').trim();
  const certTok = () => { const a = new Uint8Array(12); try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 12; i++) a[i] = Math.random() * 256 | 0; } return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
  async function certGet(params) { const r = await fetch(url() + '?' + new URLSearchParams(params).toString()); return r.json(); }
  async function certPost(body) { const r = await fetch(url(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }); return r.json(); }
  const procOf = e => 'EXP' + String(e.no).padStart(2, '0');
  const procName = e => `Experiment ${e.no}: ${e.title}`;
  const LOGO_IMG = new Image(); if (LAB.LOGO) LOGO_IMG.src = LAB.LOGO;
  const LOGO_READY = (LAB.LOGO && LOGO_IMG.decode ? LOGO_IMG.decode() : Promise.resolve()).catch(() => { });
  const ready = async () => { try { await document.fonts.ready; } catch (e) { } await LOGO_READY; };

  /* ---------- eligibility ---------- */
  function certElig(e, S) {
    const post = S.post && S.post.score != null ? S.post.score : null;
    return [{ ok: post != null, t: 'Post-test completed' }, { ok: post != null && post >= CERT.min, t: `Post-test score at least ${CERT.min} %${post != null ? ` (now ${post} %)` : ''}` },
      { ok: !!S.valid, t: 'Results checked in the Validation stage' }, { ok: !!S.feedback, t: 'Feedback form submitted' }, { ok: !!S.submitted, t: 'Report submitted to faculty' }];
  }

  /* ---------- drawing: A4 landscape, 1754 × 1240 px (about 150 dpi) ---------- */
  const F = { disp: '"Archivo","Arial Narrow",Arial,sans-serif', body: '"IBM Plex Sans",Arial,sans-serif', mono: '"IBM Plex Mono",Consolas,monospace' };
  function fit(c, txt, font, size, maxW) { let s = size; do { c.font = font.replace('{s}', s); if (c.measureText(txt).width <= maxW) break; s -= 2; } while (s > 14); return s; }
  function spaced(c, t, cx, y, sp) { const al = c.textAlign; c.textAlign = 'left'; const ws = [...t].map(ch => c.measureText(ch).width); let x = cx - (ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1)) / 2; [...t].forEach((ch, i) => { c.fillText(ch, x, y); x += ws[i] + sp; }); c.textAlign = al; }
  function drawCert(cv, d) {
    const W = 1754, H = 1240; cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const ink = '#16212b', acc = '#1d5a91', gold = '#a8741f', mut = '#566473';
    c.fillStyle = '#fcfbf7'; c.fillRect(0, 0, W, H);
    c.save(); c.strokeStyle = 'rgba(29,90,145,0.10)'; c.lineWidth = 1; for (let i = 0; i < 60; i++) { c.beginPath(); c.ellipse(W / 2, H / 2, W / 2 - 40 - i * 2, H / 2 - 40 - i * 1.4, 0, 0, Math.PI * 2); c.stroke(); } c.restore();
    c.fillStyle = '#fcfbf7'; c.fillRect(120, 110, W - 240, H - 220);
    c.strokeStyle = acc; c.lineWidth = 8; c.strokeRect(46, 46, W - 92, H - 92); c.strokeStyle = gold; c.lineWidth = 2; c.strokeRect(70, 70, W - 140, H - 140); c.strokeRect(80, 80, W - 160, H - 160);
    [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]].forEach(([x, y]) => { c.fillStyle = gold; c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillRect(-11, -11, 22, 22); c.restore(); });
    // faint stress–strain curve as the seal
    c.save(); c.globalAlpha = 0.05; c.strokeStyle = acc; c.lineWidth = 14; c.lineCap = 'round'; c.beginPath();
    const ox = W / 2 - 420, oy = H / 2 + 230; c.moveTo(ox, oy); c.lineTo(ox + 60, oy - 330); c.lineTo(ox + 90, oy - 310);
    for (let i = 0; i <= 40; i++) { const t = i / 40; c.lineTo(ox + 90 + 650 * t, oy - 310 - 150 * Math.sin(Math.PI * Math.min(1, t * 0.85)) + (t > 0.8 ? 260 * (t - 0.8) : 0)); } c.stroke();
    c.font = `800 120px ${F.disp}`; c.fillStyle = acc; c.textAlign = 'center'; c.fillText('HEAT TRANSFER', W / 2, H / 2 + 60); c.restore();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = acc; c.font = `500 24px ${F.mono}`; spaced(c, 'HEAT TRANSFER VIRTUAL LAB', W / 2, 185, 4);
    if (LOGO_IMG.complete && LOGO_IMG.naturalWidth) { const lh = 170, lw = lh * LOGO_IMG.naturalWidth / LOGO_IMG.naturalHeight; c.drawImage(LOGO_IMG, 150, 125, lw, lh); }
    c.fillStyle = ink; fit(c, CERT.inst, `600 {s}px ${F.body}`, 34, 1180); c.fillText(CERT.inst, W / 2, 238);
    c.fillStyle = mut; c.font = `400 28px ${F.body}`; c.fillText(CERT.dept, W / 2, 278);
    c.fillStyle = ink; c.font = `750 100px ${F.disp}`; c.fillText('Certificate of Completion', W / 2, 420);
    c.strokeStyle = gold; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 260, 452); c.lineTo(W / 2 + 260, 452); c.stroke();
    c.fillStyle = mut; c.font = `italic 400 32px ${F.body}`; c.fillText('This is to certify that', W / 2, 525);
    c.fillStyle = ink; fit(c, d.name, `700 {s}px ${F.disp}`, 84, 1300); c.fillText(d.name, W / 2, 625);
    c.fillStyle = mut; c.font = `500 28px ${F.mono}`; c.fillText(`USN ${d.usn}${d.section ? '   ·   ' + d.section : ''}`, W / 2, 680);
    c.fillStyle = ink; c.font = `400 32px ${F.body}`; c.fillText('has successfully completed the virtual laboratory experiment', W / 2, 760);
    c.fillStyle = acc; fit(c, d.processName, `700 {s}px ${F.body}`, 50, 1400); c.fillText(d.processName, W / 2, 835);
    c.fillStyle = mut; fit(c, `${d.std ? d.std + '  ·  ' : ''}safety briefing, set-up, test, validation, numericals and post-test  ·  post-test score ${d.postScore}`, `400 {s}px ${F.body}`, 26, 1420);
    c.fillText(`${d.std ? d.std + '  ·  ' : ''}safety briefing, set-up, test, validation, numericals and post-test  ·  post-test score ${d.postScore}`, W / 2, 885);
    const fy = 1040; c.textAlign = 'left'; c.fillStyle = ink; c.font = `600 28px ${F.body}`; c.fillText(d.approvedOn || '', 210, fy - 12);
    c.strokeStyle = ink; c.lineWidth = 1.5; c.beginPath(); c.moveTo(210, fy); c.lineTo(560, fy); c.stroke(); c.fillStyle = mut; c.font = `400 24px ${F.body}`; c.fillText('Date of approval', 210, fy + 34);
    c.textAlign = 'right'; c.fillStyle = ink; c.font = 'italic 600 34px Georgia,"Times New Roman",serif'; c.fillText(CERT.fac, W - 210, fy - 12);
    c.beginPath(); c.moveTo(W - 600, fy); c.lineTo(W - 210, fy); c.stroke(); c.fillStyle = mut; c.font = `400 24px ${F.body}`; c.fillText('Faculty convener', W - 210, fy + 34);
    c.textAlign = 'center'; c.fillStyle = mut; { const t = `Certificate ID ${d.certId}  ·  verify at ${CERT.site}#verify-${d.certId}`; fit(c, t, `500 {s}px ${F.mono}`, 21, 1440); c.fillText(t, W / 2, 1118); }
    if (d.draft) { c.save(); c.translate(W / 2, H / 2); c.rotate(-Math.PI / 7); c.textAlign = 'center'; c.textBaseline = 'middle'; fit(c, 'DRAFT — NOT APPROVED', `800 {s}px ${F.disp}`, 150, 1300); c.lineWidth = 5; c.strokeStyle = 'rgba(178,59,42,0.55)'; c.fillStyle = 'rgba(178,59,42,0.16)'; c.fillText('DRAFT — NOT APPROVED', 0, 0); c.strokeText('DRAFT — NOT APPROVED', 0, 0); c.font = `600 34px ${F.body}`; c.fillStyle = 'rgba(178,59,42,0.75)'; c.fillText('Not valid until approved by the faculty convener', 0, 120); c.restore(); }
    return cv;
  }
  async function certCanvas(d) { await ready(); return drawCert(document.createElement('canvas'), d); }
  // Minimal PDF writer: one full-page JPEG per A4-landscape page (no external library).
  function pdfFromJpegs(imgs) {
    const enc = new TextEncoder(); const parts = []; let len = 0; const offs = [];
    const put = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body, stream) => { offs[n] = len; put(`${n} 0 obj\n`); if (stream) { put(body); put('stream\n'); put(stream); put('\nendstream\n'); } else put(body); put('endobj\n'); };
    const W = 841.89, H = 595.28, n = imgs.length, pageIds = imgs.map((_, i) => 3 + i * 3);
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>\n');
    obj(2, `<< /Type /Pages /Count ${n} /Kids [${pageIds.map(id => id + ' 0 R').join(' ')}] >>\n`);
    imgs.forEach((im, i) => { const pg = 3 + i * 3, img = pg + 1, ct = pg + 2; const cs = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
      obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${ct} 0 R >>\n`);
      obj(img, `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\n`, im.bytes);
      obj(ct, `<< /Length ${cs.length} >>\n`, enc.encode(cs)); });
    const total = 3 + n * 3, xref = len; let x = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let k = 1; k < total; k++) x += String(offs[k]).padStart(10, '0') + ' 00000 n \n';
    put(x); put(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  LAB.pdfFromJpegs = pdfFromJpegs;
  const jpegBytes = cv => { const bin = atob(cv.toDataURL('image/jpeg', 0.92).split(',')[1]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  const certFile = (d, ext) => `Certificate-${d.process}-${String(d.usn).replace(/[^A-Za-z0-9]/g, '')}.${ext}`;
  async function certPDF(list, name) { const imgs = []; for (const d of list) { const cv = await certCanvas(d); imgs.push({ bytes: jpegBytes(cv), w: cv.width, h: cv.height }); } saveBlob(pdfFromJpegs(imgs), name); }
  async function certPNG(d) { const cv = await certCanvas(d); cv.toBlob(b => saveBlob(b, certFile(d, 'png')), 'image/png'); }
  LAB.drawCert = drawCert;

  /* ---------- student: certificate card on the Report tab ---------- */
  EXT.certHTML = function (e, S) {
    const E = certElig(e, S), ok = E.every(x => x.ok), C = S.cert || {};
    return `<div class="panel stack certcard" id="certbox" style="gap:8px"><h4>Certificate of completion</h4>
      <ul class="certlist">${E.map(x => `<li class="${x.ok ? 'ok' : ''}">${x.ok ? '✓' : '○'} ${x.t}</li>`).join('')}</ul>
      <div class="controls"><button class="btn" type="button" id="certreq"${ok && url() ? '' : ' disabled'}>${C.certId ? 'Request again' : 'Request certificate'}</button>
      <button class="btn quiet" type="button" id="certchk"${C.certId && url() ? '' : ' disabled'}>Check status</button></div>
      <p class="muted" style="font-size:.8rem" id="certmsg" aria-live="polite">${!url() ? 'Certificates need your faculty’s Google Sheet, which is not connected to this copy of the lab.' : C.status === 'approved' ? 'Approved. Download below.' : C.certId ? `Requested (ID ${esc(C.certId)}). Your faculty must approve it before you can download it. Press Check status later.` : ok ? 'You can request your certificate. Your faculty will approve it.' : 'Complete the items above to request a certificate.'}</p>
      <div id="certview"></div></div>`;
  };
  function certShow(d) {
    const v = $('#certview'); if (!v) return;
    v.innerHTML = `<canvas class="certprev" id="certcv" role="img" aria-label="Certificate of completion for ${esc(d.name)}"></canvas>${LAB.EMBED ? '<p class="muted" style="font-size:.8rem">Downloads are disabled in this preview window. Open the lab from its website to download the certificate.</p>' : `<div class="controls"><button class="btn" type="button" id="certpdf">Download PDF</button><button class="btn quiet" type="button" id="certpng">Download image (PNG)</button><span class="muted" style="font-size:.8rem" id="certdl" aria-live="polite"></span></div>`}`;
    (async () => { await ready(); drawCert($('#certcv'), d); })();
    if (LAB.EMBED) return;
    $('#certpdf').onclick = async () => { $('#certdl').textContent = 'Preparing PDF…'; try { await certPDF([d], certFile(d, 'pdf')); $('#certdl').textContent = 'Downloaded.'; } catch (e) { $('#certdl').textContent = 'Could not make the PDF; use the PNG button.'; } };
    $('#certpng').onclick = () => certPNG(d);
  }
  EXT.certBind = function (e, S, rerender) {
    const C = S.cert || (S.cert = {}); const m = () => $('#certmsg');
    if (C.status === 'approved' && C.cert) certShow(C.cert);
    const rq = $('#certreq'); if (rq) rq.onclick = async () => {
      const st = stu(); if (!(st.name || '').trim() || !(st.usn || '').trim()) { m().innerHTML = '<span class="bad">Enter your name and USN under Report details first.</span>'; return; }
      if (!code()) { m().innerHTML = '<span class="bad">Enter the class code under Submit to faculty first.</span>'; return; }
      rq.disabled = true; m().textContent = 'Sending request…'; C.token = C.token || certTok();
      try {
        const r = await certPost({ type: 'certreq', classCode: code(), name: st.name.trim(), usn: st.usn.trim().toUpperCase(), section: [st.section, st.batch].filter(Boolean).join(' / '), process: procOf(e), processName: procName(e), std: e.std.split(';')[0].trim(), postScore: `${S.post.score} %`, reportId: LAB.reportId(e, S), token: C.token });
        if (r.ok) { C.certId = r.certId; C.status = r.status; LAB.save(e.id); rerender(); setTimeout(() => { const b = $('#certbox'); b && b.scrollIntoView({ block: 'nearest' }); }, 0); return; }
        m().innerHTML = r.error === 'class code' ? '<span class="bad">Class code not accepted.</span>' : `<span class="bad">Request failed: ${esc(r.error || 'unknown')}</span>`;
      } catch (er) { m().innerHTML = '<span class="bad">Could not reach the faculty sheet.</span> Check your connection and try again.'; }
      rq.disabled = false;
    };
    const ck = $('#certchk'); if (ck) ck.onclick = async () => {
      ck.disabled = true; m().textContent = 'Checking…';
      try {
        const r = await certGet({ action: 'status', usn: (stu().usn || '').trim().toUpperCase(), process: procOf(e), token: C.token || '' });
        if (r.ok && r.status === 'approved') { C.status = 'approved'; C.cert = r.cert; LAB.save(e.id); m().textContent = 'Approved. Download below.'; certShow(r.cert); }
        else if (r.ok && r.status === 'pending') { C.status = 'pending'; LAB.save(e.id); m().textContent = `Still waiting for approval (ID ${C.certId}). Check again later.`; }
        else if (r.ok && r.status === 'none') m().textContent = 'No request found. Press Request certificate.';
        else if (r.error === 'token') m().innerHTML = '<span class="bad">This request was made from another device or browser.</span> Press Request again to link it to this one.';
        else m().textContent = 'Could not check the status. Try again.';
      } catch (er) { m().innerHTML = '<span class="bad">Could not reach the faculty sheet.</span>'; }
      ck.disabled = false;
    };
  };

  /* ---------- faculty page (#faculty) ---------- */
  const FAC = { rows: [], key: '', filter: 'pending', q: '', arm: false, view: 'certs', subs: [], sq: '', sfil: 'all' };
  try { FAC.key = sessionStorage.getItem('htl-fac') || ''; } catch (e) { }
  EXT.faculty = function (el) {
    document.title = 'Faculty: certificates and reports — Heat Transfer Virtual Lab';
    el.innerHTML = `<section class="wrap" style="padding-block:28px 40px"><p class="eyebrow">Faculty</p><h1 style="margin-top:6px">Certificates and reports</h1>
      <p class="muted" style="margin-top:8px;max-width:75ch">Approve certificate requests, issue certificates for students who never requested one, and download certificates and full lab reports. You can also approve by ticking <b>Approved</b> in the <i>Certificates</i> tab of your Google Sheet.</p>
      ${url() ? `<form class="panel stack" id="facf" style="gap:10px;margin-top:16px;max-width:520px" onsubmit="return false"><div class="field"><label for="fkey">Faculty key</label><input id="fkey" type="password" autocomplete="current-password" value="${esc(FAC.key)}"></div><div class="controls"><button class="btn" type="submit">Load</button><span class="muted" style="font-size:.84rem" id="fmsg" aria-live="polite"></span></div></form>
      <div class="factabs" role="tablist"><button type="button" role="tab" data-v="certs" aria-selected="${FAC.view === 'certs'}">Certificate requests</button><button type="button" role="tab" data-v="subs" aria-selected="${FAC.view === 'subs'}">Submissions &amp; reports</button></div>
      <div id="ftable" style="margin-top:16px"></div>` : '<p class="bad" style="margin-top:12px">The Google Sheet is not connected (config.js has no submitUrl). See apps-script/SUBMISSIONS_SETUP.md.</p>'}</section>`;
    const f = $('#facf'); if (!f) return;
    f.onsubmit = () => { FAC.key = $('#fkey').value.trim(); try { sessionStorage.setItem('htl-fac', FAC.key); } catch (e) { } facLoad(); return false; };
    document.querySelectorAll('.factabs [data-v]').forEach(b => b.onclick = () => { FAC.view = b.dataset.v; FAC.arm = false; document.querySelectorAll('.factabs [data-v]').forEach(x => x.setAttribute('aria-selected', x === b)); facLoad(); });
    if (FAC.key) facLoad();
  };
  async function facLoad() {
    const m = $('#fmsg'); m.textContent = 'Loading…'; if (FAC.view === 'subs') return subsLoad();
    try {
      const r = await certGet({ action: 'list', key: FAC.key });
      if (!r.ok) { m.innerHTML = r.error === 'faculty key' ? '<span class="bad">Faculty key not accepted.</span> Check the FACULTY_KEY script property.' : '<span class="bad">' + esc(r.error) + '</span>'; $('#ftable').innerHTML = ''; return; }
      FAC.rows = r.rows; m.textContent = `${r.rows.length} request${r.rows.length === 1 ? '' : 's'} · ${r.rows.filter(x => !x.approved).length} pending`; facTable();
    } catch (e) { m.innerHTML = '<span class="bad">Could not reach the Google Sheet.</span>'; }
  }
  function facTable() {
    const q = FAC.q.toLowerCase(); const rows = FAC.rows.filter(r => (FAC.filter === 'all' || (FAC.filter === 'pending') !== r.approved) && (!q || (r.name + ' ' + r.usn + ' ' + r.process + ' ' + r.processName).toLowerCase().includes(q)));
    const pend = rows.filter(r => !r.approved), appr = rows.filter(r => r.approved);
    $('#ftable').innerHTML = `<div class="toolbar"><label for="ffil" class="muted" style="font-size:.85rem">Show</label><select id="ffil" style="width:auto">${[['pending', 'Pending'], ['approved', 'Approved'], ['all', 'All']].map(([v, l]) => `<option value="${v}"${FAC.filter === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label for="fq" class="muted" style="font-size:.85rem">Search</label><input id="fq" type="text" style="width:220px" value="${esc(FAC.q)}" placeholder="Name, USN or experiment">
      ${pend.length ? `<button class="btn small" type="button" id="fapall">${FAC.arm ? `Confirm: approve ${pend.length}` : `Approve all ${pend.length} shown`}</button>` : ''}${appr.length ? `<button class="btn quiet small" type="button" id="fdlall">Download ${appr.length} certificate${appr.length > 1 ? 's' : ''} (one PDF)</button>` : ''}<button class="btn quiet small" type="button" id="frel">Refresh</button></div>
      ${LAB.tableHTML({ cols: ['Requested', 'Name', 'USN', 'Experiment', 'Post-test', 'Status', ''], textCols: [0, 1, 2, 3, 4, 5, 6], rows: rows.length ? rows.map(r => [esc(r.requested), esc(r.name), `<span class="mono">${esc(r.usn)}</span>`, esc(r.processName || r.process), esc(r.postScore), r.approved ? `<span class="ok">Approved ${esc(r.approvedOn)}</span>` : '<span class="muted">Pending</span>',
        `<span class="controls">${r.approved ? `<button class="btn quiet small" data-dl="${esc(r.certId)}" type="button">PDF</button><button class="btn quiet small" data-ln="${esc(r.certId)}" type="button">Copy link</button><button class="btn quiet small" data-rv="${esc(r.certId)}" type="button">Revoke</button>` : `<button class="btn small" data-ap="${esc(r.certId)}" type="button">Approve</button><button class="btn quiet small" data-pv="${esc(r.certId)}" type="button">Preview</button><button class="btn quiet small" data-dr="${esc(r.certId)}" type="button">Draft PDF</button>`}</span>`]) : [['<span class="muted">Nothing to show.</span>', '', '', '', '', '', '']] })}<div id="fprev"></div>`;
    $('#ffil').onchange = ev => { FAC.filter = ev.target.value; FAC.arm = false; facTable(); };
    $('#fq').oninput = ev => { FAC.q = ev.target.value; FAC.arm = false; const p = ev.target.selectionStart; facTable(); const i = $('#fq'); i.focus(); i.setSelectionRange(p, p); };
    $('#frel').onclick = () => facLoad();
    const aa = $('#fapall'); if (aa) aa.onclick = () => { if (!FAC.arm) { FAC.arm = true; facTable(); return; } FAC.arm = false; facSet('approve', pend.map(r => r.certId)); };
    const da = $('#fdlall'); if (da) da.onclick = async () => { da.disabled = true; da.textContent = 'Preparing…'; try { await certPDF(appr, `Certificates-${new Date().toISOString().slice(0, 10)}.pdf`); } catch (e) { $('#fmsg').textContent = 'Could not make the PDF.'; } facTable(); };
    const T = $('#ftable'), row = id => FAC.rows.find(x => x.certId === id);
    T.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => facSet('approve', [b.dataset.ap]));
    T.querySelectorAll('[data-ln]').forEach(b => b.onclick = () => { const u = CERT.site + '#verify-' + b.dataset.ln; const ok = () => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy link', 1500); };
      try { navigator.clipboard.writeText(u).then(ok, () => { $('#fmsg').textContent = u; }); } catch (e) { $('#fmsg').textContent = u; } });
    T.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => facSet('revoke', [b.dataset.rv]));
    T.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => { const r = row(b.dataset.dl); try { await certPDF([r], certFile(r, 'pdf')); } catch (e) { certPNG(r); } });
    T.querySelectorAll('[data-dr]').forEach(b => b.onclick = async () => { const r = row(b.dataset.dr); await certPDF([{ ...r, approvedOn: '(pending approval)', draft: true }], certFile(r, 'pdf').replace('Certificate-', 'DRAFT-Certificate-')); });
    T.querySelectorAll('[data-pv]').forEach(b => b.onclick = async () => { const r = row(b.dataset.pv); $('#fprev').innerHTML = `<h3 style="margin:16px 0 8px">Preview: ${esc(r.name)}</h3><canvas class="certprev" id="fpcv" role="img" aria-label="Certificate preview"></canvas>`; await ready(); drawCert($('#fpcv'), { ...r, approvedOn: '(pending approval)', draft: true }); $('#fprev').scrollIntoView({ block: 'nearest' }); });
  }
  async function facSet(action, ids) {
    const m = $('#fmsg'); m.textContent = action === 'approve' ? 'Approving…' : 'Revoking…';
    try { const r = await certPost({ action, key: FAC.key, certIds: ids }); if (!r.ok) { m.innerHTML = '<span class="bad">' + esc(r.error) + '</span>'; return; } await facLoad(); }
    catch (e) { m.innerHTML = '<span class="bad">Could not reach the Google Sheet.</span>'; }
  }

  /* ---------- faculty: submissions, full reports, issuing without a request ---------- */
  async function subsLoad() {
    const m = $('#fmsg');
    try {
      const r = await certPost({ action: 'subs', key: FAC.key });
      if (!r.ok) { m.innerHTML = r.error === 'faculty key' ? '<span class="bad">Faculty key not accepted.</span> Check the FACULTY_KEY script property.' : '<span class="bad">' + esc(r.error) + '</span> (Update Code.gs to the latest version and deploy a new version.)'; $('#ftable').innerHTML = ''; return; }
      FAC.subs = r.rows.sort((a, b) => String(a.usn).localeCompare(String(b.usn)) || String(a.process).localeCompare(String(b.process)));
      m.textContent = `${r.rows.length} submission${r.rows.length === 1 ? '' : 's'} (latest per student and experiment) · ${r.rows.filter(x => x.hasReport).length} with full report`; subsTable();
    } catch (e) { m.innerHTML = '<span class="bad">Could not reach the Google Sheet.</span>'; }
  }
  const expOf = code => LAB.list.find(e => procOf(e) === String(code).toUpperCase());
  function subsTable() {
    const q = FAC.sq.toLowerCase();
    const rows = FAC.subs.filter(r => (FAC.sfil === 'all' || (FAC.sfil === 'nocert' && r.cert === 'none') || (FAC.sfil === 'report' && r.hasReport)) && (!q || (r.name + ' ' + r.usn + ' ' + r.process + ' ' + r.experiment).toLowerCase().includes(q)));
    const withRep = rows.filter(r => r.hasReport);
    $('#ftable').innerHTML = `<div class="toolbar"><label for="sfil" class="muted" style="font-size:.85rem">Show</label><select id="sfil" style="width:auto">${[['all', 'All submissions'], ['nocert', 'Without certificate'], ['report', 'With full report']].map(([v, l]) => `<option value="${v}"${FAC.sfil === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label for="sq" class="muted" style="font-size:.85rem">Search</label><input id="sq" type="text" style="width:220px" value="${esc(FAC.sq)}" placeholder="Name, USN or experiment">
      ${withRep.length ? `<button class="btn quiet small" type="button" id="srepall">Download ${withRep.length} report${withRep.length > 1 ? 's' : ''} (one file)</button>` : ''}<button class="btn quiet small" type="button" id="srel">Refresh</button></div>
      ${LAB.tableHTML({ cols: ['Submitted', 'Name', 'USN', 'Experiment', 'Post-test', 'Report', 'Certificate'], textCols: [0, 1, 2, 3, 4, 5, 6], rows: rows.length ? rows.map((r, k) => [esc(r.received), esc(r.name), `<span class="mono">${esc(r.usn)}</span>`, esc(r.experiment || r.process), esc(r.post),
        r.hasReport ? `<button class="btn quiet small" data-rep="${k}" type="button">Download</button>` : '<span class="muted" title="Submitted before reports were stored, or not saved">Summary only</span>',
        r.cert === 'approved' ? '<span class="ok">Issued</span>' : r.cert === 'pending' ? `<button class="btn small" data-apc="${esc(r.certId)}" type="button">Approve request</button>` : `<button class="btn quiet small" data-iss="${k}" type="button">Issue certificate</button>`]) : [['<span class="muted">Nothing to show.</span>', '', '', '', '', '', '']] })}
      <p class="muted" style="font-size:.8rem">“Issue certificate” creates an approved certificate from the student’s submission, even if they never requested one. Then send them the link from Certificate requests (Copy link); they can download it on any computer.</p>`;
    $('#sfil').onchange = ev => { FAC.sfil = ev.target.value; subsTable(); };
    $('#sq').oninput = ev => { FAC.sq = ev.target.value; const p = ev.target.selectionStart; subsTable(); const i = $('#sq'); i.focus(); i.setSelectionRange(p, p); };
    $('#srel').onclick = () => subsLoad();
    const T = $('#ftable');
    T.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => { const r = rows[+b.dataset.rep]; b.disabled = true; b.textContent = '…';
      try { const x = await certPost({ action: 'report', key: FAC.key, reportId: r.reportId }); if (!x.ok) throw new Error(x.error); saveBlob(new Blob([x.html], { type: 'text/html' }), `${r.reportId}-${r.usn}.html`); b.textContent = 'Download'; }
      catch (e) { b.textContent = 'Failed'; $('#fmsg').textContent = 'Could not fetch that report: ' + (e.message || ''); } b.disabled = false; });
    T.querySelectorAll('[data-iss]').forEach(b => b.onclick = async () => { const r = rows[+b.dataset.iss]; const e = expOf(r.process); b.disabled = true; b.textContent = 'Issuing…';
      try { const x = await certPost({ action: 'issue', key: FAC.key, usn: r.usn, process: r.process, processName: e ? procName(e) : (r.experiment || r.process), std: e ? e.std.split(';')[0].trim() : '' }); if (!x.ok) throw new Error(x.error); await subsLoad(); }
      catch (er) { b.disabled = false; b.textContent = 'Issue certificate'; $('#fmsg').textContent = 'Could not issue: ' + (er.message || ''); } });
    T.querySelectorAll('[data-apc]').forEach(b => b.onclick = async () => { b.disabled = true; try { const x = await certPost({ action: 'approve', key: FAC.key, certIds: [b.dataset.apc] }); if (!x.ok) throw new Error(x.error); await subsLoad(); } catch (e) { b.disabled = false; $('#fmsg').textContent = 'Could not approve.'; } });
    const ra = $('#srepall'); if (ra) ra.onclick = async () => {
      ra.disabled = true; let css = '', parts = [], n = 0;
      for (const r of withRep) {
        ra.textContent = `Fetching ${++n} of ${withRep.length}…`;
        try { const x = await certPost({ action: 'report', key: FAC.key, reportId: r.reportId }); if (!x.ok) continue; const doc = new DOMParser().parseFromString(x.html, 'text/html');
          if (!css) { const st = doc.querySelector('style'); css = st ? st.textContent : ''; } const sh = doc.querySelector('.sheet'); parts.push(`<div class="rpage"><article class="sheet">${sh ? sh.innerHTML : doc.body.innerHTML}</article></div>`); } catch (e) { }
      }
      const html = `<!doctype html><html lang="en" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heat Transfer lab reports (${parts.length})</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"><style>${css}
.rpage{padding:24px;max-width:960px;margin:0 auto 32px}@media print{.rpage{break-after:page;padding:0;margin:0}}</style></head><body style="background:#fff">${parts.join('')}</body></html>`;
      saveBlob(new Blob([html], { type: 'text/html' }), `Heat-Transfer-lab-reports-${new Date().toISOString().slice(0, 10)}.html`); subsTable();
    };
  }

  /* ---------- public verification page (#verify-ID) ---------- */
  EXT.verify = async function (el, id) {
    document.title = 'Verify certificate — Heat Transfer Virtual Lab';
    el.innerHTML = `<section class="wrap" style="padding-block:28px 40px"><p class="eyebrow">Certificate verification</p><h1 style="margin-top:6px">${esc(id)}</h1><div class="panel" id="vres" style="margin-top:16px;max-width:640px"><p class="muted">Checking…</p></div></section>`;
    if (!url()) { $('#vres').innerHTML = '<p class="bad">Verification is not available on this copy of the lab.</p>'; return; }
    try {
      const r = await certGet({ action: 'verify', id }); const v = $('#vres'); if (!v) return;
      v.innerHTML = r.valid ? `<p class="ok" style="font-size:1.2rem;margin-bottom:8px"><b>✓ Valid certificate</b></p>${LAB.tableHTML({ cols: ['Field', 'Value'], textCols: [0, 1], rows: [['Name', esc(r.cert.name)], ['USN', esc(r.cert.usn)], ['Experiment', esc(r.cert.processName)], ['Post-test', esc(r.cert.postScore)], ['Approved', esc(r.cert.approvedOn)]] })}<p class="muted" style="font-size:.84rem">Issued by ${esc(CERT.fac)}, ${esc(CERT.dept)}, ${esc(CERT.inst)}.</p>${LAB.EMBED ? '' : '<div class="controls" style="margin-top:10px"><button class="btn" type="button" id="vpdf">Download certificate (PDF)</button><button class="btn quiet" type="button" id="vpng">Download image (PNG)</button><span class="muted" style="font-size:.8rem" id="vmsg" aria-live="polite"></span></div>'}`
        : `<p class="bad" style="font-size:1.2rem"><b>✗ Not a valid certificate</b></p><p class="muted" style="font-size:.86rem;margin-top:6px">${r.reason === 'not approved' ? 'This ID exists but has not been approved, or approval was withdrawn.' : 'No certificate with this ID was issued.'}</p>`;
      if (r.valid && $('#vpdf')) { $('#vpdf').onclick = async () => { $('#vmsg').textContent = 'Preparing PDF…'; try { await certPDF([r.cert], certFile(r.cert, 'pdf')); $('#vmsg').textContent = 'Downloaded.'; } catch (e) { $('#vmsg').textContent = 'Could not make the PDF; use the PNG button.'; } }; $('#vpng').onclick = () => certPNG(r.cert); }
    } catch (e) { $('#vres').innerHTML = '<p class="bad">Could not reach the verification service. Try again later.</p>'; }
  };
})();
