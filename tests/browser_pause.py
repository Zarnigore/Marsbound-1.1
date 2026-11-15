"""Pause menu test with REAL mouse/keyboard: World (free play + mission) and a minigame.
Checks: world really freezes, taps cannot leak through, a key released while paused does not stick,
resume works, restart (with confirm) resets the run, main menu leaves the run."""
import sys, os
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/pause'; os.makedirs(out, exist_ok=True)
bad = 0; errors = []
def check(n, ok, x=''):
    global bad; print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  ' + str(x))); bad += (not ok)
W = "game.scene.getScene('World')"
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox', '--allow-file-access-from-files'])
    page = b.new_page(viewport={'width': 1280, 'height': 720}); ev = page.evaluate; page.set_default_timeout(10000)
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    shot = lambda n: page.screenshot(path=os.path.join(out, n + '.png'))
    page.goto('file://' + root + '/index.html?canvas'); page.wait_for_timeout(1000)
    paused = lambda k: ev("() => game.scene.isPaused('%s')" % k)
    active = lambda k: ev("() => game.scene.isActive('%s')" % k)
    px = lambda: ev("() => %s.player.x" % W)

    # ---------------- free play
    ev("""() => { MB.sim; var r = game.registry; r.set('mission', null); r.set('pos', {x: 700, y: 585}); r.set('greeted', null); r.set('lastAction', null);
      r.set('S', MB.sim.create('gale', undefined, {mode: 'junior'})); game.scene.start('World'); }""")
    page.wait_for_timeout(1200); ev("() => { %s.skipDialogs(); }" % W); page.wait_for_timeout(300)
    check('free play World running', active('World'))
    # hold Right, pause with the HUD button (1222+24, 124+24), release the key WHILE paused
    page.keyboard.down('ArrowRight'); page.wait_for_timeout(400)
    x0 = px(); check('walking right moves the astronaut', x0 > 720, x0)
    page.mouse.click(1246, 148); page.wait_for_timeout(400)
    check('pause button pauses World', paused('World') and active('Pause'))
    shot('freeplay_paused')
    x1 = px(); page.wait_for_timeout(600); x2 = px()
    check('world frozen while paused (held key ignored)', abs(x2 - x1) < 0.5, (x1, x2))
    page.keyboard.up('ArrowRight'); page.wait_for_timeout(100)
    page.mouse.click(300, 600); page.wait_for_timeout(200)
    check('tap under the overlay does not set a walk target', ev("() => %s.target" % W) is None)
    page.mouse.click(640, 302); page.wait_for_timeout(500)          # RESUME
    check('RESUME resumes World and closes Pause', (not paused('World')) and active('World') and not active('Pause'))
    x3 = px(); page.wait_for_timeout(700); x4 = px()
    check('no stuck key after resume (key released during pause)', abs(x4 - x3) < 0.5, (x3, x4))
    # ESC toggles
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    check('ESC pauses', paused('World') and active('Pause'))
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    check('ESC resumes', (not paused('World')) and not active('Pause'))
    # pause twice quickly never stacks
    page.keyboard.press('Escape'); page.keyboard.press('Escape'); page.keyboard.press('Escape'); page.wait_for_timeout(400)
    check('mashing ESC leaves a consistent state', (paused('World') == active('Pause')), (paused('World'), active('Pause')))
    if paused('World'): page.keyboard.press('Escape'); page.wait_for_timeout(300)
    # restart with confirm
    ev("() => { game.registry.get('S').sol = 5; }")
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    page.mouse.click(640, 400); page.wait_for_timeout(300)           # RESTART RUN -> confirm
    shot('freeplay_confirm')
    check('restart asks to confirm (nothing reset yet)', ev("() => game.registry.get('S').sol") == 5 and active('Pause'))
    page.mouse.click(640, 404); page.wait_for_timeout(1300)          # YES, RESTART  (y 360..444)
    check('restart: fresh run (sol 1), World active, Pause closed', ev("() => game.registry.get('S').sol") == 1 and active('World') and not active('Pause') and not paused('World'))
    check('restart: astronaut back at the start', abs(px() - 700) < 40, px())
    ev("() => { %s.skipDialogs(); }" % W)
    # NO, GO BACK in confirm
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    page.mouse.click(640, 492); page.wait_for_timeout(300); page.mouse.click(640, 500); page.wait_for_timeout(300)
    check('NO, GO BACK returns to the pause menu', active('Pause') and paused('World'))
    # main menu
    page.mouse.click(640, 492); page.wait_for_timeout(300)           # MAIN MENU -> confirm
    page.mouse.click(640, 404); page.wait_for_timeout(1000)          # YES, LEAVE
    check('main menu: Menu active, World and Pause stopped', active('Menu') and not active('World') and not paused('World') and not active('Pause'))
    shot('menu_after')

    # ---------------- mission
    print('step: mission start', flush=True)
    ev("() => MB.save.set({ m1: 3 })"); ev("() => { game.scene.start('Menu'); }"); page.wait_for_timeout(600)
    page.mouse.click(640, 263); page.wait_for_timeout(1500)
    print('step: after play click', flush=True)
    check('mission 2 running', active('World') and ev("() => game.registry.get('mission').id") == 2)
    ev("() => { %s.skipDialogs(); }" % W); page.wait_for_timeout(300)
    page.mouse.click(1178, 32); page.wait_for_timeout(400)           # mission pause button (1154+24, 8+24)
    check('mission pause button pauses', paused('World') and active('Pause'))
    shot('mission_paused')
    page.mouse.click(640, 400); page.wait_for_timeout(300); page.mouse.click(640, 404); page.wait_for_timeout(1500)
    check('mission restart: still mission 2, from the start', active('World') and ev("() => game.registry.get('mission').id") == 2 and ev("() => game.registry.get('mission').step") in ('intro', 'tour', 'alarm'), ev("() => game.registry.get('mission').step"))

    # ---------------- minigame
    ev("() => { %s.skipDialogs(); }" % W)
    ev("() => { game.registry.set('mission', null); game.registry.set('S', MB.sim.create('gale', 3, {mode:'junior'})); game.scene.stop('World'); game.scene.start('Mini', {key: 'power', ret: 'World'}); }")
    page.wait_for_timeout(800)
    page.mouse.click(640, 448); page.wait_for_timeout(500)           # GO!
    check('minigame running', ev("() => game.scene.getScene('Mini').running"))
    page.wait_for_timeout(500)
    page.mouse.click(1246, 88); page.wait_for_timeout(400)           # pause button (1222+24, 64+24)
    check('minigame pause button pauses Mini', paused('Mini') and active('Pause'))
    shot('mini_paused')
    t1 = ev("() => game.scene.getScene('Mini').playT"); page.wait_for_timeout(700); t2 = ev("() => game.scene.getScene('Mini').playT")
    check('minigame clock frozen while paused', abs(t2 - t1) < 0.01, (t1, t2))
    page.mouse.click(640, 302); page.wait_for_timeout(400)
    check('minigame resumes', (not paused('Mini')) and ev("() => game.scene.getScene('Mini').running"))
    page.wait_for_timeout(300); t3 = ev("() => game.scene.getScene('Mini').playT")
    check('minigame clock runs again', t3 > t2, (t2, t3))
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    page.mouse.click(640, 400); page.wait_for_timeout(300); page.mouse.click(640, 404); page.wait_for_timeout(1000)
    check('minigame restart: back at the how-to card', active('Mini') and not active('Pause') and not ev("() => game.scene.getScene('Mini').running") and ev("() => game.scene.getScene('Mini').playT") == 0)
    page.keyboard.press('Escape'); page.wait_for_timeout(300)
    page.mouse.click(640, 492); page.wait_for_timeout(300); page.mouse.click(640, 404); page.wait_for_timeout(1000)
    check('minigame -> main menu', active('Menu') and not active('Mini') and not active('Pause'))

    print('CONSOLE/PAGE ERRORS:', errors or 'none'); print('RESULT:', 'ALL PASSED' if not bad and not errors else 'FAILED')
