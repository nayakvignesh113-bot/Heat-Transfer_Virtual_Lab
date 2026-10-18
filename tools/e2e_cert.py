# Certificate flow against a mocked Apps Script endpoint: submit, request, approve, verify, faculty page.
import asyncio, json
from playwright.async_api import async_playwright
CERTS = {}
SUB = {}
ISSUED = []
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        async def cfg(route): await route.fulfill(content_type='application/javascript', body="window.HTL_CONFIG={submitUrl:'https://mock.test/exec'};")
        async def api(route):
            r = route.request
            if r.method == 'POST':
                d = json.loads(r.post_data)
                if d.get('type') == 'certreq':
                    CERTS['HTL-EXP01-ABC123'] = dict(certId='HTL-EXP01-ABC123', name=d['name'], usn=d['usn'], section=d['section'], process=d['process'], processName=d['processName'], std=d['std'], postScore=d['postScore'], approvedOn='13 Oct 2026', approved=False, requested='13 Oct 2026')
                    out = {'ok': True, 'certId': 'HTL-EXP01-ABC123', 'status': 'pending'}
                elif d.get('action') == 'subs':
                    out = {'ok': True, 'rows': [{'received': '17 Oct 2026', 'reportId': SUB.get('reportId'), 'process': SUB.get('process'), 'experiment': SUB.get('experiment'), 'name': SUB.get('name'), 'usn': SUB.get('usn'), 'post': '80 %', 'hasReport': bool(SUB.get('reportHtml')), 'cert': 'none', 'certId': ''}]}
                elif d.get('action') == 'report':
                    out = {'ok': True, 'html': SUB.get('reportHtml', '')}
                elif d.get('action') == 'issue':
                    ISSUED.append(d); out = {'ok': True, 'certId': 'HTL-EXP01-ISSUED'}
                elif d.get('type') == 'report':
                    SUB.update(d); out = {'ok': True}
                elif d.get('action') == 'approve':
                    for i in d['certIds']: CERTS[i]['approved'] = True
                    out = {'ok': True, 'changed': len(d['certIds'])}
                else: out = {'ok': True}
            else:
                q = r.url.split('?', 1)[1] if '?' in r.url else ''
                if 'action=status' in q: c = CERTS.get('HTL-EXP01-ABC123'); out = {'ok': True, 'status': 'approved' if c and c['approved'] else 'pending', 'cert': c}
                elif 'action=list' in q: out = {'ok': True, 'rows': list(CERTS.values())}
                elif 'action=verify' in q: c = CERTS.get('HTL-EXP01-ABC123'); out = {'ok': True, 'valid': bool(c and c['approved']), 'cert': c, 'reason': 'not approved'}
                else: out = {'ok': True}
            await route.fulfill(content_type='application/json', body=json.dumps(out), headers={'Access-Control-Allow-Origin': '*'})
        await pg.route('**/config.js*', cfg); await pg.route('https://mock.test/**', api)
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.evaluate("""(()=>{LAB.Store.set('student',{name:'Ananya Rao',usn:'4MT22ME017',section:'A',batch:'2',instructor:'Dr X',inst:'MITE'});LAB.Store.set('classCode','ME4A');
          const S=LAB.state('rod');S.ran=true;S.seed=424242;S.safetyAck=new Date().toISOString();S.pre={score:40,first:40};S.post={score:80,first:80};S.valid={attempts:1,first:9,last:9,total:10,done:true};
          S.feedback={q1:4,q2:5,q3:4,q4:4,q5:5,q6:5,time:'1–2 hours',device:'Laptop / desktop',helped:'set-up',t:new Date().toISOString(),sent:true};S.theorySeen=true;LAB.save('rod');})()""")
        await pg.evaluate("location.hash='rod-s-report'"); await pg.wait_for_timeout(700)
        print('req disabled before submit:', await pg.evaluate("document.querySelector('#certreq').disabled"))
        await pg.click('#rsub'); await pg.wait_for_timeout(500)
        print('req disabled after submit:', await pg.evaluate("document.querySelector('#certreq').disabled"))
        await pg.click('#certreq'); await pg.wait_for_timeout(500)
        print('msg:', await pg.evaluate("document.querySelector('#certmsg').textContent"))
        await pg.evaluate("location.hash='faculty'"); await pg.wait_for_timeout(300)
        await pg.fill('#fkey', 'secret'); await pg.click('#facf button[type=submit]'); await pg.wait_for_timeout(500)
        await pg.click('[data-pv]'); await pg.wait_for_timeout(800)
        await pg.screenshot(path='tools/shots/v2_faculty.png', full_page=True)
        await pg.click('[data-ap]'); await pg.wait_for_timeout(500)
        print('faculty:', await pg.evaluate("document.querySelector('#fmsg').textContent"))
        await pg.evaluate("location.hash='rod-s-report'"); await pg.wait_for_timeout(600)
        await pg.click('#certchk'); await pg.wait_for_timeout(1200)
        print('status:', await pg.evaluate("document.querySelector('#certmsg').textContent"), 'pdf btn', await pg.evaluate("!!document.querySelector('#certpdf')"))
        await pg.locator('#certcv').screenshot(path='tools/shots/v2_certificate.png')
        async with pg.expect_download() as dl: await pg.click('#certpdf')
        d = await dl.value; path = await d.path(); data = open(path, 'rb').read(); print('pdf', d.suggested_filename, len(data), data[:8])
        print('report saved:', SUB.get('process'), len(SUB.get('reportHtml', '')) // 1024, 'KB', 'logo in report:', 'class="rlogo"' in SUB.get('reportHtml', ''))
        await pg.evaluate("location.hash='faculty'"); await pg.wait_for_timeout(300)
        await pg.click('.factabs [data-v="subs"]'); await pg.wait_for_timeout(500)
        print('subs:', await pg.evaluate("document.querySelector('#fmsg').textContent"))
        await pg.screenshot(path='tools/shots/v21_faculty_subs.png', full_page=True)
        async with pg.expect_download() as dl2: await pg.click('[data-rep]')
        print('report download:', (await dl2.value).suggested_filename)
        async with pg.expect_download() as dl3: await pg.click('#srepall')
        print('bulk download:', (await dl3.value).suggested_filename)
        await pg.click('[data-iss]'); await pg.wait_for_timeout(500); print('issued:', ISSUED[0]['process'] if ISSUED else None, ISSUED[0].get('processName') if ISSUED else '')
        await pg.evaluate("location.hash='verify-HTL-EXP01-ABC123'"); await pg.wait_for_timeout(600)
        async with pg.expect_download() as dl4: await pg.click('#vpdf')
        print('verify-page pdf:', (await dl4.value).suggested_filename)
        print('verify:', (await pg.evaluate("document.querySelector('#vres').textContent"))[:80])
        print('errors:', errs)
        await b.close()
asyncio.run(main())
