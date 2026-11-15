"""Menu: the player can choose any built mission from the campaign map, then press PLAY. Real mouse clicks."""
import sys, os
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/menu'; os.makedirs(out, exist_ok=True)
bad = 0; errors = []
def check(n, ok, x=''):
    global bad; print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  ' + str(x))); bad += (not ok)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox', '--allow-file-access-from-files'])
    page = b.new_page(viewport={'width': 1280, 'height': 720}); ev = page.evaluate
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('file://' + root + '/index.html?canvas'); page.wait_for_timeout(1000)
    ev("() => MB.save.set({ m1: 3 })"); ev("() => game.scene.start('Menu')"); page.wait_for_timeout(600)
    label = lambda: ev("() => { var t = game.scene.getScene('Menu').children.list.filter(function (c) { return c.type === 'Container' && c.list.some(function (x) { return x.text && /^PLAY MISSION/.test(x.text); }); })[0]; return t.list.filter(function (x) { return x.text; })[0].text; }")
    check('default is the next unplayed mission (2)', label() == 'PLAY MISSION 2', label())
    # circle centres: chapter i at x = 40 + i*400 + 40 + k*82, y = 470 + 84
    page.mouse.click(40 + 40 + 4 * 82 - 4 * 82 + 0, 554)           # mission 1 (chapter 1, k=0)
    page.wait_for_timeout(300); shot = os.path.join(out, 'menu_m1_selected.png'); page.screenshot(path=shot)
    check('tapping mission 1 selects it', label() == 'PLAY MISSION 1', label())
    page.mouse.click(40 + 40 + 2 * 82, 554)                         # mission 3
    page.wait_for_timeout(300); page.screenshot(path=os.path.join(out, 'menu_m3_selected.png'))
    check('tapping mission 3 selects it', label() == 'PLAY MISSION 3', label())
    page.mouse.click(640, 263); page.wait_for_timeout(1200)
    check('PLAY starts the selected mission', ev("() => game.scene.isActive('World') && game.registry.get('mission').id") == 3)
    print('CONSOLE/PAGE ERRORS:', errors or 'none'); print('RESULT:', 'ALL PASSED' if not bad and not errors else 'FAILED')
