"""Plays Missions 2-10 via the real flow: dialogs are advanced by clicking, minigames are finished with finish(q)
(the minigame is ended with finish(q); the station button and return are real clicks. The minigame input itself is covered by browser_mission1/browser_freeplay)."""
import sys, os, glob
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mm'; os.makedirs(out, exist_ok=True)
errors, bad = [], 0
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox', '--allow-file-access-from-files'])
    page = b.new_page(viewport={'width': 1280, 'height': 720})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.goto('file://' + root + '/index.html?canvas'); page.wait_for_timeout(1500)
    ev = page.evaluate
    W = "game.scene.getScene('World')"
    for mid in ([int(x) for x in os.environ["ONLY"].split(",")] if os.environ.get("ONLY") else range(2, 11)):
        ev("(id) => { game.scene.getScenes(true).forEach(function (x) { game.scene.stop(x.sys.settings.key); }); var sc = { registry: game.registry, scene: game.scene }; sc.registry.set('mission', {id:id, step:'intro', seen:{}}); sc.registry.set('pos', {x:700,y:585}); sc.registry.set('greeted', null); sc.registry.set('lastAction', null); sc.registry.set('S', MB.sim.create('gale', 11+id, {mode:'junior'})); sc.scene.start('World'); }", mid)
        page.wait_for_timeout(800)
        ok = False
        for step in range(60):
            page.wait_for_timeout(350)
            if ev("() => game.scene.isActive('Complete')"): ok = True; break
            if ev("() => game.scene.isActive('World') && %s.dialogActive" % W):
                # pick first choice labelled correctly if a choice question is shown, else click NEXT
                ev("""() => { var sc = %s, d = sc.dlg; if (d.btns && d.btns.length) { var D = MB.MISSIONS[sc.M.id]; var okLabel = D.opts.filter(function(o){return o.ok;})[0].t; var hit = d.btns.filter(function(b){return b.label.text === okLabel;})[0] || d.btns[0]; hit.hit.emit('pointerdown'); } else sc.advance(); }""" % W)
            elif ev("() => game.scene.isActive('World')"):
                key = ev("() => { var sc = %s, M = sc.M; var D = MB.MISSIONS[M.id]; return M.crisisDone && M.predicted ? D.tasks[M.idx||0] : null; }" % W)
                if key:
                    # REAL path: stand at the station, the action button must appear, click it, play the minigame (finish(q) shortcut), come back
                    ev("(k) => { var sc = %s; sc.player.x = sc.stations[k].st.x; sc.target = null; }" % W, key)
                    for _ in range(12):  # a 'Next job' dialogue may still be open: close it like a player would
                        page.wait_for_timeout(450)
                        if not ev("() => %s.dialogActive" % W): break
                        ev("() => %s.advance()" % W)
                    page.wait_for_timeout(400)
                    shown = ev("() => %s.actBtn.box.visible" % W)
                    print(('PASS' if shown else 'FAIL') + ' mission %d: action button shows at the %s station' % (mid, key))
                    if not shown:
                        print('DEBUG', ev("() => { var sc = %s; return {step: sc.M.step, idx: sc.M.idx, near: sc.near && sc.near.key, lock: sc.lock, dlg: sc.dialogActive, px: sc.player.x, sx: sc.stations[%r].st.x}; }" % (W, key)))
                        bad += 1; break
                    bb = ev("() => { var b = %s.actBtn.box.getBounds(); return [b.centerX, b.centerY]; }" % W)
                    page.mouse.click(bb[0], bb[1])
                    try: page.wait_for_function("() => game.scene.isActive('Mini')", timeout=4000)
                    except Exception: print('FAIL mission %d: pressing the action button did not open the minigame' % mid); bad += 1; break
                    page.mouse.click(640, 448); page.wait_for_timeout(300)
                    ev("() => game.scene.getScene('Mini').finish(0.9)"); page.wait_for_timeout(400)
                    page.mouse.click(640, 467)
                    try: page.wait_for_function("() => game.scene.isActive('World')", timeout=4000)
                    except Exception: print('FAIL mission %d: could not return to base' % mid); bad += 1; break
        print(('PASS' if ok else 'FAIL') + ' mission %d completes' % mid)
        if not ok: bad += 1
        stars = ev("(id) => MB.save.get()['m'+id] || 0", mid)
        print(('PASS' if stars > 0 else 'FAIL') + ' mission %d saved stars=%s' % (mid, stars))
        if stars == 0: bad += 1
    print('CONSOLE/PAGE ERRORS:', errors[:3] if errors else 'none'); print('RESULT:', 'ALL PASSED' if not bad and not errors else 'FAILED')
