// MARSBOUND - shared drawing helpers (flat, hand-built look, no images needed).
(function () {
  var MB = (window.MB = window.MB || {});
  var FONT = '"Trebuchet MS", Verdana, sans-serif';
  var MONO = '"Courier New", monospace';

  var C = (MB.C = {
    bg: 0x16100e, panel: 0x231916, panel2: 0x2e211c, line: 0x4a3429,
    rust: 0xc4552d, sand: 0xe6c9a3, amber: 0xf0b34a, teal: 0x58b3a6,
    red: 0xd8483b, green: 0x7fbf6a, blue: 0x5b8fd6, ink: 0x120d0b,
    text: '#ecd9bf', dim: '#a58d78', bad: '#ff8a76', good: '#9fd68b'
  });
  MB.FONT = FONT; MB.MONO = MONO;
  MB.RES_COLOR = { power: C.amber, water: C.blue, food: C.green, oxygen: C.teal, shield: C.rust };

  MB.txt = function (sc, x, y, str, size, color, opts) {
    var st = Object.assign({ fontFamily: FONT, fontSize: size + 'px', color: color || C.text }, opts || {});
    var t = sc.add.text(x, y, str, st);
    // Phaser 3.90's Canvas renderer draws the 2x text canvas unscaled (text appears double size), so only sharpen under WebGL.
    if (sc.sys.game.config.renderType !== Phaser.CANVAS) t.setResolution(2);
    return t;
  };

  MB.panel = function (sc, x, y, w, h, fill, stroke) {
    var r = sc.add.rectangle(x, y, w, h, fill == null ? C.panel : fill).setOrigin(0, 0);
    r.setStrokeStyle(2, stroke == null ? C.line : stroke);
    return r;
  };

  // Button: returns { box, label, setEnabled(b), setLabel(s) }
  MB.button = function (sc, x, y, w, h, label, cb, o) {
    o = o || {};
    var fill = o.fill == null ? C.rust : o.fill;
    var box = sc.add.rectangle(x, y, w, h, fill).setOrigin(0, 0).setStrokeStyle(2, 0x000000, 0.35);
    var t = MB.txt(sc, x + w / 2, y + h / 2, label, o.size || 22, o.color || '#fff4e4', { fontStyle: 'bold' }).setOrigin(0.5);
    var enabled = true;
    box.setInteractive({ useHandCursor: true });
    box.on('pointerover', function () { if (enabled) box.setFillStyle(o.hover == null ? 0xe0683b : o.hover); });
    box.on('pointerout', function () { box.setFillStyle(enabled ? fill : C.line); });
    box.on('pointerdown', function () { if (enabled && cb) cb(); });
    return {
      box: box, label: t,
      setEnabled: function (b) { enabled = b; box.setFillStyle(b ? fill : C.line); t.setAlpha(b ? 1 : 0.5); if (b) box.setInteractive({ useHandCursor: true }); },
      setLabel: function (s) { t.setText(s); },
      destroy: function () { box.destroy(); t.destroy(); }
    };
  };

  // Horizontal meter. Returns { set(v, text) }
  MB.meter = function (sc, x, y, w, h, color) {
    sc.add.rectangle(x, y, w, h, C.ink).setOrigin(0, 0).setStrokeStyle(1, C.line);
    var fill = sc.add.rectangle(x + 2, y + 2, 1, h - 4, color).setOrigin(0, 0);
    return {
      set: function (v, col) {
        v = Math.max(0, Math.min(100, v));
        fill.width = Math.max(1, (w - 4) * v / 100);
        fill.setFillStyle(col != null ? col : (v < 20 ? C.red : color));
      }
    };
  };

  // Mars backdrop: flat colour bands (illustrated look, no gradients).
  MB.backdrop = function (sc, dusty) {
    var W = 1280, H = 720, g = sc.add.graphics();
    var bands = dusty ? [0x3a2217, 0x45281a, 0x522f1d, 0x5f3720] : [0x1c1216, 0x241619, 0x2d1a1a, 0x381f1b, 0x442519];
    var bh = 380 / bands.length;
    bands.forEach(function (c, i) { g.fillStyle(c, 1); g.fillRect(0, i * bh, W, bh + 1); });
    g.fillStyle(0x6b3a22, 1);
    g.fillRect(0, 380, W, H - 380);
    g.fillStyle(0x7d4527, 1);
    g.fillRect(0, 380, W, 6);
    // far ridge
    g.fillStyle(0x59301d, 1);
    g.beginPath(); g.moveTo(0, 380);
    for (var x = 0; x <= W; x += 80) { g.lineTo(x, 380 - 20 - ((x * 37) % 47)); }
    g.lineTo(W, 380); g.closePath(); g.fillPath();
    // foreground dunes
    g.fillStyle(0x5c3220, 1);
    g.fillEllipse(260, 700, 900, 160); g.fillEllipse(1020, 720, 1000, 180);
    if (!dusty) { for (var i = 0; i < 40; i++) { g.fillStyle(0xf3dcc0, 0.25 + ((i * 13) % 5) / 10); g.fillRect((i * 193) % W, (i * 71) % 260, 2, 2); } }
    return g;
  };

  // Our own mascot: ROVA, a small six-wheeled rover with one big eye.
  MB.robot = function (sc, x, y, s) {
    s = s || 1;
    var c = sc.add.container(x, y);
    var g = sc.add.graphics();
    g.fillStyle(0x2b1c16, 1);
    [-34, 0, 34].forEach(function (wx) { g.fillCircle(wx, 34, 12); g.fillCircle(wx, 34, 5); });
    g.fillStyle(0xcfd2d6, 1); g.fillRoundedRect(-48, -8, 96, 36, 8);
    g.fillStyle(0xb7bbc1, 1); g.fillRect(-48, 14, 96, 6);
    g.fillStyle(0xc4552d, 1); g.fillRect(-36, -2, 22, 8);
    g.fillStyle(0xcfd2d6, 1); g.fillRect(-4, -34, 8, 28);
    g.fillRoundedRect(-26, -62, 52, 34, 10);
    g.fillStyle(0x16100e, 1); g.fillRoundedRect(-20, -56, 40, 22, 7);
    g.lineStyle(3, 0xcfd2d6, 1); g.beginPath(); g.moveTo(14, -62); g.lineTo(26, -80); g.strokePath();
    g.fillStyle(0xf0b34a, 1); g.fillCircle(27, -82, 4);
    var eye = sc.add.circle(0, -45, 8, 0x58b3a6);
    c.add([g, eye]);
    c.setScale(s);
    sc.time.addEvent({ delay: 2600, loop: true, callback: function () { sc.tweens.add({ targets: eye, scaleY: 0.1, duration: 90, yoyo: true }); } });
    sc.tweens.add({ targets: c, y: y - 4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return c;
  };

  // Speech bubble that follows ROVA. Returns { say(text) }
  MB.bubble = function (sc, x, y, w, h) {
    var box = sc.add.rectangle(x, y, w, h, 0xf1e2cb).setOrigin(0, 0).setStrokeStyle(3, 0x120d0b);
    var tail = sc.add.triangle(x, y + h / 2, 0, 0, 16, -10, 16, 10, 0xf1e2cb).setOrigin(1, 0.5);
    var t = MB.txt(sc, x + 14, y + 12, '', 21, '#2b1c16', { wordWrap: { width: w - 28 }, lineSpacing: 3 });
    return { say: function (s) { t.setText(s); }, box: box, tail: tail, text: t };
  };

  MB.ICON = function (sc, kind, x, y, size) {
    var g = sc.add.graphics(); var s = size || 20;
    g.setPosition(x, y);
    if (kind === 'dust') { g.fillStyle(0xd8a46a, 1); for (var i = 0; i < 6; i++) g.fillCircle(-s / 2 + i * s / 5, ((i % 2) * 6) - 3, 4 + (i % 3)); }
    else if (kind === 'cold') { g.lineStyle(3, 0x9fd0ff, 1); for (var a = 0; a < 3; a++) { var ang = a * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(ang) * s * 0.6, Math.sin(ang) * s * 0.6); g.lineTo(-Math.cos(ang) * s * 0.6, -Math.sin(ang) * s * 0.6); g.strokePath(); } }
    else if (kind === 'flare') { g.fillStyle(0xffd34d, 1); g.fillCircle(0, 0, s * 0.35); g.lineStyle(3, 0xffd34d, 1); for (var r = 0; r < 8; r++) { var an = r * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(an) * s * 0.5, Math.sin(an) * s * 0.5); g.lineTo(Math.cos(an) * s * 0.8, Math.sin(an) * s * 0.8); g.strokePath(); } }
    else if (kind === 'gust') { g.lineStyle(3, 0xcfe6d8, 1); for (var l = 0; l < 3; l++) { g.beginPath(); g.moveTo(-s * 0.7, -6 + l * 6); g.lineTo(s * 0.5 - l * 4, -6 + l * 6); g.strokePath(); } }
    else { g.fillStyle(0x7fbf6a, 1); g.fillCircle(0, 0, s * 0.45); }
    return g;
  };
  // Our astronaut: drawn from simple shapes so legs and arms can swing while walking.
  // Returns a container with .step(moving, timeMs) and .face(dir).
  MB.astronaut = function (sc, x, y, s) {
    s = s || 1;
    var c = sc.add.container(x, y);
    var shadow = sc.add.ellipse(0, 50, 60, 14, 0x000000, 0.3);
    function limb(px, py, w, h, col, boot) {
      var k = sc.add.container(px, py);
      k.add(sc.add.rectangle(0, h / 2, w, h, col).setStrokeStyle(2, 0x6b7078));
      if (boot) k.add(sc.add.rectangle(0, h, w + 4, 9, 0xe0702f).setStrokeStyle(2, 0x6b3a1c));
      return k;
    }
    var pack = sc.add.rectangle(-22, -6, 16, 38, 0xaab0b8).setStrokeStyle(2, 0x6b7078);
    var armB = limb(0, -14, 11, 28, 0xc9ced4, false);
    var legB = limb(-7, 20, 13, 28, 0xc9ced4, true);
    var legF = limb(8, 20, 13, 28, 0xf2f4f6, true);
    var g = sc.add.graphics();
    g.fillStyle(0xf2f4f6, 1); g.lineStyle(2, 0x6b7078, 1);
    g.fillRoundedRect(-17, -26, 34, 50, 9); g.strokeRoundedRect(-17, -26, 34, 50, 9);
    g.fillStyle(0xe0702f, 1); g.fillRect(-17, 6, 34, 7);
    g.fillStyle(0x58b3a6, 1); g.fillRoundedRect(-3, -16, 16, 12, 3);
    g.fillStyle(0xc4552d, 1); g.fillCircle(-8, -17, 4);
    var helmet = sc.add.circle(2, -42, 23, 0xf2f4f6).setStrokeStyle(2, 0x6b7078);
    var visor = sc.add.ellipse(9, -41, 25, 21, 0x1d3a5f).setStrokeStyle(2, 0x0d1d33);
    var shine = sc.add.ellipse(13, -46, 10, 5, 0x9fd0ff, 0.8);
    var armF = limb(0, -14, 11, 28, 0xf2f4f6, false);
    c.add([shadow, pack, armB, legB, legF, g, helmet, visor, shine, armF]);
    c.setScale(s);
    c._s = s; c._dir = 1;
    c.face = function (d) { if (d && d !== c._dir) { c._dir = d; c.scaleX = c._s * d; } };
    c.step = function (moving, t) {
      var sw = moving ? Math.sin(t / 95) * 0.7 : 0;
      legF.rotation = sw; legB.rotation = -sw; armF.rotation = -sw * 0.8; armB.rotation = sw * 0.8;
      var bob = moving ? Math.abs(Math.cos(t / 95)) * 3 : Math.sin(t / 500) * 1.2;
      g.y = helmet.y = visor.y = shine.y = pack.y = 0;
      helmet.y = -42 - bob; visor.y = -41 - bob; shine.y = -46 - bob;
    };
    return c;
  };

  // Tiny sound effects made with WebAudio (no files). Safe if audio is blocked or missing.
  MB.sfx = (function () {
    var ctx = null, muted = false;
    function ensure() {
      if (ctx) return ctx;
      try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); } catch (e) { ctx = null; }
      return ctx;
    }
    function tone(f, d, type, vol, to, delay) {
      if (muted) return;
      var a = ensure(); if (!a) return;
      try {
        if (a.state === 'suspended') a.resume();
        var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
        g.gain.setValueAtTime(vol || 0.07, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
      } catch (e) { /* audio is optional */ }
    }
    return {
      tone: tone,
      click: function () { tone(660, 0.06, 'square', 0.04); },
      talk: function () { tone(420 + Math.random() * 160, 0.05, 'triangle', 0.03); },
      good: function () { tone(523, 0.12, 'triangle', 0.07); tone(659, 0.12, 'triangle', 0.07, 0, 0.1); tone(784, 0.25, 'triangle', 0.07, 0, 0.2); },
      bad: function () { tone(220, 0.3, 'sawtooth', 0.05, 140); },
      alarm: function () { for (var i = 0; i < 4; i++) tone(i % 2 ? 620 : 880, 0.18, 'square', 0.05, 0, i * 0.22); },
      powerUp: function () { tone(180, 0.7, 'sawtooth', 0.05, 700); },
      isMuted: function () { return muted; },
      toggle: function () { muted = !muted; return muted; }
    };
  })();

  // Saved progress (browser storage may be blocked, so every access is guarded).
  MB.save = {
    key: 'marsbound.v1',
    get: function () { try { return JSON.parse(localStorage.getItem(MB.save.key)) || {}; } catch (e) { return {}; } },
    set: function (o) { try { localStorage.setItem(MB.save.key, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  };
})();
