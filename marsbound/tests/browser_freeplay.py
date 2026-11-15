"""Free play + phone test with REAL pointer / touch input.
Usage: python3 tests/browser_freeplay.py [outdir]     (needs Playwright + Chromium)
Runs the same flow twice: desktop (mouse) and phone landscape (touch, via CDP touch events).
Flow: menu -> free play -> launch -> intro -> walk to a station -> minigame -> back -> lesson
      -> walk home -> sleep -> Recap -> next sol -> joystick. Also checks text fit and the Report screen."""
import sys, os
from playwright.sync_api import sync_playwright

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/freeplay'
os.makedirs(out, exist_ok=True)
errors, checks = [], []
W = "game.scene.getScene('World')"

def check(name, ok, extra=''):
    checks.append((name, bool(ok))); print(('PASS ' if ok else 'FAIL ') + name + (('  ' + str(extra)) if extra and not ok else ''))

FIT_JS = """(only0) => {
  var bad = [];
  game.scene.getScenes(true).forEach(function (sc) {
    sc.children.list.forEach(function (o) {
      if (o.type !== 'Text' || !o.visible || !o.text || o.alpha === 0) return;
      if (sc.sys.settings.key === 'World' && o.scrollFactorX !== 0) return;   // world labels scroll with the camera
      var b = o.getBounds();
      if (b.x < -1 || b.y < -1 || b.right > 1281 || b.bottom > 721) bad.push([sc.sys.settings.key, o.text.slice(0, 30), Math.round(b.x), Math.round(b.y), Math.round(b.right), Math.round(b.bottom)]);
    });
  });
  return bad;
}"""

def run(b, label, **ctx):
    touch = ctx.get('has_touch', False)
    vp = ctx['viewport']
    context = b.new_context(**ctx)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(label + ': ' + str(e)))
    page.on('console', lambda m: errors.append(label + ': ' + m.text) if m.type == 'error' else None)
    ev = page.evaluate
    cdp = context.new_cdp_session(page) if touch else None
    shot = lambda n: page.screenshot(path=os.path.join(out, label + '_' + n + '.png'))
    tag = lambda s: label + ': ' + s

    def to_client(x, y):  # game coords (1280x720) -> client coords, canvas is FIT-scaled and centred
        r = ev("() => { var r = game.canvas.getBoundingClientRect(); return [r.left, r.top, r.width]; }")
        s = r[2] / 1280.0
        return r[0] + x * s, r[1] + y * s
    def tap(x, y):
        cx, cy = to_client(x, y)
        if touch:
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': cx, 'y': cy, 'id': 1}]})
            page.wait_for_timeout(60)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            page.mouse.click(cx, cy)
        page.wait_for_timeout(150)
    def drag(x0, y0, x1, y1, hold_ms):
        a, c = to_client(x0, y0), to_client(x1, y1)
        if touch:
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': a[0], 'y': a[1], 'id': 1}]})
            for i in range(1, 6):
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': a[0] + (c[0] - a[0]) * i / 5, 'y': a[1] + (c[1] - a[1]) * i / 5, 'id': 1}]})
            page.wait_for_timeout(hold_ms)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        else:
            page.mouse.move(*a); page.mouse.down(); page.mouse.move(*c, steps=5); page.wait_for_timeout(hold_ms); page.mouse.up()
    def wait_for(js, t=60000): page.wait_for_function(js, timeout=t)
    def dismiss():
        for _ in range(40):
            if not ev("() => %s.dialogActive" % W): return
            tap(640, 170); page.wait_for_timeout(200)
    def station_xy(key):
        return ev("""() => { var sc = %s, z = sc.stations['%s'].zone; return [z.x - sc.cameras.main.scrollX, z.y]; }""" % (W, key))
    def walk_to(key):
        # Stations can be off-screen and the camera eases after a scene starts, so re-aim after every tap.
        # Tapping a station auto-opens its action on arrival, so "arrived" also means a minigame/dialogue opened.
        arrived = "() => (%s.near && %s.near.key === '%s' && %s.actBtn.box.visible) || game.scene.isActive('Mini') || %s.dialogActive" % (W, W, key, W, W)
        for _ in range(25):
            if ev(arrived): return
            page.wait_for_timeout(500)
            x, y = station_xy(key)
            if 120 < x < 1160: tap(x, y)
            else: tap(1200 if x > 0 else 380, 520)
            try: page.wait_for_function(arrived, timeout=20000)
            except Exception: pass
        try:
            wait_for(arrived, 30000)
        except Exception:
            print('DEBUG walk_to', key, ev("() => { var sc = %s; return {px: sc.player.x, sx: sc.cameras.main.scrollX, tgt: sc.target, auto: sc.autoStation, near: sc.near && sc.near.key, act: sc.actBtn.box.visible, dlg: sc.dialogActive, lock: sc.lock, scenes: game.scene.getScenes(true).map(function (x) { return x.sys.settings.key; }), xy: [sc.stations['%s'].zone.x] }; }" % (W, key)))
            shot('99_walk_fail'); raise

    def press_action():  # the big button, unless walking there already opened the action
        page.wait_for_timeout(800)
        if not (ev("() => game.scene.isActive('Mini')") or ev("() => %s.dialogActive" % W)): tap(1095, 648)

    # ---- menu -> free play -> launch
    page.goto('file://' + root + '/index.html?canvas'); page.wait_for_timeout(1000)
    shot('01_menu')
    check(tag('menu text fits the screen'), not ev(FIT_JS, True), ev(FIT_JS, True))
    tap(640, 406); wait_for("() => game.scene.isActive('Sites')", 5000); shot('02_sites')
    check(tag('free play site screen text fits'), not ev(FIT_JS, True), ev(FIT_JS, True))
    tap(640, 615); wait_for("() => game.scene.isActive('World')", 5000)
    wait_for("() => %s.dialogActive" % W, 5000); page.wait_for_timeout(1500); shot('03_intro')
    check(tag('intro dialogue text fits'), not ev(FIT_JS, True), ev(FIT_JS, True))
    dismiss()
    check(tag('free play started on sol 1, no mission'), ev("() => game.registry.get('S').sol") == 1 and ev("() => !game.registry.get('mission')"))

    # ---- station -> minigame -> back -> lesson
    walk_to('water'); shot('04_at_water')
    press_action(); wait_for("() => game.scene.isActive('Mini')", 5000)
    tap(640, 448); page.wait_for_timeout(400); shot('05_mini_play')
    check(tag('minigame screen text fits'), not ev(FIT_JS, True), ev(FIT_JS, True))
    ev("() => game.scene.getScene('Mini').finish(0.8)"); page.wait_for_timeout(400); shot('06_mini_result')
    tap(640, 467); wait_for("() => game.scene.isActive('World')", 5000)
    wait_for("() => %s.dialogActive" % W, 5000); page.wait_for_timeout(1500); shot('07_lesson')
    dismiss()
    check(tag('water repair recorded for the sol'), ev("() => game.registry.get('S').done.water") is True)
    check(tag('crew-hours were spent'), ev("() => game.registry.get('S').hoursUsed") > 0)

    # ---- joystick
    x0 = ev("() => %s.player.x" % W)
    drag(150, 590, 235, 590, 1200)
    check(tag('joystick moves the astronaut right'), ev("() => %s.player.x" % W) > x0 + 20, (x0, ev("() => %s.player.x" % W)))
    page.wait_for_timeout(300)
    x1 = ev("() => %s.player.x" % W)
    check(tag('astronaut stops when the stick is released'), abs(ev("() => %s.player.x" % W) - x1) < 3)

    # ---- Report screen and back
    rb = ev("() => { var r = %s.reportBtn; return r ? [r.x, r.y] : null; }" % W)
    tap(1200, 32)
    page.wait_for_timeout(600)
    if ev("() => game.scene.isActive('Plan')"):
        shot('08_report')
        check(tag('report screen text fits'), not ev(FIT_JS, True), ev(FIT_JS, True))
        back = ev("""() => { var sc = game.scene.getScene('Plan'), m = []; sc.children.list.forEach(function (o) { if (o.type === 'Text' && /back|close|base/i.test(o.text)) { var b = o.getBounds(); m.push([o.text, b.centerX, b.centerY]); } }); return m; }""")
        check(tag('report screen has a back button'), len(back) > 0, back)
        if back: tap(back[0][1], back[0][2]); wait_for("() => game.scene.isActive('World')", 5000)
    else:
        check(tag('report button opens the report screen'), False, 'Plan not active after tapping (1200,32)')

    # ---- sleep -> recap -> next sol
    walk_to('home')
    press_action(); wait_for("() => %s.dialogActive" % W, 5000); page.wait_for_timeout(1800); shot('09_sleep_confirm')
    check(tag('sleep confirm text fits'), not ev(FIT_JS, True), ev(FIT_JS, True))
    tap(895, 226)
    wait_for("() => game.scene.isActive('Recap')", 8000); page.wait_for_timeout(800); shot('10_recap')
    check(tag('recap text fits'), not ev(FIT_JS, True), ev(FIT_JS, True))
    check(tag('sol advanced after sleeping'), ev("() => game.registry.get('S').sol") == 2)
    tap(300, 652); wait_for("() => game.scene.isActive('World')", 8000)
    wait_for("() => %s.dialogActive" % W, 5000); page.wait_for_timeout(1000); dismiss()
    check(tag('new sol starts with fresh crew-hours'), ev("() => game.registry.get('S').hoursUsed") == 0 and not ev("() => game.registry.get('S').done.water"))
    shot('11_sol2')

    # ---- dialogue box: every ROVA line must fit the box and not run under the NEXT button
    res = ev("""() => {
      var sc = %s, D = MB.MISSION1, lines = [].concat(D.intro, D.alarm, D.restore, [D.solarArrive, D.tour.greenhouse, D.tour.water], Object.values(MB.LESSONS).map(function (l) { return 'Good try! The recycler got better by 40 points.'; }), Object.values(MB.LESSONS), [sc.S ? MB.sim.advice(sc.S) : '']),
          d = sc.dlg, bad = [], boxBottom = 76 + 190 - 10;
      lines.forEach(function (ln) {
        if (!ln) return;
        sc.say([ln]); sc.lineDone();
        var b = d.body.getBounds(), nb = d.next.box.getBounds();
        var runsUnderBtn = Phaser.Geom.Intersects.RectangleToRectangle(new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height), new Phaser.Geom.Rectangle(nb.x, nb.y, nb.width, nb.height));
        if (b.bottom > boxBottom || runsUnderBtn) bad.push([ln.slice(0, 40), Math.round(b.bottom), runsUnderBtn]);
        sc.closeDialog();
      });
      return [lines.length, bad];
    }""" % W)
    check(tag('all %d ROVA lines fit the dialogue box' % res[0]), not res[1], res[1])
    context.close()

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox', '--allow-file-access-from-files'])
    run(b, 'desktop', viewport={'width': 1280, 'height': 720})
    run(b, 'phone', viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True)
    b.close()

print('CONSOLE/PAGE ERRORS:', errors or 'none')
bad = [n for n, ok in checks if not ok]
print('RESULT:', 'ALL PASSED' if not bad and not errors else 'FAILED: %s' % bad)
sys.exit(1 if bad or errors else 0)
