// MARSBOUND - the explorable Mars base (2.5D side view).
// The astronaut walks between six stations. Each station is an activity (a minigame) that feeds
// the simulation in sim.js, and each station LOOKS different depending on the simulation state.
// Two modes share this scene:
//   mission  (registry 'mission' set)  -> guided Mission 1 (dust storm, clean the panels)
//   free play (registry 'mission' null) -> 30-sol survival, using the stations
(function () {
  var MB = (window.MB = window.MB || {});
  var C = MB.C, CFG = MB.CFG, sim = MB.sim, txt = MB.txt;
  var WW = 2800, H = 720, BASE = 490, BAND_TOP = 510, BAND_BOT = 655;

  // key = simulation key (power, water, food, life, shield) or 'home'
  var STATIONS = [
    { key: 'power', x: 260, name: 'Solar Farm', labelY: 318 },
    { key: 'home', x: 760, name: 'Habitat', labelY: 262 },
    { key: 'food', x: 1260, name: 'Greenhouse', labelY: 300 },
    { key: 'water', x: 1700, name: 'Water Station', labelY: 330 },
    { key: 'life', x: 2100, name: 'Air Machine', labelY: 305 },
    { key: 'shield', x: 2520, name: 'Radiation Shield', labelY: 345 }
  ];
  var NEAR = 150;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r0(v) { return Math.round(v); }
  function seeded(seed) { var a = seed; return function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  function byKey(k) { return STATIONS.filter(function (s) { return s.key === k; })[0]; }

  class WorldScene extends Phaser.Scene {
    constructor() { super('World'); }

    create() {
      var sc = this;
      this.S = this.registry.get('S');
      this.M = this.registry.get('mission') || null;
      this.w = this.S.weather[this.S.sol - 1];
      this.lock = false; this.dialogActive = false; this.hud = [];
      this.target = null; this.autoStation = null; this.near = null;
      this.idle = 0; this.storm = 0; this.t = 0; this.dripT = 0;
      this.joy = { active: false, id: null, bx: 150, by: 590, vx: 0, vy: 0 };
      this.objKey = null;

      this.buildSky();
      this.buildGround();
      this.stations = {};
      this.buildStaticStations();
      STATIONS.forEach(function (st) { sc.buildStation(st); });
      this.dyn = this.make.graphics({ x: 0, y: 0, add: false });
      this.dynRT = this.add.renderTexture(0, 300, WW, 230).setOrigin(0, 0).setDepth(11);
      this.leak = this.add.graphics().setDepth(11);

      // astronaut + ROVA
      var pos = this.registry.get('pos') || { x: 700, y: 585 };
      this.player = MB.astronaut(this, pos.x, pos.y, 0.95);
      var holder = this.add.container(pos.x - 90, pos.y - 40);
      holder.add(MB.robot(this, 0, 0, 0.55));
      this.rova = holder;

      this.cameras.main.setBounds(0, 0, WW, H);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 0);
      this.cameras.main.setDeadzone(80, 100);

      this.buildWeatherFx();
      this.buildHud();
      this.buildDialog();
      this.buildJoystick();
      this.buildInput();
      this.paint();
      this.setStorm(!this.M && this.w.ev === 'dust' ? clamp(this.w.tau / 2.4, 0.5, 1) : 0);

      this.cameras.main.fadeIn(350);
      this.events.once('shutdown', function () { sc.registry.set('pos', { x: sc.player.x, y: sc.player.y }); });
      this.startFlow();
    }

    // ------------------------------------------------------------------ SKY + GROUND
    // Draw once into a texture (cheap to render every frame, important on phones).
    bake(key, w, h, fn) {
      if (!this.textures.exists(key)) {
        var g = this.make.graphics({ x: 0, y: 0, add: false });
        fn.call(this, g); g.generateTexture(key, w, h); g.destroy();
      }
      return this.add.image(0, 0, key).setOrigin(0, 0);
    }

    buildSky() {
      var sc = this;
      var bands = [0x0a0918, 0x110e26, 0x1b1432, 0x2c1b36, 0x452636, 0x68323c, 0x9a4d38];
      var db = [0x5a3220, 0x6b3b24, 0x7c4628, 0x8e532c, 0xa3622f, 0xb8743a, 0xc98642];
      var bh = BASE / bands.length;
      this.bake('w_sky', 1280, H, function (g) {
        bands.forEach(function (c, i) { g.fillStyle(c, 1); g.fillRect(0, i * bh, 1280, bh + 2); });
      }).setScrollFactor(0).setDepth(-100);
      this.dustSky = this.bake('w_dustsky', 1280, H, function (g) {
        db.forEach(function (c, i) { g.fillStyle(c, 1); g.fillRect(0, i * bh, 1280, bh + 2); });
      }).setScrollFactor(0).setDepth(-99).setAlpha(0);
      this.stars = this.bake('w_stars', 1280, H, function (g) {
        var rnd = seeded(7);
        for (var i = 0; i < 90; i++) {
          var x = rnd() * 1280, y = rnd() * 300, r = rnd() < 0.15 ? 2 : 1;
          g.fillStyle(0xf3dcc0, 0.35 + rnd() * 0.6); g.fillCircle(x, y, r);
        }
      }).setScrollFactor(0).setDepth(-98);
      // Phobos (a Mars moon) and a small pale Sun (the Sun looks smaller from Mars)
      this.bake('w_moon', 80, 60, function (g) {
        g.fillStyle(0x8c8279, 1); g.fillEllipse(40, 30, 54, 42);
        g.fillStyle(0x6f665f, 1); g.fillCircle(30, 26, 7); g.fillCircle(52, 38, 5);
      }).setPosition(890, 80).setScrollFactor(0.05).setDepth(-97);
      this.sunG = this.bake('w_sun', 120, 120, function (g) {
        g.fillStyle(0xfff0d0, 0.18); g.fillCircle(60, 60, 46); g.fillStyle(0xfff6e0, 1); g.fillCircle(60, 60, 16);
      }).setPosition(240, 120).setScrollFactor(0.05).setDepth(-97);
      // far mountains + mid ridge (parallax)
      this.bake('w_far', 1900, H, function (g) {
        var rr = seeded(21), x2;
        g.fillStyle(0x4b2b2d, 1); g.beginPath(); g.moveTo(0, BASE);
        for (x2 = 0; x2 <= 1900; x2 += 90) g.lineTo(x2, 380 - rr() * 70);
        g.lineTo(1900, BASE); g.closePath(); g.fillPath();
      }).setScrollFactor(0.25).setDepth(-90);
      this.bake('w_mid', 2500, H, function (g) {
        var rm = seeded(33), x2;
        g.fillStyle(0x5d3328, 1); g.beginPath(); g.moveTo(0, BASE);
        for (x2 = 0; x2 <= 2500; x2 += 70) g.lineTo(x2, 430 - rm() * 40);
        g.lineTo(2500, BASE); g.closePath(); g.fillPath();
      }).setScrollFactor(0.55).setDepth(-85);
    }

    buildGround() {
      this.bake('w_ground', WW, H, function (g) {
        var rnd = seeded(5), i;
        g.fillStyle(0x6e3b24, 1); g.fillRect(0, 400, WW, H - 400);
        g.fillStyle(0x7b4529, 1); g.fillRect(0, BASE - 6, WW, H);
        g.fillStyle(0x8a5130, 1); g.fillRect(0, BASE - 6, WW, 5);
        for (i = 0; i < 70; i++) {
          var x = rnd() * WW, y = BASE + 10 + rnd() * 210, w = 30 + rnd() * 90;
          g.fillStyle(rnd() < 0.5 ? 0x6a3a22 : 0x8c5532, 0.55); g.fillEllipse(x, y, w, 8 + rnd() * 8);
        }
        for (i = 0; i < 60; i++) {
          var rx = rnd() * WW, ry = BASE + 8 + rnd() * 215, rs = 4 + rnd() * 10;
          g.fillStyle(0x4a2819, 1); g.fillEllipse(rx, ry, rs * 2, rs * 1.2);
          g.fillStyle(0x5e3420, 1); g.fillEllipse(rx - 1, ry - 2, rs * 1.4, rs * 0.7);
        }
        g.fillStyle(0x93593a, 0.55); g.fillRect(120, 596, WW - 240, 26);   // packed-sand path
      }).setDepth(-70);
    }

    // ------------------------------------------------------------------ STATIONS
    buildStaticStations() {
      this.bake('w_stations', WW, H, function (g) {
        var sc = this;
        STATIONS.forEach(function (st) {
          g.fillStyle(0x000000, 0.25); g.fillEllipse(st.x, BASE + 4, st.key === 'power' ? 440 : 360, 22);
          sc['draw_' + st.key](g, st.x);
        });
      }).setDepth(10);
      var lx = byKey('life').x;
      this.fan = this.add.graphics().setDepth(11); this.fan.setPosition(lx, BASE - 52);
      this.fan.fillStyle(0xe6c9a3, 1);
      for (var b = 0; b < 4; b++) { var a = b * Math.PI / 2; this.fan.fillEllipse(Math.cos(a) * 14, Math.sin(a) * 14, 28, 10); }
    }

    buildStation(st) {
      var sc = this, x = st.x;
      // name tag
      var tag = txt(this, x, st.labelY, st.name, 26, '#f6e8d2', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(13);
      var bg = this.add.rectangle(x, st.labelY, tag.width + 28, 40, 0x120d0b, 0.7).setDepth(12).setStrokeStyle(2, st.key === 'home' ? C.sand : (MB.RES_COLOR[st.key === 'life' ? 'oxygen' : st.key] || C.sand));
      // tap target
      var zone = this.add.zone(x, 400, 360, 190).setInteractive({ useHandCursor: true });
      zone.setData('station', st.key);
      // attention bubble ("!") above a station that needs help
      var bang = txt(this, x, st.labelY - 44, '!', 36, '#ff8a76', { fontStyle: 'bold' }).setOrigin(0.5).setDepth(13).setVisible(false);
      this.tweens.add({ targets: bang, y: bang.y - 8, duration: 500, yoyo: true, repeat: -1 });
      this.stations[st.key] = { st: st, tag: tag, bg: bg, zone: zone, bang: bang };
    }

    draw_home(g, x) {
      g.fillStyle(0xb9bec5, 1); g.fillRoundedRect(x + 110, BASE - 86, 160, 86, 8); g.lineStyle(3, 0x6b7078, 1); g.strokeRoundedRect(x + 110, BASE - 86, 160, 86, 8);
      g.fillStyle(0xdfe3e7, 1); g.beginPath(); g.arc(x, BASE, 150, Math.PI, Math.PI * 2, false); g.closePath(); g.fillPath();
      g.lineStyle(3, 0x8c929a, 1); g.beginPath(); g.arc(x, BASE, 150, Math.PI, Math.PI * 2, false); g.strokePath();
      [-105, -52, 0, 52, 105].forEach(function (dx) {
        g.lineStyle(2, 0xaab0b8, 1);
        g.lineBetween(x + dx, BASE, x + dx * 0.97, BASE - Math.sqrt(150 * 150 - dx * dx) * 0.98);
      });
      g.fillStyle(0xc4552d, 1); g.fillRect(x - 150, BASE - 22, 300, 10);
      g.fillStyle(0x3a4a5a, 1); g.fillRoundedRect(x - 32, BASE - 70, 64, 70, 6); g.lineStyle(3, 0x8c929a, 1); g.strokeRoundedRect(x - 32, BASE - 70, 64, 70, 6);
      g.lineStyle(4, 0x8c929a, 1); g.lineBetween(x - 90, BASE - 130, x - 90, BASE - 195);
      g.fillStyle(0xcfd2d6, 1); g.fillCircle(x - 90, BASE - 198, 12); g.fillStyle(0xc4552d, 1); g.fillCircle(x - 90, BASE - 198, 4);
    }
    draw_power(g, x) {
      [-150, 0, 150].forEach(function (dx) {
        var px = x + dx;
        g.fillStyle(0x6b7078, 1); g.fillRect(px - 5, BASE - 52, 10, 52); g.fillRect(px - 36, BASE - 8, 72, 8);
        g.fillStyle(0x24509a, 1); g.fillRect(px - 70, BASE - 140, 140, 90);
        g.lineStyle(2, 0xa9c4ee, 0.8); g.strokeRect(px - 70, BASE - 140, 140, 90);
        for (var i = 1; i < 4; i++) g.lineBetween(px - 70 + i * 35, BASE - 140, px - 70 + i * 35, BASE - 50);
        for (var j = 1; j < 3; j++) g.lineBetween(px - 70, BASE - 140 + j * 30, px + 70, BASE - 140 + j * 30);
        g.fillStyle(0x4f7fd0, 0.35); g.fillRect(px - 66, BASE - 136, 132, 14);
      });
    }
    draw_food(g, x) {
      g.fillStyle(0x6b7078, 1); g.fillRect(x - 165, BASE - 12, 330, 12);
      g.fillStyle(0x5a3a22, 1); g.fillRect(x - 145, BASE - 34, 290, 22);
      g.fillStyle(0xa8e6d6, 0.28); g.fillRect(x - 150, BASE - 140, 300, 128);
      g.fillStyle(0xa8e6d6, 0.28); g.fillPoints([{ x: x - 150, y: BASE - 140 }, { x: x - 105, y: BASE - 180 }, { x: x + 105, y: BASE - 180 }, { x: x + 150, y: BASE - 140 }], true);
      g.lineStyle(3, 0xdff7ef, 0.9);
      for (var i = 0; i <= 5; i++) g.lineBetween(x - 150 + i * 60, BASE - 12, x - 150 + i * 60, BASE - 140);
      g.lineBetween(x - 150, BASE - 140, x - 105, BASE - 180); g.lineBetween(x + 150, BASE - 140, x + 105, BASE - 180); g.lineBetween(x - 105, BASE - 180, x + 105, BASE - 180);
      g.strokeRect(x - 150, BASE - 140, 300, 128);
    }
    draw_water(g, x) {
      g.fillStyle(0xb9bec5, 1); g.fillRoundedRect(x + 5, BASE - 90, 150, 90, 8); g.lineStyle(3, 0x6b7078, 1); g.strokeRoundedRect(x + 5, BASE - 90, 150, 90, 8);
      g.lineStyle(3, 0x8c929a, 1); for (var i = 0; i < 4; i++) g.lineBetween(x + 20, BASE - 70 + i * 14, x + 90, BASE - 70 + i * 14);
      g.fillStyle(0x24509a, 1); g.fillCircle(x + 122, BASE - 52, 22); g.fillStyle(0xf2f4f6, 1); g.fillCircle(x + 122, BASE - 52, 17);
      g.fillStyle(0x3d6fb8, 1); g.fillRect(x - 150, BASE - 130, 110, 130);
      g.fillStyle(0x5b8fd6, 1); g.fillEllipse(x - 95, BASE - 130, 110, 24);
      g.lineStyle(3, 0x1f4380, 1); g.strokeRect(x - 150, BASE - 130, 110, 130);
      g.lineBetween(x - 150, BASE - 90, x - 40, BASE - 90); g.lineBetween(x - 150, BASE - 45, x - 40, BASE - 45);
    }
    draw_life(g, x) {
      g.fillStyle(0xcfd2d6, 1); g.fillRoundedRect(x - 75, BASE - 170, 150, 170, 10); g.lineStyle(3, 0x6b7078, 1); g.strokeRoundedRect(x - 75, BASE - 170, 150, 170, 10);
      g.fillStyle(0x24303c, 1); g.fillRoundedRect(x - 60, BASE - 156, 120, 54, 6);
      g.fillStyle(0x24303c, 1); g.fillCircle(x, BASE - 52, 34);
      g.lineStyle(3, 0x8c929a, 1); for (var i = 0; i < 3; i++) g.lineBetween(x + 80, BASE - 140 + i * 14, x + 120, BASE - 140 + i * 14);
      g.fillStyle(0xb9bec5, 1); g.fillRect(x + 75, BASE - 60, 60, 12);
    }
    draw_shield(g, x) {
      g.fillStyle(0xdfe3e7, 1); g.beginPath(); g.arc(x + 70, BASE, 85, Math.PI, Math.PI * 2, false); g.closePath(); g.fillPath();
      g.fillStyle(0x3a4a5a, 1); g.fillRoundedRect(x + 50, BASE - 48, 40, 48, 5);
      g.lineStyle(4, 0x8c929a, 1); g.lineBetween(x - 175, BASE, x - 175, BASE - 120);
      g.fillStyle(0xf0c030, 1); g.fillTriangle(x - 175, BASE - 175, x - 215, BASE - 108, x - 135, BASE - 108);
      g.lineStyle(3, 0x120d0b, 1); g.strokeTriangle(x - 175, BASE - 175, x - 215, BASE - 108, x - 135, BASE - 108);
      g.fillStyle(0x120d0b, 1); g.fillCircle(x - 175, BASE - 130, 6);
      for (var i = 0; i < 3; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / 3; g.fillStyle(0x120d0b, 1); g.slice(x - 175, BASE - 130, 22, a - 0.5, a + 0.5, false); g.fillPath(); }
    }

    // Everything that changes with the simulation is drawn here.
    paint() {
      var S = this.S, g = this.dyn, x, i, sc = this;
      g.clear();
      var lights = this.lightsOn();
      // habitat windows
      x = byKey('home').x;
      [[x - 98, BASE - 100, 16], [x, BASE - 126, 18], [x + 98, BASE - 100, 16]].forEach(function (w) {
        if (lights) { g.fillStyle(0xffe08a, 0.22); g.fillCircle(w[0], w[1], w[2] + 14); }
        g.fillStyle(lights ? 0xffe9a8 : 0x25303a, 1); g.fillCircle(w[0], w[1], w[2]);
        g.lineStyle(3, 0x8c929a, 1); g.strokeCircle(w[0], w[1], w[2]);
      });
      g.fillStyle(lights ? 0xffe9a8 : 0x25303a, 1); g.fillRect(x + 130, BASE - 64, 46, 26); g.fillRect(x + 200, BASE - 64, 46, 26);
      g.fillStyle(lights ? 0x7fe0a0 : 0x3a2a2a, 1); g.fillCircle(x, BASE - 78, 5);
      // solar dust blotches
      x = byKey('power').x;
      var dust = 1 - S.cond.power / 100;
      [-150, 0, 150].forEach(function (dx, pi) {
        var rnd = seeded(100 + pi * 17), px = x + dx;
        for (var k = 0; k < 26; k++) {
          var bx = px - 70 + rnd() * 112, by = BASE - 140 + rnd() * 72, th = rnd();
          if (th < dust) { g.fillStyle(0xc99358, 0.45 + 0.4 * (1 - th)); g.fillEllipse(bx + 14, by + 10, 34 + th * 16, 22 + th * 8); g.fillStyle(0xe0b27a, 0.35); g.fillEllipse(bx + 10, by + 7, 18, 10); }
        }
        if (dust < 0.25) { g.fillStyle(0xffffff, 0.5); g.fillTriangle(px + 40, BASE - 135, px + 62, BASE - 125, px + 44, BASE - 105); }
      });
      // greenhouse plants
      x = byKey('food').x;
      var gr = S.cond.food / 100;
      for (i = 0; i < 7; i++) {
        var px2 = x - 120 + i * 40, h = 14 + gr * 62 * (0.8 + (i % 3) * 0.1);
        var col = gr > 0.6 ? 0x7fbf6a : gr > 0.3 ? 0xb9c25a : 0xa08a4a;
        g.fillStyle(col, 1); g.fillRect(px2 - 3, BASE - 34 - h, 6, h);
        var n = 1 + Math.round(gr * 3);
        for (var l = 0; l < n; l++) { g.fillEllipse(px2 + (l % 2 ? 11 : -11), BASE - 34 - h * (0.35 + 0.2 * l), 20, 10); }
        if (gr > 0.55 && i % 2 === 0) { g.fillStyle(0xe0452f, 1); g.fillCircle(px2 + 6, BASE - 38 - h * 0.5, 5); g.fillStyle(col, 1); }
      }
      // water tank level + pipe
      x = byKey('water').x;
      var wl = S.res.water / 100, wc = S.cond.water / 100;
      g.fillStyle(0x7fc0ff, 0.85); g.fillRect(x - 147, BASE - 3 - 124 * wl, 104, 124 * wl);
      g.fillStyle(wc > 0.35 ? 0x58b3a6 : 0xa0573a, 1); g.fillRect(x - 40, BASE - 50, 50, 10);
      this.leaking = wc < 0.35;
      // life support: gauges + light
      x = byKey('life').x;
      var ox = S.res.oxygen / 100, lc = S.cond.life / 100;
      [[x - 28, ox, 0x58b3a6], [x + 28, lc, 0xf0b34a]].forEach(function (gg) {
        g.fillStyle(0xf2f4f6, 1); g.fillCircle(gg[0], BASE - 129, 20); g.lineStyle(2, 0x6b7078, 1); g.strokeCircle(gg[0], BASE - 129, 20);
        var a = Math.PI * (1 + gg[1]); g.lineStyle(4, gg[2], 1); g.lineBetween(gg[0], BASE - 129, gg[0] + Math.cos(a) * 16, BASE - 129 + Math.sin(a) * 16);
      });
      g.fillStyle(lc > 0.55 && lights ? 0x7fe0a0 : lc > 0.3 ? 0xf0b34a : 0xe0452f, 1); g.fillCircle(x, BASE - 90, 7);
      this.fanSpeed = lights ? 0.04 + lc * 0.12 : 0.004;
      // radiation wall: rows of soil bags
      x = byKey('shield').x;
      var rows = Math.ceil(S.cond.shield / 100 * 6);
      for (var r = 0; r < rows; r++) {
        for (var b = 0; b < 5; b++) {
          var bx2 = x - 150 + b * 44 + (r % 2 ? 22 : 0) - 10;
          g.fillStyle(r % 2 ? 0xa9693a : 0xb87a46, 1); g.fillRoundedRect(bx2, BASE - 24 * (r + 1), 42, 22, 6);
          g.lineStyle(2, 0x3b2214, 1); g.strokeRoundedRect(bx2, BASE - 24 * (r + 1), 42, 22, 6);
        }
      }
      // attention bubbles (free play only)
      var sceneRef = this;
      STATIONS.forEach(function (st) {
        var o = sceneRef.stations[st.key], need = false;
        if (!sceneRef.M && st.key !== 'home') need = S.cond[st.key] < 40;
        if (sceneRef.M && sceneRef.M.step === 'toSolar' && st.key === 'power') need = true;
        o.bang.setVisible(need);
      });
      this.dynRT.clear(); this.dynRT.draw(g, 0, -300);
      this.darkRect && this.darkRect.setAlpha(lights ? 0 : 0.4);
    }

    lightsOn() { return this.S.res.power > 12; }

    // ------------------------------------------------------------------ WEATHER FX
    buildWeatherFx() {
      var sc = this, gtx = this.make.graphics({ x: 0, y: 0, add: false });
      gtx.fillStyle(0xe0b27a, 1); gtx.fillCircle(4, 4, 4); gtx.generateTexture('dustpx', 8, 8); gtx.destroy();
      this.darkRect = this.add.rectangle(0, 0, 1280, H, 0x05030a, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(850).setAlpha(0);
      this.tint = this.add.rectangle(0, 0, 1280, H, 0x9a5a28, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(800);
      this.dustFx = this.add.particles(0, 0, 'dustpx', {
        x: -20, y: { min: 0, max: H }, speedX: { min: 520, max: 900 }, speedY: { min: -50, max: 50 },
        lifespan: 2400, scale: { start: 1, end: 2.4 }, alpha: { start: 0.5, end: 0 }, frequency: 30, quantity: 2, emitting: false
      });
      this.dustFx.setScrollFactor(0).setDepth(810);
      this.wind = 0;
    }

    // amount 0..1 of dust storm on screen
    setStorm(v) {
      this.storm = v;
      this.tint.setFillStyle(0x9a5a28, 0.42 * v);
      this.dustSky.setAlpha(v);
      this.stars.setAlpha(1 - v);
      this.sunG.setAlpha(1 - v * 0.9);
      if (v > 0.05) {
        this.dustFx.frequency = Math.round(120 / (v + 0.1)); this.dustFx.start();
      } else { this.dustFx.stop(); }
      // other event tints for free play
      if (!this.M && v === 0) {
        if (this.w.ev === 'cold') { this.tint.setFillStyle(0x5b8fd6, 0.16); }
        if (this.w.ev === 'flare') { this.tint.setFillStyle(0xffd34d, 0.12); }
      }
    }

    // ------------------------------------------------------------------ HUD
    keep(o, depth) { o.setScrollFactor(0).setDepth(depth || 1000); this.hud.push(o); return o; }

    buildHud() {
      var sc = this, S = this.S, M = this.M, i;
      this.keep(this.add.rectangle(0, 0, 1280, 64, 0x120d0b, 0.62).setOrigin(0, 0));
      this.keep(txt(this, 18, 16, M ? 'MISSION ' + M.id : 'Mars day ' + S.sol + ' / ' + CFG.sols, 24, '#f1e2cb', { fontStyle: 'bold' }));
      // meters
      var meters = [['power', 'Power', C.amber], ['water', 'Water', C.blue], ['food', 'Food', C.green], ['oxygen', 'Air', C.teal]];
      if (M) meters = meters.slice(0, 1);
      this.bars = {};
      meters.forEach(function (m, k) {
        var x = 250 + k * 165;
        sc.keep(txt(sc, x, 17, m[1], 20, '#ecd9bf', { fontStyle: 'bold' }));
        sc.keep(sc.add.rectangle(x + 72, 20, 90, 24, C.ink).setOrigin(0, 0).setStrokeStyle(2, C.line));
        var f = sc.keep(sc.add.rectangle(x + 74, 22, 86, 20, m[2]).setOrigin(0, 0), 1001);
        sc.bars[m[0]] = { fill: f, color: m[2] };
      });
      // forecast chips (free play)
      this.hoursG = null;
      if (!M) {
        sim.forecast(S).forEach(function (f, k) {
          var x = 920 + k * 62, info = MB.EVENT_INFO[f.ev || 'calm'];
          var chip = sc.keep(sc.add.rectangle(x, 8, 56, 48, C.panel2).setOrigin(0, 0).setStrokeStyle(2, f.ev ? C.amber : C.line));
          chip.setInteractive({ useHandCursor: true });
          chip.on('pointerdown', function () { sc.toast((k === 0 ? 'Today: ' : k === 1 ? 'Tomorrow: ' : 'In 2 days: ') + info.title + '. ' + (f.ev ? info.fact : 'Nothing special is expected.')); });
          var ic = MB.ICON(sc, f.ev || 'calm', x + 28, 26, 22); sc.keep(ic, 1001);
          sc.keep(txt(sc, x + 28, 40, k === 0 ? 'Now' : '+' + k, 15, C.dim).setOrigin(0.5, 0), 1001);
        });
        var rb = this.keep(this.add.rectangle(1130, 8, 140, 48, C.panel2).setOrigin(0, 0).setStrokeStyle(2, C.sand));
        rb.setInteractive({ useHandCursor: true });
        rb.on('pointerdown', function () { MB.sfx.click(); sc.scene.start('Plan'); });
        this.keep(txt(this, 1200, 32, 'REPORT', 22, '#f1e2cb', { fontStyle: 'bold' }).setOrigin(0.5), 1001);
        // crew time pips
        this.keep(this.add.rectangle(0, 64, 360, 40, 0x120d0b, 0.55).setOrigin(0, 0));
        this.keep(txt(this, 14, 72, 'Crew time', 20, '#ecd9bf', { fontStyle: 'bold' }));
        this.hoursG = this.keep(this.add.graphics(), 1001);
      }
      // sound button
      var snd = this.keep(this.add.rectangle(M ? 1210 : 1222, M ? 8 : 70, 48, 48, C.panel2).setOrigin(0, 0).setStrokeStyle(2, C.line));
      this.sndG = this.keep(this.add.graphics(), 1001);
      snd.setInteractive({ useHandCursor: true });
      snd.on('pointerdown', function () { MB.sfx.toggle(); sc.drawSnd(snd.x + 24, snd.y + 24); });
      this.sndBtn = snd; this.drawSnd(snd.x + 24, snd.y + 24);
      // objective pill
      this.objBg = this.keep(this.add.rectangle(640, 80, 560, 42, 0x120d0b, 0.8).setStrokeStyle(2, C.amber), 1000).setVisible(false);
      this.objTxt = this.keep(txt(this, 640, 80, '', 24, '#ffe0a8', { fontStyle: 'bold' }).setOrigin(0.5), 1001).setVisible(false);
      // arrow shown at screen edge when the target is off-screen
      this.edgeArrow = this.keep(this.add.triangle(0, 0, 0, 0, 36, 22, 0, 44, C.amber).setStrokeStyle(3, 0x120d0b), 1002).setVisible(false);
      this.edgeTxt = this.keep(txt(this, 0, 0, '', 18, '#ffe0a8', { fontStyle: 'bold' }).setOrigin(0.5), 1002).setVisible(false);
      // bobbing marker above the target station
      this.mark = this.add.triangle(0, 0, 0, 0, 40, 0, 20, 30, C.amber).setStrokeStyle(3, 0x120d0b).setDepth(14).setVisible(false);
      this.tweens.add({ targets: this.mark, scaleY: 0.75, duration: 400, yoyo: true, repeat: -1 });
      // action button
      var sc2 = this;
      this.actBtn = MB.button(this, 930, 600, 330, 96, '', function () { sc2.interact(); }, { size: 24 });
      this.actBtn.box.setScrollFactor(0).setDepth(1002); this.actBtn.label.setScrollFactor(0).setDepth(1003);
      this.actSub = this.keep(txt(this, 1095, 672, '', 16, '#ffe9cf').setOrigin(0.5), 1004);
      this.actBtn.label.setPosition(1095, 630);
      this.showAct(false);
      // toast bubble
      this.toastBg = this.keep(this.add.rectangle(640, 150, 900, 86, 0xf1e2cb).setStrokeStyle(3, 0x120d0b), 1050).setVisible(false);
      this.toastTxt = this.keep(txt(this, 640, 150, '', 22, '#2b1c16', { align: 'center', wordWrap: { width: 860 } }).setOrigin(0.5), 1051).setVisible(false);
      this.refreshHud();
    }

    drawSnd(cx, cy) {
      var g = this.sndG; g.clear();
      g.fillStyle(0xf1e2cb, 1); g.fillRect(cx - 12, cy - 5, 8, 10); g.fillTriangle(cx - 4, cy - 5, cx + 6, cy - 12, cx + 6, cy + 12); g.fillTriangle(cx - 4, cy + 5, cx - 4, cy - 5, cx + 6, cy + 12);
      if (MB.sfx.isMuted()) { g.lineStyle(4, 0xff6a55, 1); g.lineBetween(cx - 14, cy - 14, cx + 14, cy + 14); }
      else { g.lineStyle(3, 0xf1e2cb, 1); g.beginPath(); g.arc(cx + 6, cy, 10, -0.9, 0.9, false); g.strokePath(); }
    }

    refreshHud() {
      var S = this.S, sc = this;
      Object.keys(this.bars).forEach(function (k) {
        var v = clamp(S.res[k], 0, 100), b = sc.bars[k];
        b.fill.width = Math.max(2, 86 * v / 100); b.fill.setFillStyle(v < 20 ? C.red : b.color);
      });
      if (this.hoursG) {
        var g = this.hoursG; g.clear();
        for (var h = 0; h < S.hoursMax; h++) { g.fillStyle(h < sim.hoursLeft(S) ? C.sand : C.line, 1); g.fillRoundedRect(150 + h * 26, 74, 20, 20, 4); }
      }
    }

    setObjective(key, text) {
      this.objKey = key; this.idle = 0;
      var on = !!text;
      this.objBg.setVisible(on); this.objTxt.setVisible(on);
      if (on) { this.objTxt.setText(text); this.objBg.width = Math.max(300, this.objTxt.width + 50); }
      var st = key && byKey(key);
      this.objStation = st || null;
      this.mark.setVisible(!!st);
      if (st) this.mark.setPosition(st.x - 20, st.labelY - 70);
    }

    toast(msg, ms) {
      var sc = this;
      this.toastTxt.setText(msg); this.toastBg.setVisible(true); this.toastTxt.setVisible(true);
      this.toastBg.height = this.toastTxt.height + 36;
      if (this.toastTimer) this.toastTimer.remove();
      this.toastTimer = this.time.delayedCall(ms || 4500, function () { sc.toastBg.setVisible(false); sc.toastTxt.setVisible(false); });
    }

    // ------------------------------------------------------------------ DIALOG (ROVA talks)
    buildDialog() {
      var sc = this;
      var d = this.dlg = { objs: [], text: '', full: '', typing: false, lines: [], i: 0, cb: null, choices: null, ev: null };
      var bg = this.keep(this.add.rectangle(30, 76, 1220, 190, 0x1c1411, 0.94).setOrigin(0, 0).setStrokeStyle(4, C.amber), 1100);
      bg.setInteractive();
      bg.on('pointerdown', function () { sc.advance(); });
      var face = this.add.circle(135, 171, 76, 0x2e211c).setScrollFactor(0).setDepth(1101).setStrokeStyle(3, C.line);
      var rob = MB.robot(this, 135, 196, 1.05); rob.setScrollFactor(0).setDepth(1102);
      var name = this.keep(txt(this, 250, 90, 'ROVA', 22, '#f0b34a', { fontStyle: 'bold' }), 1102);
      var body = this.keep(txt(this, 250, 120, '', 25, '#f6e8d2', { wordWrap: { width: 840 }, lineSpacing: 4 }), 1102);
      var next = MB.button(this, 1100, 196, 130, 58, 'NEXT', function () { sc.advance(); }, { size: 24 });
      next.box.setScrollFactor(0).setDepth(1103); next.label.setScrollFactor(0).setDepth(1104);
      d.bg = bg; d.face = face; d.rob = rob; d.name = name; d.body = body; d.next = next; d.btns = [];
      this.hideDialog();
    }
    hideDialog() {
      var d = this.dlg; [d.bg, d.face, d.rob, d.name, d.body].forEach(function (o) { o.setVisible(false); });
      d.next.box.setVisible(false); d.next.label.setVisible(false);
      d.btns.forEach(function (b) { b.destroy(); }); d.btns = [];
      d.bg.disableInteractive(); d.next.box.disableInteractive();
    }
    // lines: array of strings. cb runs after the last line. choices: [{label, cb}] shown on the last line.
    say(lines, cb, choices) {
      var d = this.dlg;
      d.lines = lines.slice(); d.i = 0; d.cb = cb || null; d.choices = choices || null;
      this.dialogActive = true; this.lock = true; this.target = null; this.autoStation = null;
      this.showAct(false);
      [d.bg, d.face, d.rob, d.name, d.body].forEach(function (o) { o.setVisible(true); });
      d.bg.setInteractive();
      this.showLine();
    }
    showLine() {
      var sc = this, d = this.dlg, line = d.lines[d.i], last = d.i === d.lines.length - 1;
      d.full = line; d.pos = 0; d.typing = true; d.body.setText('');
      d.btns.forEach(function (b) { b.destroy(); }); d.btns = [];
      d.next.box.setVisible(false); d.next.label.setVisible(false); d.next.box.disableInteractive();
      if (d.ev) d.ev.remove();
      d.ev = this.time.addEvent({ delay: 18, loop: true, callback: function () {
        d.pos += 2; d.body.setText(d.full.slice(0, d.pos));
        if (d.pos % 6 === 0) MB.sfx.talk();
        if (d.pos >= d.full.length) sc.lineDone();
      } });
    }
    lineDone() {
      var sc = this, d = this.dlg, last = d.i === d.lines.length - 1;
      d.typing = false; if (d.ev) { d.ev.remove(); d.ev = null; }
      d.body.setText(d.full);
      if (last && d.choices) {
        d.choices.forEach(function (c, k) {
          var b = MB.button(sc, 800 + k * 210 - (d.choices.length - 1) * 105 + 100, 200, 200, 52, c.label, function () { sc.closeDialog(c.cb); }, { size: 20, fill: k === 0 ? C.rust : C.panel2, hover: k === 0 ? 0xe0683b : C.line });
          b.box.setScrollFactor(0).setDepth(1103); b.label.setScrollFactor(0).setDepth(1104);
          d.btns.push(b);
        });
      } else {
        d.next.setLabel(last ? 'OK' : 'NEXT');
        d.next.box.setVisible(true); d.next.label.setVisible(true); d.next.box.setInteractive({ useHandCursor: true });
      }
    }
    advance() {
      var d = this.dlg;
      if (!this.dialogActive) return;
      if (d.typing) { this.lineDone(); return; }
      if (d.i < d.lines.length - 1) { d.i++; this.showLine(); MB.sfx.click(); return; }
      if (d.choices) return; // must press a choice
      this.closeDialog(d.cb);
    }
    closeDialog(cb) {
      this.hideDialog(); this.dialogActive = false; this.lock = false; this.idle = 0;
      if (this.dlg.ev) { this.dlg.ev.remove(); this.dlg.ev = null; }
      this.refreshAct();
      if (cb) cb.call(this);
    }
    skipDialogs() { // test hook
      var n = 0; while (this.dialogActive && n++ < 40) { var d = this.dlg; if (d.typing) this.lineDone(); if (d.choices && d.i === d.lines.length - 1) { this.closeDialog(d.choices[0].cb); } else this.advance(); }
    }

    // ------------------------------------------------------------------ INPUT
    buildJoystick() {
      var j = this.joy;
      this.joyBase = this.keep(this.add.circle(j.bx, j.by, 82, 0xffffff, 0.1).setStrokeStyle(4, 0xffffff, 0.35), 900);
      this.joyThumb = this.keep(this.add.circle(j.bx, j.by, 40, 0xffffff, 0.28).setStrokeStyle(3, 0xffffff, 0.5), 901);
    }
    buildInput() {
      var sc = this, j = this.joy, kb = this.input.keyboard;
      this.input.addPointer(2);
      this.cursors = kb.createCursorKeys();
      this.keys = kb.addKeys('W,A,S,D');
      kb.on('keydown-E', function () { sc.interact(); });
      kb.on('keydown-SPACE', function () { if (sc.dialogActive) sc.advance(); else sc.interact(); });
      kb.on('keydown-ENTER', function () { if (sc.dialogActive) sc.advance(); });
      this.input.on('pointerdown', function (p, over) {
        if (sc.lock) return;
        var st = over && over.length ? over[0].getData && over[0].getData('station') : null;
        if (over && over.length && !st) return;                       // HUD button, handled itself
        if (st) { var s = byKey(st); sc.target = { x: s.x, y: 585 }; sc.autoStation = st; MB.sfx.click(); return; }
        if (p.x < 340 && p.y > 430) { j.active = true; j.id = p.id; sc.joyMove(p); return; }
        sc.target = { x: p.worldX, y: clamp(p.worldY, BAND_TOP, BAND_BOT) }; sc.autoStation = null;
      });
      this.input.on('pointermove', function (p) { if (j.active && p.id === j.id) sc.joyMove(p); });
      var up = function (p) { if (j.active && p.id === j.id) { j.active = false; j.vx = j.vy = 0; sc.joyThumb.setPosition(j.bx, j.by); } };
      this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
    }
    joyMove(p) {
      var j = this.joy, dx = p.x - j.bx, dy = p.y - j.by, d = Math.sqrt(dx * dx + dy * dy), R = 80;
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      j.vx = dx / R; j.vy = dy / R;
      if (Math.abs(j.vx) < 0.15) j.vx = 0; if (Math.abs(j.vy) < 0.15) j.vy = 0;
      this.joyThumb.setPosition(j.bx + dx, j.by + dy);
      this.target = null; this.autoStation = null;
    }

    // ------------------------------------------------------------------ ACTIONS AT STATIONS
    showAct(on) { this.actBtn.box.setVisible(on); this.actBtn.label.setVisible(on); this.actSub.setVisible(on); if (on) this.actBtn.box.setInteractive({ useHandCursor: true }); else this.actBtn.box.disableInteractive(); }

    // what the big button does at the station the astronaut is standing at
    actionFor(st) {
      var S = this.S, M = this.M;
      if (!st) return null;
      if (M) {
        if (st.key === 'power' && M.step === 'toSolar') return { label: 'CLEAN SOLAR PANELS', sub: 'Wipe the dust off', ok: true, run: 'mini' };
        return null;
      }
      if (st.key === 'home') {
        var left = sim.hoursLeft(S);
        return { label: 'SLEEP: END THE DAY', sub: left + ' crew-hours unused', ok: true, run: 'sleep' };
      }
      var a = CFG.actions[st.key], can = sim.canAct(S, st.key);
      return { label: a.name.toUpperCase(), sub: can.ok ? 'Uses ' + a.hours + ' crew-hours, ' + a.power + ' power' : can.why, ok: can.ok, why: can.why, run: 'mini' };
    }

    interact() {
      if (this.lock || !this.near) return;
      var act = this.actionFor(this.near);
      if (!act) return;
      if (!act.ok) { MB.sfx.bad(); this.toast(act.why); return; }
      MB.sfx.click();
      if (act.run === 'mini') {
        this.registry.set('pos', { x: this.player.x, y: this.player.y });
        this.scene.start('Mini', { key: this.near.key, ret: 'World' });
      } else if (act.run === 'sleep') this.confirmSleep();
    }

    confirmSleep() {
      var S = this.S, left = sim.hoursLeft(S), sc = this;
      var msg = left > 0 ? 'You still have ' + left + ' crew-hours. Unused time is lost. Is it time for the crew to sleep?' : 'All the work is done for today. Time for the crew to sleep?';
      this.say([msg], null, [
        { label: 'Yes, sleep', cb: function () { sc.endSol(); } },
        { label: 'Not yet', cb: function () { } }
      ]);
    }
    endSol() {
      var sc = this;
      this.lock = true;
      var rep = sim.endSol(this.S);
      this.registry.set('R', rep);
      this.cameras.main.fadeOut(500);
      this.cameras.main.once('camerafadeoutcomplete', function () { sc.scene.start('Recap'); });
    }

    // ------------------------------------------------------------------ FLOW: free play and Mission 1
    startFlow() {
      var sc = this, S = this.S, M = this.M, la = this.registry.get('lastAction');
      if (M) return this.missionFlow(la);
      // free play
      var hint = null;
      if (la) {
        this.registry.set('lastAction', null);
        var q = la.q, lines = [(q > 0.85 ? 'Excellent work! ' : q > 0.6 ? 'Nice job! ' : 'Good try! The repair is smaller, but it still helps. ') + 'The ' + CFG.actions[la.key].short.toLowerCase() + ' got better by ' + la.gain + ' points.', MB.LESSONS[la.key]];
        MB.sfx.good();
        this.say(lines);
        return;
      }
      if (this.registry.get('greeted') !== S.sol + ':' + S.siteKey + ':' + S.seed) {
        this.registry.set('greeted', S.sol + ':' + S.siteKey + ':' + S.seed);
        var first = S.sol === 1;
        var intro = first ? ['Welcome to ' + S.site.name + '! Each Mars day is called a sol. The crew has a little time and power each sol, and you cannot fix everything. Choose what matters most!', 'Walk to a machine and tap the big button to fix it. When you are done, go to the Habitat and sleep to end the sol.'] : [];
        var today = this.w.ev ? MB.EVENT_INFO[this.w.ev].title + ' today. ' : '';
        this.say(intro.concat(['Sol ' + S.sol + '. ' + today + sim.advice(S)]));
      }
    }

    missionFlow(la) {
      var sc = this, S = this.S, M = this.M, D = MB.MISSION1;
      M.seen = M.seen || {};
      this.registry.set('lastAction', null);
      if (M.step === 'intro') {
        this.say(D.intro, function () { M.step = 'tour'; sc.tourObjective(); });
        return;
      }
      if (M.step === 'tour') return this.tourObjective();
      if (M.step === 'toSolar') {
        this.setStorm(1);
        if (S.done.power) return this.restoreSequence();
        this.setObjective('power', M.seen.solar ? D.objectives.clean : D.objectives.solar);
      }
    }
    tourObjective() {
      var M = this.M, D = MB.MISSION1;
      if (!M.seen.greenhouse) this.setObjective('food', D.objectives.greenhouse);
      else if (!M.seen.water) this.setObjective('water', D.objectives.water);
      else this.alarmSequence();
    }
    alarmSequence() {
      var sc = this, S = this.S, M = this.M, D = MB.MISSION1;
      if (M.step === 'alarm') return;
      M.step = 'alarm'; this.setObjective(null, null); this.lock = true;
      MB.sfx.alarm();
      this.cameras.main.shake(500, 0.004);
      var o = { v: 0 };
      this.tweens.addCounter({ from: 0, to: 1, duration: 2600, onUpdate: function (tw) { sc.setStorm(tw.getValue()); } });
      this.time.delayedCall(1200, function () {
        sim.missionStorm(S); sc.paint(); sc.refreshHud(); MB.sfx.bad();
        sc.flicker();
      });
      this.time.delayedCall(2200, function () {
        sc.say(D.alarm, function () { M.step = 'toSolar'; sc.setObjective('power', D.objectives.solar); });
      });
    }
    flicker() {
      var sc = this, n = 0;
      this.time.addEvent({ delay: 120, repeat: 5, callback: function () { n++; sc.darkRect.setAlpha(n % 2 ? 0.45 : 0.05); } });
    }
    restoreSequence() {
      var sc = this, S = this.S, M = this.M, D = MB.MISSION1, q = S.lastQ.power || 0;
      M.step = 'restore'; this.lock = true; this.setObjective(null, null);
      this.paint();
      this.time.delayedCall(500, function () {
        sim.missionRecharge(S, q);
        MB.sfx.powerUp();
        sc.paint(); sc.refreshHud();
        var n = 0;
        sc.time.addEvent({ delay: 140, repeat: 7, callback: function () { n++; sc.darkRect.setAlpha(n % 2 ? 0.3 : 0); if (n === 8) { sc.darkRect.setAlpha(0); sc.paint(); } } });
        sc.tweens.addCounter({ from: 1, to: 0.12, duration: 3500, onUpdate: function (tw) { sc.setStorm(tw.getValue()); } });
      });
      this.time.delayedCall(2400, function () {
        MB.sfx.good();
        sc.say(D.restore, function () {
          M.step = 'done'; M.q = q;
          var stars = q > 0.85 ? 3 : q > 0.6 ? 2 : 1;
          var save = MB.save.get(); save.m1 = Math.max(save.m1 || 0, stars); MB.save.set(save);
          sc.cameras.main.fadeOut(600);
          sc.cameras.main.once('camerafadeoutcomplete', function () { sc.scene.start('Complete', { stars: stars, q: q }); });
        });
      });
    }

    // ------------------------------------------------------------------ UPDATE
    update(time, dtMs) {
      var dt = Math.min(dtMs, 50) / 1000, S = this.S, M = this.M, p = this.player, j = this.joy;
      this.t = time;
      if (this.fan) this.fan.rotation += (this.fanSpeed || 0.05) * (dtMs / 16);
      // water leak drip
      this.leak.clear();
      if (this.leaking) {
        this.dripT = (this.dripT + dt * 1.6) % 1;
        var lx = byKey('water').x + 20;
        this.leak.fillStyle(0x7fc0ff, 1); this.leak.fillCircle(lx, BASE - 38 + this.dripT * 40, 4);
        this.leak.fillStyle(0x7fc0ff, 0.5); this.leak.fillEllipse(lx, BASE + 4, 30, 8);
      }
      // movement
      var vx = 0, vy = 0, moving = false;
      if (!this.lock) {
        if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
        if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
        if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;
        if (j.active) { vx += j.vx; vy += j.vy; }
        if (vx || vy) { this.target = null; this.autoStation = null; }
        else if (this.target) {
          var dx = this.target.x - p.x, dy = this.target.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 8) { this.target = null; } else { vx = dx / d; vy = dy / d; }
        }
        var m = Math.sqrt(vx * vx + vy * vy); if (m > 1) { vx /= m; vy /= m; }
        if (vx || vy) {
          moving = true;
          p.x = clamp(p.x + vx * 310 * dt, 50, WW - 50);
          p.y = clamp(p.y + vy * 190 * dt, BAND_TOP, BAND_BOT);
          if (Math.abs(vx) > 0.05) p.face(vx > 0 ? 1 : -1);
        }
      }
      var sc2 = 0.82 + (p.y - BAND_TOP) / (BAND_BOT - BAND_TOP) * 0.3;
      p._s = sc2; p.setScale(sc2 * p._dir, sc2); p.setDepth(p.y);
      p.step(moving, time);
      // ROVA follows
      var rx = p.x - 95 * p._dir, ry = p.y - 85;
      this.rova.x = lerp(this.rova.x, rx, 0.06); this.rova.y = lerp(this.rova.y, ry, 0.06);
      this.rova.scaleX = this.rova.x < p.x ? 1 : -1; this.rova.setDepth(p.y + 1);
      // nearest station
      var near = null, best = NEAR;
      STATIONS.forEach(function (st) { var d = Math.abs(p.x - st.x); if (d < best) { best = d; near = st; } });
      if (near !== this.near) { this.near = near; this.onNear(); }
      if (this.near && this.autoStation === this.near.key && !this.target && !this.lock) { this.autoStation = null; this.interact(); }
      // edge arrow toward objective
      var st = this.objStation, ea = this.edgeArrow;
      if (st && !this.lock) {
        var sx = st.x - this.cameras.main.scrollX;
        if (sx < 90) { ea.setVisible(true).setPosition(60, 360).setScale(-1, 1); this.edgeTxt.setVisible(true).setPosition(60, 408).setText(Math.round(Math.abs(p.x - st.x) / 100) + ' m'); }
        else if (sx > 1190) { ea.setVisible(true).setPosition(1220, 360).setScale(1, 1); this.edgeTxt.setVisible(true).setPosition(1220, 408).setText(Math.round(Math.abs(p.x - st.x) / 100) + ' m'); }
        else { ea.setVisible(false); this.edgeTxt.setVisible(false); }
      } else { ea.setVisible(false); this.edgeTxt.setVisible(false); }
      // gentle hints when the player seems stuck
      if (!this.lock) {
        this.idle += dt;
        if (this.idle > 22) {
          this.idle = 0;
          var h = M && MB.MISSION1.hints[M.step === 'toSolar' ? (M.seen.solar ? 'clean' : 'solar') : (!M.seen.greenhouse ? 'greenhouse' : 'water')];
          this.toast('ROVA: ' + (M ? (h || 'Keep going!') : sim.advice(S)), 6000);
        }
      } else this.idle = 0;
      if (moving) this.idle = 0;
    }

    refreshAct() {
      if (this.lock) return;
      var act = this.actionFor(this.near);
      if (act) {
        this.actBtn.setLabel(act.label); this.actSub.setText(act.sub);
        this.actBtn.setEnabled(act.ok); this.actSub.setColor(act.ok ? '#ffe9cf' : '#ff9d8c');
        this.showAct(true);
      } else this.showAct(false);
    }

    onNear() {
      var st = this.near, M = this.M, D = MB.MISSION1, sc = this;
      if (this.lock) return;
      this.refreshAct();
      if (!M || !st) return;
      // Mission 1: first arrival explains the place
      if (M.step === 'tour' && st.key === 'food' && !M.seen.greenhouse) {
        M.seen.greenhouse = true; this.setObjective(null, null);
        this.say([D.tour.greenhouse], function () { sc.tourObjective(); });
      } else if (M.step === 'tour' && st.key === 'water' && M.seen.greenhouse && !M.seen.water) {
        M.seen.water = true; this.setObjective(null, null);
        this.say([D.tour.water], function () { sc.tourObjective(); });
      } else if (M.step === 'toSolar' && st.key === 'power' && !M.seen.solar) {
        M.seen.solar = true; this.setObjective(null, null);
        this.say([D.solarArrive], function () { sc.setObjective('power', D.objectives.clean); sc.onNear(); });
      }
    }
  }

  MB.WorldScene = WorldScene;
})();
