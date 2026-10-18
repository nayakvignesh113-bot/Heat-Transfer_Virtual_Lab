# End-to-end run of every experiment through all eight stages in Chromium (Playwright).
# Usage: python3 -m http.server 8765 &  then  python3 tools/e2e.py [id,id] [page]
import asyncio, sys
from playwright.async_api import async_playwright
ids = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] else None
PAGE = sys.argv[2] if len(sys.argv) > 2 else 'index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and '404' not in m.text else None)
        await pg.goto(f'http://localhost:8765/{PAGE}')
        await pg.wait_for_timeout(600)
        await pg.evaluate("LAB.Store.set('student',{name:'Test Student',usn:'4MT23ME001',section:'A',batch:'1',instructor:'Dr X',inst:'MITE'})")
        all_ids = await pg.evaluate('LAB.list.map(e=>e.id)')
        for id in (ids or all_ids):
            errs.clear()
            await pg.evaluate(f"location.hash='{id}-s-pre'"); await pg.wait_for_timeout(250)
            await pg.evaluate("document.querySelectorAll('.q').forEach(q=>{const r=q.querySelectorAll('input');r[0].checked=true;r[0].dispatchEvent(new Event('change'))})")
            await pg.click('#submitq'); await pg.wait_for_timeout(100)
            await pg.evaluate("LAB.switchStage('theory')"); await pg.wait_for_timeout(200)
            th = await pg.evaluate("({listen:!!document.querySelector('#lsn'),xcard:!!document.querySelector('#xopen'),lib:!!document.querySelector('#libslot table'),val:!!document.querySelector('#valslot .vchip')})")
            await pg.click('#xopen'); await pg.wait_for_timeout(1500)
            if id in ('rod', 'fin', 'quench', 'boiling'): await pg.screenshot(path=f'tools/shots/v2_{id}_xpl.png')
            await pg.evaluate("LAB.switchStage('operate')"); await pg.wait_for_timeout(250)
            gate = await pg.evaluate("!!document.querySelector('#sack')")
            if gate:
                if id == 'rod': await pg.screenshot(path=f'tools/shots/v2_{id}_safety.png', full_page=True)
                await pg.check('#sack'); await pg.click('#sgo'); await pg.wait_for_timeout(250)
            await pg.evaluate("document.querySelector('#spd').value='4'")
            mode = await pg.evaluate("!!document.querySelector('.act')")
            alarms = 0
            if mode:
                n = await pg.evaluate("document.querySelectorAll('.act').length")
                # one deliberate wrong action first
                await pg.evaluate("(()=>{const b=[...document.querySelectorAll('.act')].find(x=>+x.dataset.i>0);b&&b.click()})()"); await pg.wait_for_timeout(150)
                alarms = await pg.evaluate("document.querySelector('#alarm').hidden?0:1")
                if id == 'rod': await pg.screenshot(path=f'tools/shots/v2_{id}_alarm.png')
                for k in range(n):
                    await pg.evaluate(f"document.querySelector('.act[data-i=\"{k}\"]').click()")
                    for w in range(40):
                        await pg.wait_for_timeout(150)
                        if await pg.evaluate(f"(document.querySelector('.act[data-i=\"{k}\"]')||{{}}).classList?.contains('ok')"): break
            await pg.click('#run')
            for k in range(80):
                await pg.wait_for_timeout(400)
                if await pg.evaluate("!!document.querySelector('#toexp')"): break
            await pg.screenshot(path=f'tools/shots/v2_{id}_op.png')
            await pg.click('#toexp'); await pg.wait_for_timeout(300)
            await pg.evaluate("""(()=>{const e=LAB.exps[location.hash.slice(1).split('-s-')[0]];const S=LAB.state(e.id);const sim=LAB.getSim(e,S);const p=LAB.paramsOf(e,S);e.calcs(sim,p).forEach(c=>{const el=document.querySelector('#c_'+c.key);if(!el)return;el.value=String(c.type==='select'?c.truth:+c.truth.toPrecision(6));el.dispatchEvent(new Event('input'))})})()""")
            await pg.click('#tovalid'); await pg.wait_for_timeout(250)
            await pg.click('#vcheck'); await pg.wait_for_timeout(250)
            res = await pg.evaluate("document.querySelector('.meter .big') ? document.querySelector('.meter .big').textContent : 'none'")
            await pg.evaluate("LAB.switchStage('num')"); await pg.wait_for_timeout(200)
            await pg.click('#nhint'); await pg.wait_for_timeout(100)
            await pg.evaluate("(()=>{const S=LAB.state(location.hash.slice(1).split('-s-')[0]);document.querySelector('#nans').value=String(S.num.cur.ans);})()")
            await pg.click('#nform button[type=submit]'); await pg.wait_for_timeout(200)
            if id == 'rod': await pg.screenshot(path=f'tools/shots/v2_{id}_num.png', full_page=True)
            num = await pg.evaluate("LAB.state(location.hash.slice(1).split('-s-')[0]).num.solved")
            await pg.evaluate("LAB.switchStage('post')"); await pg.wait_for_timeout(100)
            await pg.evaluate("document.querySelectorAll('.q').forEach(q=>{const r=q.querySelectorAll('input');r[1].checked=true;r[1].dispatchEvent(new Event('change'))})")
            await pg.click('#submitq'); await pg.wait_for_timeout(100)
            await pg.evaluate("LAB.switchStage('report')"); await pg.wait_for_timeout(500)
            locked = await pg.evaluate("document.querySelector('#rprint') ? document.querySelector('#rprint').disabled : 'embed'")
            for q in range(1, 7): await pg.check(f'input[name="fb-q{q}"][value="4"]', force=True)
            await pg.select_option('#fb-time', index=2); await pg.select_option('#fb-dev', index=3)
            await pg.fill('#fb-help', 'The interlock made me think about the order.')
            if id == 'rod': await pg.locator('#fbbox').screenshot(path=f'tools/shots/v2_{id}_fb.png')
            await pg.click('#fbsend'); await pg.wait_for_timeout(300)
            unlocked = await pg.evaluate("document.querySelector('#rprint') ? !document.querySelector('#rprint').disabled : 'embed'")
            await pg.screenshot(path=f'tools/shots/v2_{id}_rep.png', full_page=True)
            if id == 'rod':
                await pg.evaluate("[...document.querySelectorAll('#sheet h2')].find(h=>h.textContent.includes('Laboratory record')).scrollIntoView()"); await pg.wait_for_timeout(200)
                await pg.screenshot(path=f'tools/shots/v2_{id}_rec.png')
                await pg.evaluate("[...document.querySelectorAll('#sheet h2')].find(h=>h.textContent.includes('Assessment')).scrollIntoView()"); await pg.wait_for_timeout(200)
                await pg.screenshot(path=f'tools/shots/v2_{id}_ass.png')
            rec = await pg.evaluate("[...document.querySelectorAll('#sheet h2')].some(h=>h.textContent.includes('Laboratory record')) && !!document.querySelector('#sheet .wmark')")
            bar = await pg.evaluate("document.querySelectorAll('.stage-btn.done, .stage-btn[data-done=\"1\"]').length")
            print(id, th, 'gate', gate, 'diy', mode, 'alarm', alarms, 'valid', res, 'num', num, 'locked', locked, 'unlocked', unlocked, 'record', rec, '|', '; '.join(errs[:4]) or 'ok', flush=True)
        await b.close()
asyncio.run(main())
