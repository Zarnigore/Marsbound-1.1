"""Plays Mission 1 start to finish with REAL mouse input and checks the result.
Usage: python3 tests/browser_mission1.py [outdir]    (needs Playwright + Chromium)"""
import sys, os, glob
from playwright.sync_api import sync_playwright

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/4addb987-55a1-5598-9cad-cdc618de8031/scratchpad/m1'
os.makedirs(out, exist_ok=True)
errors, checks = [], []

def chrome():
    for c in glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome'):
        if os.path.exists(c): return c
    return None

def check(name, ok):
    checks.append((name, bool(ok))); print(('PASS ' if ok else 'FAIL ') + name)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox', '--allow-file-access-from-files'])
    page = b.new_page(viewport={'width': 1280, 'height': 720})
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    ev = page.evaluate
    shot = lambda n: page.screenshot(path=os.path.join(out, n + '.png'))
    W = "game.scene.getScene('World')"

    def dismiss_dialogs():
        for _ in range(40):
            if not ev("() => %s.dialogActive" % W): return
            page.mouse.click(640, 170); page.wait_for_timeout(260)
    def station_xy(key):
        return ev("""() => { var sc = %s, z = sc.stations['%s'].zone; return [z.x - sc.cameras.main.scrollX, z.y]; }""" % (W, key))
    def wait_for(js, t=90000): page.wait_for_function(js, timeout=t)

    page.goto('file://' + root + '/index.html?canvas'); page.wait_for_timeout(1000)
    page.mouse.click(640, 263); page.wait_for_timeout(1200)
    check('world scene started', ev("() => game.scene.isActive('World')"))
    shot('01_intro_dialog')
    dismiss_dialogs()
    check('intro finished, objective is greenhouse', ev("() => %s.objKey" % W) == 'food')
    shot('02_objective')

    # keyboard movement works
    x0 = ev("() => %s.player.x" % W)
    page.keyboard.down('ArrowRight'); page.wait_for_timeout(1500); page.keyboard.up('ArrowRight')
    check('arrow keys move the astronaut', ev("() => %s.player.x" % W) > x0 + 5)

    # tap the greenhouse -> auto-walk -> ROVA explains
    x, y = station_xy('food'); page.mouse.click(x, y)
    wait_for("() => %s.dialogActive" % W); page.wait_for_timeout(1200)
    shot('03_greenhouse_talk')
    dismiss_dialogs()
    check('greenhouse visited', ev("() => %s.M.seen.greenhouse" % W))
    x, y = station_xy('water'); page.mouse.click(x, y)
    wait_for("() => %s.dialogActive" % W); dismiss_dialogs()
    check('water station visited', ev("() => %s.M.seen.water" % W))

    # dust storm
    wait_for("() => %s.dialogActive" % W, 90000); page.wait_for_timeout(1500)
    shot('04_storm_alarm')
    check('power is nearly gone', ev("() => %s.S.res.power" % W) < 10)
    dismiss_dialogs()
    check('step is toSolar', ev("() => %s.M.step" % W) == 'toSolar')
    page.wait_for_timeout(500); shot('05_run_to_solar')

    # run to the solar farm with the arrow keys (it is far to the left)
    page.keyboard.down('ArrowLeft')
    wait_for("() => %s.dialogActive" % W, 150000)
    page.keyboard.up('ArrowLeft')
    page.wait_for_timeout(800); dismiss_dialogs()
    page.wait_for_timeout(400); shot('06_at_solar')
    dust_before = ev("() => %s.S.cond.power" % W)
    check('CLEAN PANELS button visible', ev("() => %s.actBtn.box.visible" % W))
    page.mouse.click(1095, 648); page.wait_for_timeout(700)
    check('minigame scene started', ev("() => game.scene.isActive('Mini')"))
    shot('07_minigame_intro')
    page.mouse.click(640, 448); page.wait_for_timeout(400)
    gx, gy = 140 + (1000 - 8 * 104) / 2, 120 + 60
    done_js = "() => game.registry.get('S').lastQ.power != null"
    page.mouse.move(gx + 10, gy + 10); page.mouse.down()
    for sweep in range(6):  # wind re-dusts cells, so sweep until the game scores
        if ev(done_js): break
        for r in range(4):
            yy = gy + r * 92 + 46
            xs = range(0, 8 * 104, 20) if r % 2 == 0 else range(8 * 104, 0, -20)
            for dx in xs: page.mouse.move(gx + dx, yy)
    page.mouse.up()
    wait_for(done_js, 25000); page.wait_for_timeout(500)
    shot('08_minigame_result')
    check('minigame finished with a quality score', ev("() => game.registry.get('S').lastQ.power") > 0.5)
    page.mouse.click(640, 467); page.wait_for_timeout(1500)
    shot('09_lights_returning')
    wait_for("() => %s.dialogActive" % W, 15000); page.wait_for_timeout(1500)
    shot('10_lesson')
    check('panels are cleaner than before', ev("() => %s.S.cond.power" % W) > dust_before + 20)
    check('battery recharged', ev("() => %s.S.res.power" % W) > 30)
    dismiss_dialogs()
    wait_for("() => game.scene.isActive('Complete')", 10000); page.wait_for_timeout(2200)
    shot('11_complete')
    check('mission complete screen', ev("() => game.scene.isActive('Complete')"))
    check('stars saved', ev("() => (JSON.parse(localStorage.getItem('marsbound.v1')||'{}').m1||0)") >= 1)
    b.close()

print('CONSOLE/PAGE ERRORS:', errors or 'none')
bad = [n for n, ok in checks if not ok]
print('RESULT:', 'ALL PASSED' if not bad and not errors else 'FAILED: %s' % bad)
sys.exit(1 if bad or errors else 0)
