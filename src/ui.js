// MARSBOUND - shared drawing helpers (flat, hand-built look, no images needed).
(function () {
  var MB = (window.MB = window.MB || {});
  var FONT = '"Trebuchet MS", Verdana, sans-serif';
  var MONO = '"Courier New", monospace';

  var C = (MB.C = {
    navy: 0x101D35, navy2: 0x1A2B4D, blue: 0x1769D2, blueHover: 0x2F86EE, bluePress: 0x0F4FA3,
    cyan: 0x31BDEB, white: 0xF4F7FC, muted: 0x9FB3D1, marsOrange: 0xE47743, red: 0xE5484D, green: 0x3DCB7B,
    line: 0x2E4A7A, ink: 0x0A1426,
    // legacy aliases -> design tokens (so old code restyles automatically)
    bg: 0x0A1426, panel: 0x101D35, panel2: 0x1A2B4D, rust: 0x1769D2, sand: 0xF4F7FC, amber: 0x31BDEB, teal: 0x31BDEB,
    text: '#F4F7FC', dim: '#9FB3D1', bad: '#FF8B8F', good: '#7FE3A9',
    tWhite: '#F4F7FC', tMuted: '#9FB3D1', tCyan: '#31BDEB', tRed: '#FF8B8F', tGreen: '#7FE3A9', tOrange: '#E47743', tNavy: '#101D35'
  });
  MB.ENV = {e4a1d18:0x4A1D18,ef0b34a:0xF0B34A,e68323c:0x68323C,e9a4d38:0x9A4D38,e5a3220:0x5A3220,e6b3b24:0x6B3B24,e7c4628:0x7C4628,e8e532c:0x8E532C,ea3622f:0xA3622F,eb8743a:0xB8743A,ec98642:0xC98642,e8c8279:0x8C8279,e4b2b2d:0x4B2B2D,e5d3328:0x5D3328,e6e3b24:0x6E3B24,e7b4529:0x7B4529,e8a5130:0x8A5130,e6a3a22:0x6A3A22,e8c5532:0x8C5532,e4a2819:0x4A2819,e5e3420:0x5E3420,e93593a:0x93593A,ee6c9a3:0xE6C9A3,ec4552d:0xC4552D,e5a3a22:0x5A3A22,ef0c030:0xF0C030,ec99358:0xC99358,ee0b27a:0xE0B27A,ea08a4a:0xA08A4A,ee0452f:0xE0452F,ea0573a:0xA0573A,ea9693a:0xA9693A,eb87a46:0xB87A46,e3b2214:0x3B2214,e9a5a28:0x9A5A28,eff6a55:0xFF6A55,ee0683b:0xE0683B,ed8a46a:0xD8A46A,e8a7a6c:0x8A7A6C,e4a3429:0x4A3429,e8a4f2c:0x8A4F2C,e4a2a1a:0x4A2A1A};
  MB.FONT = FONT; MB.MONO = MONO;
  MB.RES_COLOR = { power: C.cyan, water: C.cyan, food: C.cyan, oxygen: C.cyan, shield: C.cyan };

  MB.txt = function (sc, x, y, str, size, color, opts) {
    var st = Object.assign({ fontFamily: FONT, fontSize: size + 'px', color: color || C.text }, opts || {});
    var t = sc.add.text(x, y, str, st);
    // Phaser 3.90's Canvas renderer draws the 2x text canvas unscaled (text appears double size), so only sharpen under WebGL.
    if (sc.sys.game.config.renderType !== Phaser.CANVAS) t.setResolution(2);
    return t;
  };

  var R = 24; // card corner radius (buttons are pills)
  MB.RADIUS = R; MB.SP = { s: 8, m: 16, l: 24 };

  function rr(sc, x, y, w, h, fill, stroke, sw, alpha) {
    var g = sc.add.graphics();
    g.fillStyle(fill, alpha == null ? 1 : alpha); g.fillRoundedRect(0, 0, w, h, R);
    if (stroke != null) { g.lineStyle(sw || 2, stroke, 1); g.strokeRoundedRect(0, 0, w, h, R); }
    g.setPosition(x, y); return g;
  }
  MB.panel = function (sc, x, y, w, h, fill, stroke) {
    var g = sc.add.graphics(), rad = Math.min(24, h / 2), f = fill == null ? C.navy : fill, st = stroke == null ? C.line : stroke, sw = 3;
    function draw() {
      g.clear(); g.fillStyle(0x000000, 0.25); g.fillRoundedRect(0, 5, w, h, rad);
      g.fillStyle(f, 1); g.fillRoundedRect(0, 0, w, h, rad);
      if (st != null) { g.lineStyle(sw, st, 1); g.strokeRoundedRect(0, 0, w, h, rad); }
    }
    g.setPosition(x, y); g.pw = w; g.ph = h; draw();
    g.setStrokeStyle = function (a, c) { sw = a; st = c; draw(); return g; };
    g.setFillStyle = function (c) { f = c; draw(); return g; };
    g.setInteractive = function () { return Phaser.GameObjects.GameObject.prototype.setInteractive.call(g, new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains); };
    return g;
  };

  // Icons (shape-drawn, 24px grid, centred on x,y)
  MB.icon = function (sc, kind, x, y, size, color) {
    var g = sc.add.graphics(); var k = (size || 24) / 24; color = color == null ? C.white : color;
    g.setPosition(x, y); g.setScale(k);
    g.fillStyle(color, 1); g.lineStyle(3, color, 1);
    if (kind === 'power') { g.fillTriangle(2, -12, -8, 2, 0, 2); g.fillTriangle(0, 2, 8, -2, -2, 12); g.fillTriangle(-8, 2, 2, -12, 2, 2); }
    else if (kind === 'water') { g.fillCircle(0, 4, 8); g.fillTriangle(-7, 1, 7, 1, 0, -12); }
    else if (kind === 'food') { g.fillCircle(0, 3, 9); g.lineStyle(3, color, 1); g.beginPath(); g.moveTo(0, -6); g.lineTo(3, -12); g.strokePath(); }
    else if (kind === 'air') { g.lineStyle(3, color, 1); [-7, 0, 7].forEach(function (yy) { g.beginPath(); g.moveTo(-11, yy); g.lineTo(5, yy); g.strokePath(); g.strokeCircle(8, yy - 2, 3); }); }
    else if (kind === 'shield') { g.fillTriangle(-10, -10, 10, -10, 0, 12); g.fillRect(-10, -12, 20, 8); }
    else if (kind === 'sleep') { g.beginPath(); g.arc(0, 0, 10, 0.6, 5.7, false); g.strokePath(); g.fillCircle(6, -6, 3); }
    else if (kind === 'report') { g.strokeRect(-9, -11, 18, 22); g.fillRect(-5, -5, 10, 2); g.fillRect(-5, 0, 10, 2); g.fillRect(-5, 5, 6, 2); }
    else if (kind === 'sound') { g.fillRect(-10, -4, 6, 8); g.fillTriangle(-4, -4, 4, -11, 4, 11); g.fillTriangle(-4, 4, 4, 11, -4, -4); g.beginPath(); g.arc(4, 0, 8, -0.8, 0.8); g.strokePath(); }
    else if (kind === 'back') { g.fillTriangle(-10, 0, 2, -10, 2, 10); g.fillRect(2, -4, 9, 8); }
    else if (kind === 'star') { g.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 ? 5 : 12, an = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fillPath(); }
    else if (kind === 'lock') { g.fillRect(-9, -2, 18, 13); g.beginPath(); g.arc(0, -3, 6, Math.PI, 0); g.strokePath(); }
    else if (kind === 'play') { g.fillTriangle(-7, -10, -7, 10, 10, 0); }
    else if (kind === 'warn') { g.fillTriangle(0, -12, 11, 10, -11, 10); g.fillStyle(C.navy, 1); g.fillRect(-1.5, -4, 3, 8); g.fillRect(-1.5, 6, 3, 3); }
    else if (kind === 'check') { g.beginPath(); g.moveTo(-9, 0); g.lineTo(-3, 7); g.lineTo(10, -8); g.strokePath(); }
    else if (kind === 'book') { g.strokeRect(-11, -9, 22, 18); g.beginPath(); g.moveTo(0, -9); g.lineTo(0, 9); g.strokePath(); }
    else if (kind === 'user') { g.fillCircle(0, -5, 6); g.fillRoundedRect(-10, 3, 20, 9, 4); }
    else g.fillCircle(0, 0, 8);
    return g;
  };

  // Button kinds: primary | secondary | danger | ghost. Returns { box, label, setEnabled, setLabel, destroy }
  MB.button = function (sc, x, y, w, h, label, cb, o) {
    o = o || {};
    var kind = o.kind || (o.fill === C.navy2 ? 'secondary' : 'primary');
    var K = {
      primary: { f: C.blue, hv: C.blueHover, pr: C.bluePress, b: C.cyan, bw: 0, t: '#F4F7FC' },
      secondary: { f: C.navy2, hv: 0x25407A, pr: C.navy, b: C.cyan, bw: 2, t: '#F4F7FC' },
      danger: { f: C.red, hv: 0xF26267, pr: 0xB8343A, b: C.white, bw: 0, t: '#FFFFFF' },
      ghost: { f: C.navy, hv: C.navy2, pr: C.ink, b: C.line, bw: 1, t: '#9FB3D1' }
    }[kind];
    var pad = 16, R = Math.min(h / 2, 48);
    var g = sc.add.graphics();
    var cont = sc.add.container(x, y);
    var state = 'normal', enabled = true, focused = false;
    var ic = o.icon ? MB.icon(sc, o.icon, pad + 14, h / 2, Math.min(28, h * 0.4), K.t === '#FFFFFF' ? C.white : C.white) : null;
    var t = MB.txt(sc, w / 2 + (ic ? 14 : 0), h / 2, label, Math.max(o.size || 28, 22), K.t, { fontStyle: 'bold' }).setOrigin(0.5);
    var hit = sc.add.rectangle(0, 0, w, h, 0x000000, 0.001).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    cont.add([g]); if (ic) cont.add(ic); cont.add([t, hit]);
    function draw() {
      g.clear();
      var fill = !enabled ? 0x2A3550 : state === 'press' ? K.pr : state === 'hover' ? K.hv : K.f;
      var off = state === 'press' && enabled ? 3 : 0;
      if (enabled && state !== 'press') { g.fillStyle(0x000000, 0.35); g.fillRoundedRect(0, 4, w, h, R); }
      g.fillStyle(fill, 1); g.fillRoundedRect(0, off, w, h, R);
      if (K.bw && enabled) { g.lineStyle(K.bw, K.b, 1); g.strokeRoundedRect(0, off, w, h, R); }
      if (!enabled) { g.lineStyle(2, 0x4B5878, 1); g.strokeRoundedRect(0, 0, w, h, R); }
      if (focused && enabled) { g.lineStyle(4, C.cyan, 1); g.strokeRoundedRect(-4, -4, w + 8, h + 8, R + 3); }
      t.y = h / 2 + off; if (ic) ic.y = h / 2 + off;
    }
    draw();
    hit.on('pointerover', function () { if (enabled) { state = 'hover'; draw(); } });
    hit.on('pointerout', function () { state = 'normal'; draw(); });
    hit.on('pointerup', function (p) { if (enabled) { state = p && p.wasTouch ? 'normal' : 'hover'; draw(); } });   // touch has no hover: never leave it stuck highlighted
    hit.on('pointerdown', function () {
      if (!enabled) return;
      state = 'press'; draw(); MB.sfx.click();
      sc.time.delayedCall(90, function () { if (cont.active) { state = 'normal'; draw(); } });
      if (cb) cb();
    });
    var _sf = cont.setScrollFactor.bind(cont);
    cont.setScrollFactor = function (v) { _sf(v); hit.setScrollFactor(v); return cont; };
    cont.setInteractive = function (o) { if (enabled) hit.setInteractive(o); return cont; };
    cont.disableInteractive = function () { hit.disableInteractive(); return cont; };
    var api = {
      box: cont, label: t, hit: hit,
      setEnabled: function (b) {
        enabled = b; state = 'normal'; t.setColor(b ? K.t : '#7A8BAA'); t.setAlpha(1);
        if (b) { hit.setInteractive({ useHandCursor: true }); } else { hit.disableInteractive(); }
        draw();
      },
      setLabel: function (s) { t.setText(s); },
      setFocus: function (b) { focused = b; draw(); },
      setVisible: function (b) { cont.setVisible(b); return api; },
      destroy: function () { cont.destroy(); }
    };
    ['setScrollFactor', 'setDepth'].forEach(function (m) { api[m] = function (a) { cont[m](a); return api; }; });
    return api;
  };

  MB.chip = function (sc, x, y, text, kind, icon) {
    var col = kind === 'red' ? C.red : kind === 'green' ? C.green : C.cyan;
    var w = 28 + text.length * 14 + (icon ? 30 : 0), h = 40;
    var c = sc.add.container(x, y);
    var g = sc.add.graphics(); g.fillStyle(C.navy, 0.95); g.fillRoundedRect(0, 0, w, h, 20); g.lineStyle(2, col, 1); g.strokeRoundedRect(0, 0, w, h, 20);
    c.add(g);
    if (icon) c.add(MB.icon(sc, icon, 24, h / 2, 22, col));
    c.add(MB.txt(sc, icon ? 44 : 14, h / 2, text, 24, MB.C.text, { fontStyle: 'bold' }).setOrigin(0, 0.5));
    c.w = w; return c;
  };

  MB.toast = function (sc, text, kind) {
    var ch = MB.chip(sc, 640, 640, text, kind, kind === 'red' ? 'warn' : kind === 'green' ? 'check' : null);
    ch.x = 640 - ch.w / 2; ch.setScrollFactor(0).setDepth(3000);
    sc.tweens.add({ targets: ch, alpha: 0, y: 610, delay: 1800, duration: 500, onComplete: function () { ch.destroy(); } });
    return ch;
  };

  // Horizontal meter with optional icon. Colour never alone: low = red + warn icon.
  MB.meter = function (sc, x, y, w, h, color, icon) {
    var g = sc.add.graphics();
    var ic = icon ? MB.icon(sc, icon, x + 14, y + h / 2, 22, C.white) : null;
    var bx = x + (icon ? 34 : 0), bw = w - (icon ? 34 : 0);
    var warn = MB.icon(sc, 'warn', x + w + 14, y + h / 2, 20, C.red).setVisible(false);
    return {
      set: function (v, col) {
        v = Math.max(0, Math.min(100, v)); g.clear();
        g.fillStyle(C.ink, 1); g.fillRoundedRect(bx, y, bw, h, h / 2); g.lineStyle(1, C.line, 1); g.strokeRoundedRect(bx, y, bw, h, h / 2);
        var low = v < 20, c = col != null ? col : (low ? C.red : (color == null || color === C.cyan ? C.cyan : color));
        g.fillStyle(c, 1); g.fillRoundedRect(bx + 2, y + 2, Math.max(h - 4, (bw - 4) * v / 100), h - 4, (h - 4) / 2);
        warn.setVisible(low);
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

  // ROVA: the orange six-wheeled Mars rover with one big eye (the original mascot).
  // c.setMood('idle'|'talk'|'happy'|'warn'|'hint'), c.setTalking(bool)
  MB.robot = function (sc, x, y, s) {
    s = s || 1;
    var OR = C.marsOrange, ORD = 0xB8512A, ORL = 0xF29A66, OUT = C.ink;
    var c = sc.add.container(x, y);
    var glow = sc.add.circle(0, -20, 70, 0xFFC9A0, 0.0);
    var body = sc.add.graphics();
    // wheels (six-wheeled rover: three show from the side, a second row sits behind)
    body.fillStyle(0x070E1C, 1); [-34, 0, 34].forEach(function (wx) { body.fillCircle(wx + 6, 32, 11); });
    body.fillStyle(OUT, 1); [-34, 0, 34].forEach(function (wx) { body.fillCircle(wx, 34, 13); });
    body.fillStyle(C.muted, 1); [-34, 0, 34].forEach(function (wx) { body.fillCircle(wx, 34, 5); });
    // chassis
    body.fillStyle(OR, 1); body.fillRoundedRect(-50, -10, 100, 38, 10);
    body.fillStyle(ORD, 1); body.fillRect(-50, 16, 100, 8); body.fillStyle(ORL, 1); body.fillRect(-42, -6, 40, 6);
    body.lineStyle(3, OUT, 1); body.strokeRoundedRect(-50, -10, 100, 38, 10);
    body.fillStyle(C.white, 1); body.fillRect(18, 2, 22, 6);
    // mast + head
    body.fillStyle(ORD, 1); body.fillRect(-5, -34, 10, 26); body.lineStyle(2, OUT, 1); body.strokeRect(-5, -34, 10, 26);
    body.fillStyle(OR, 1); body.fillRoundedRect(-34, -80, 68, 48, 14); body.lineStyle(3, OUT, 1); body.strokeRoundedRect(-34, -80, 68, 48, 14);
    body.fillStyle(ORL, 1); body.fillRoundedRect(-28, -76, 36, 6, 3);
    body.fillStyle(C.navy, 1); body.fillRoundedRect(-27, -72, 54, 36, 11);
    // antenna
    body.lineStyle(4, C.white, 1); body.beginPath(); body.moveTo(18, -80); body.lineTo(30, -102); body.strokePath();
    body.fillStyle(C.cyan, 1); body.fillCircle(31, -104, 5);
    var ring = sc.add.ellipse(0, -58, 30, 30, 0x000000, 0).setStrokeStyle(3, C.cyan, 0.9);
    var eye = sc.add.ellipse(0, -58, 22, 24, C.cyan);
    var glint = sc.add.circle(5, -63, 4, C.white, 0.95);
    var mouth = sc.add.graphics();
    var badge = sc.add.container(42, -88);
    var bg = sc.add.circle(0, 0, 14, C.navy).setStrokeStyle(2, C.cyan);
    var bt = MB.txt(sc, 0, 0, '?', 22, '#31BDEB', { fontStyle: 'bold' }).setOrigin(0.5);
    badge.add([bg, bt]); badge.setVisible(false);
    var spark = sc.add.graphics();
    c.add([glow, body, ring, eye, glint, mouth, spark, badge]);
    c.setScale(s);
    var mood = 'idle', talking = false, col = C.cyan;
    function paint() {
      col = mood === 'warn' ? C.red : C.cyan;
      eye.setFillStyle(col); ring.setStrokeStyle(3, col, 0.9);
      badge.setVisible(mood === 'hint'); glow.setFillStyle(0xFFC9A0, talking || mood === 'warn' ? 0.2 : 0);
      eye.scaleY = mood === 'happy' ? 0.55 : 1; eye.y = mood === 'happy' ? -56 : -58;
    }
    c.setMood = function (m) { mood = m; paint(); return c; };
    c.setTalking = function (b) { talking = b; paint(); return c; };
    var t0 = 0;
    c._tick = sc.time.addEvent({ delay: 90, loop: true, callback: function () {
      if (!c.active) return; t0 += 90;
      mouth.clear(); mouth.fillStyle(col, 1);
      if (talking) { for (var i = -2; i <= 2; i++) { var hh = 3 + Math.abs(Math.sin(t0 / 110 + i)) * 5; mouth.fillRect(i * 7 - 2, -40 - hh / 2, 4, hh); } glow.setScale(1 + Math.sin(t0 / 150) * 0.08); }
      else if (mood === 'happy') { mouth.lineStyle(3, col, 1); mouth.beginPath(); mouth.arc(0, -44, 6, 0.2, Math.PI - 0.2); mouth.strokePath(); }
      else if (mood === 'warn') { mouth.fillRect(-9, -41, 18, 3); glow.setScale(1 + Math.abs(Math.sin(t0 / 200)) * 0.2); }
      else { mouth.fillRect(-6, -41, 12, 2); }
      spark.clear();
      if (mood === 'happy') { spark.fillStyle(C.white, 1); [[-46, -70], [48, -60], [-44, -20]].forEach(function (pp, i) { var r = 2 + Math.abs(Math.sin(t0 / 140 + i)) * 3; spark.fillCircle(pp[0], pp[1], r); }); }
    } });
    sc.time.addEvent({ delay: 2600, loop: true, callback: function () { if (c.active && mood !== 'happy') sc.tweens.add({ targets: [eye, glint], scaleY: 0.1, duration: 90, yoyo: true }); } });
    sc.tweens.add({ targets: c, y: y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });   // little drive bounce
    paint();
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
  // Our astronaut: white suit, BLUE details, dark navy outline, rim light, shadow.
  // Returns container with .step(moving, t), .face(dir), .interact(), .celebrate()
  MB.astronaut = function (sc, x, y, s) {
    s = s || 1;
    var c = sc.add.container(x, y);
    var OUT = C.ink, SUIT = 0xF4F7FC, GREY = 0xC9D6EA;
    var shadow = sc.add.ellipse(0, 52, 70, 16, 0x000000, 0.4);
    function limb(px, py, w, h, col, boot) {
      var k = sc.add.container(px, py);
      k.add(sc.add.rectangle(0, h / 2, w, h, col).setStrokeStyle(3, OUT));
      if (boot) k.add(sc.add.rectangle(0, h, w + 4, 10, C.blue).setStrokeStyle(3, OUT));
      else k.add(sc.add.rectangle(0, h - 2, w + 2, 9, C.blue).setStrokeStyle(2, OUT));
      return k;
    }
    var pack = sc.add.rectangle(-23, -6, 18, 42, GREY).setStrokeStyle(3, OUT);
    var packBlue = sc.add.rectangle(-23, 6, 10, 8, C.blue);
    var armB = limb(0, -14, 12, 28, GREY, false);
    var legB = limb(-7, 20, 14, 28, GREY, true);
    var legF = limb(8, 20, 14, 28, SUIT, true);
    var g = sc.add.graphics();
    g.fillStyle(SUIT, 1); g.fillRoundedRect(-18, -26, 36, 50, 10);
    g.lineStyle(3, OUT, 1); g.strokeRoundedRect(-18, -26, 36, 50, 10);
    g.fillStyle(C.blue, 1); g.fillRect(-18, 8, 36, 6);
    g.fillStyle(C.navy2, 1); g.fillRoundedRect(-4, -18, 18, 14, 3); g.fillStyle(C.cyan, 1); g.fillCircle(0, -11, 2.5); g.fillCircle(8, -11, 2.5);
    g.fillStyle(C.red, 1); g.fillCircle(-10, -18, 3.5);
    g.lineStyle(2, C.cyan, 0.8); g.beginPath(); g.moveTo(16, -22); g.lineTo(16, 18); g.strokePath();
    var helmet = sc.add.circle(2, -44, 26, SUIT).setStrokeStyle(3, OUT);
    var visor = sc.add.ellipse(10, -43, 30, 25, 0x16306B).setStrokeStyle(3, OUT);
    var shine = sc.add.ellipse(15, -49, 12, 6, 0xBFE8FF, 0.9);
    var rim = sc.add.arc(2, -44, 26, -70, 20, false).setStrokeStyle(2, C.cyan, 0.8); rim.setFillStyle();
    var armF = limb(0, -14, 12, 28, SUIT, false);
    c.add([shadow, pack, packBlue, armB, legB, legF, g, helmet, visor, shine, armF]);
    c.setScale(s);
    c._s = s; c._dir = 1; c._pose = null;
    c.face = function (d) { if (d && d !== c._dir) { c._dir = d; c.scaleX = c._s * d; } };
    c.interact = function () { c._pose = 'reach'; sc.time.delayedCall(900, function () { c._pose = null; }); };
    c.celebrate = function () { c._pose = 'cheer'; sc.time.delayedCall(1800, function () { c._pose = null; }); };
    c.step = function (moving, t) {
      var sw = moving ? Math.sin(t / 95) * 0.7 : 0;
      legF.rotation = sw; legB.rotation = -sw; armF.rotation = -sw * 0.8; armB.rotation = sw * 0.8;
      if (c._pose === 'reach') { armF.rotation = -1.4 + Math.sin(t / 90) * 0.15; }
      if (c._pose === 'cheer') { armF.rotation = 2.8 + Math.sin(t / 80) * 0.3; armB.rotation = -2.8 - Math.sin(t / 80) * 0.3; }
      var bob = moving ? Math.abs(Math.cos(t / 95)) * 3 : Math.sin(t / 500) * 1.6;
      helmet.y = -44 - bob; visor.y = -43 - bob; shine.y = -49 - bob; rim.y = -44 - bob;
    };
    return c;
  };

  // Sound effects made with WebAudio (no audio files). Safe if audio is blocked or missing.
  // click/back/select (UI) | talk | good/done/star/win (success) | bad/warn/danger/alarm/lose (trouble)
  // powerUp/powerDown/dust/sleep/newDay (world) | step/rub/pipe/thud/ding (minigames)
  MB.sfx = (function () {
    var ctx = null, muted = false, master = null, nbuf = null, last = {};
    function ensure() {
      if (ctx) return ctx;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); }
      } catch (e) { ctx = null; }
      return ctx;
    }
    function ok(name, ms) { var n = Date.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; }
    function tone(f, d, type, vol, to, delay) {
      if (muted) return;
      var a = ensure(); if (!a) return;
      try {
        if (a.state === 'suspended') a.resume();
        var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
        g.gain.setValueAtTime(vol || 0.07, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.02);
      } catch (e) { /* audio is optional */ }
    }
    // filtered noise burst (wind, steps, sweeping); the filter glides from f0 to f1
    function noise(d, vol, f0, f1, delay) {
      if (muted) return;
      var a = ensure(); if (!a) return;
      try {
        if (a.state === 'suspended') a.resume();
        if (!nbuf) { nbuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); var ch = nbuf.getChannelData(0); for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
        var t0 = a.currentTime + (delay || 0), src = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
        src.buffer = nbuf; fl.type = 'bandpass'; fl.Q.value = 0.8; fl.frequency.setValueAtTime(f0, t0); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1 || f0), t0 + d);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + Math.min(0.05, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        src.connect(fl); fl.connect(g); g.connect(master); src.start(t0); src.stop(t0 + d + 0.02);
      } catch (e) { /* audio is optional */ }
    }
    function seq(notes, type, vol, step, len) { notes.forEach(function (f, i) { tone(f, len || 0.18, type || 'triangle', vol || 0.07, 0, i * (step || 0.1)); }); }
    return {
      tone: tone, noise: noise,
      // ---- buttons and menus
      click: function () { tone(760, 0.05, 'square', 0.035); tone(1040, 0.05, 'square', 0.025, 0, 0.035); },
      back: function () { tone(620, 0.06, 'square', 0.03, 420); },
      select: function () { tone(880, 0.07, 'sine', 0.05); },
      pop: function () { tone(520, 0.09, 'sine', 0.05, 920); },
      talk: function () { tone(420 + Math.random() * 160, 0.05, 'triangle', 0.03); },
      // ---- success
      good: function () { seq([523, 659, 784], 'triangle', 0.07, 0.1, 0.2); },
      done: function () { seq([523, 659, 784, 1047], 'triangle', 0.08, 0.09, 0.22); tone(2093, 0.4, 'sine', 0.03, 0, 0.36); },
      star: function (k) { tone(600 + (k || 0) * 160, 0.22, 'triangle', 0.08); tone(1200 + (k || 0) * 320, 0.3, 'sine', 0.03, 0, 0.05); },
      win: function () { seq([392, 523, 659, 784, 659, 784, 1047], 'triangle', 0.08, 0.13, 0.28); tone(1568, 0.7, 'sine', 0.04, 0, 0.95); },
      // ---- trouble
      bad: function () { tone(220, 0.3, 'sawtooth', 0.05, 140); },
      warn: function () { for (var i = 0; i < 3; i++) tone(880, 0.09, 'square', 0.04, 0, i * 0.15); },
      danger: function () { for (var i = 0; i < 3; i++) { tone(980, 0.13, 'sawtooth', 0.06, 640, i * 0.2); tone(640, 0.07, 'sawtooth', 0.05, 0, i * 0.2 + 0.13); } tone(90, 0.5, 'sine', 0.1, 50); },
      alarm: function () { for (var i = 0; i < 4; i++) tone(i % 2 ? 620 : 880, 0.18, 'square', 0.05, 0, i * 0.22); },
      lose: function () { seq([440, 392, 330, 262], 'sawtooth', 0.05, 0.22, 0.4); },
      // ---- world
      powerUp: function () { tone(180, 0.7, 'sawtooth', 0.05, 700); },
      powerDown: function () { tone(700, 0.9, 'sawtooth', 0.06, 70); noise(0.6, 0.03, 900, 120); },
      dust: function () { noise(1.8, 0.06, 250, 1800); noise(1.6, 0.04, 1500, 400, 0.4); },
      sleep: function () { seq([523, 440, 349, 262], 'sine', 0.06, 0.3, 0.7); },
      newDay: function () { seq([330, 392, 494, 659], 'triangle', 0.06, 0.16, 0.5); },
      step: function () { if (ok('step', 240)) noise(0.06, 0.025, 520, 260); },
      // ---- minigames
      rub: function () { if (ok('rub', 90)) noise(0.09, 0.035, 2200, 3200); },
      pipe: function () { tone(300, 0.08, 'square', 0.04, 180); tone(900, 0.05, 'triangle', 0.03, 0, 0.02); },
      thud: function () { tone(140, 0.2, 'sine', 0.12, 50); noise(0.1, 0.05, 400, 150); },
      ding: function (q) { tone(660 + (q || 0) * 520, 0.22, 'triangle', 0.07); },
      isMuted: function () { return muted; },
      toggle: function () { muted = !muted; if (!muted) { var a = ensure(); if (a) { var m = this; setTimeout(function () { m.select(); }, 20); } } return muted; }
    };
  })();

  // Saved progress (browser storage may be blocked, so every access is guarded).
  MB.save = {
    key: 'marsbound.v1',
    get: function () { try { return JSON.parse(localStorage.getItem(MB.save.key)) || {}; } catch (e) { return {}; } },
    set: function (o) { try { localStorage.setItem(MB.save.key, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  };
})();
