// MARSBOUND - scenes: Menu -> (Mission 1 | Sites -> free play) ; World <-> Mini ; World -> Recap -> World ... -> End
// Plan is the detailed 'report' screen (older kids / teachers), reachable from the World.
(function () {
  var MB = (window.MB = window.MB || {});
  var C = MB.C, CFG = MB.CFG, sim = MB.sim, txt = MB.txt;
  function r0(v) { return Math.round(v); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var TIPS = {
    power: 'Clean the panels. More sunlight turns into power, and dust storms hurt less.',
    water: 'Fix the recycler. It turns used water back into drinking water.',
    food: 'Tend the greenhouse. Plants need power and water to grow food.',
    life: 'Balance the air scrubbers. They make oxygen and remove CO2, and they need power.',
    shield: 'Stack regolith bags on the habitat. Soil blocks radiation, but it takes 3 crew-hours.'
  };
  var RES_LABEL = { power: 'Battery', water: 'Water', food: 'Food', oxygen: 'Oxygen', shield: 'Radiation' };
  var SYS_ORDER = ['power', 'water', 'food', 'life', 'shield'];
  var SYS_COLOR = { power: C.amber, water: C.blue, food: C.green, life: C.teal, shield: C.rust };

  // ------------------------------------------------------------------ MENU
  function resetRun(sc, mission) {
    sc.registry.set('mission', mission || null);
    sc.registry.set('pos', { x: 700, y: 585 });
    sc.registry.set('greeted', null);
    sc.registry.set('lastAction', null);
  }

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }
    create() {
      var sc = this, save = MB.save.get();
      MB.backdrop(sc, false);
      txt(sc, 640, 38, 'MARSBOUND', 96, '#f1e2cb', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      txt(sc, 640, 150, 'Become a Junior Astronaut. Explore Mars. Save your crew.', 28, '#e6c9a3').setOrigin(0.5, 0);
      MB.robot(sc, 150, 330, 1.5);
      var stars = save.m1 || 0;
      MB.button(sc, 420, 215, 440, 96, 'PLAY MISSION 1', function () {
        MB.sfx.click();
        resetRun(sc, { id: 1, step: 'intro', seen: {} });
        sc.registry.set('S', sim.create('gale', 11, { mode: 'junior' }));
        sc.scene.start('World');
      }, { size: 36 });
      txt(sc, 640, 318, 'Dust on the Panels' + (stars ? '   ' + '*'.repeat(stars) + ' done' : ''), 22, '#f0b34a', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      MB.button(sc, 420, 372, 440, 68, 'FREE PLAY: 30 MARS DAYS', function () { MB.sfx.click(); sc.scene.start('Sites'); }, { size: 26, fill: C.panel2, hover: C.line });
      // campaign map: only Mission 1 is built; the rest are shown honestly as coming soon
      MB.CHAPTERS.forEach(function (ch, i) {
        var x = 40 + i * 400, y = 470;
        MB.panel(sc, x, y, 380, 170, C.panel, C.line).setAlpha(0.93);
        txt(sc, x + 18, y + 12, 'Chapter ' + ch.id + ': ' + ch.title, 22, '#f1e2cb', { fontStyle: 'bold' });
        ch.missions.forEach(function (m, k) {
          var mx = x + 40 + k * 82, my = y + 84;
          var done = m.n === 1 && stars > 0;
          var c = sc.add.circle(mx, my, 28, m.ready ? C.rust : C.panel2).setStrokeStyle(3, m.ready ? C.amber : C.line);
          txt(sc, mx, my, '' + m.n, 24, m.ready ? '#fff4e4' : '#7d6a5a', { fontStyle: 'bold' }).setOrigin(0.5);
          if (done) txt(sc, mx, my + 40, '*'.repeat(stars), 20, '#f0b34a', { fontStyle: 'bold' }).setOrigin(0.5);
        });
        txt(sc, x + 18, y + 136, ch.id === 1 ? 'Mission 1 is ready. 2 and 3 are coming soon.' : 'Coming soon', 17, C.dim);
      });
      txt(sc, 640, 676, 'Inspired by NASA Curiosity (REMS, RAD) and Perseverance (MEDA). Game numbers are simplified for play, not raw mission data.', 15, C.dim).setOrigin(0.5, 0);
    }
  }

  class SitesScene extends Phaser.Scene {
    constructor() { super('Sites'); }
    create() {
      var sc = this, chosen = this.registry.get('site') || 'gale', mode = this.registry.get('mode') || 'junior';
      MB.backdrop(sc, false);
      txt(sc, 640, 30, 'FREE PLAY', 64, '#f1e2cb', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      txt(sc, 640, 112, 'Keep the crew alive for 30 Mars days (sols). Choose where to build your base.', 24, '#e6c9a3').setOrigin(0.5, 0);
      var cards = [];
      Object.keys(MB.SITES).forEach(function (key, i) {
        var s = MB.SITES[key], x = 150 + i * 340, y = 170, counts = {};
        s.schedule.forEach(function (e) { counts[e.t] = (counts[e.t] || 0) + 1; });
        var risk = [];
        if (counts.dust) risk.push(counts.dust + ' dust storm' + (counts.dust > 1 ? 's' : ''));
        if (counts.flare) risk.push(counts.flare + ' radiation burst' + (counts.flare > 1 ? 's' : ''));
        if (counts.cold) risk.push(counts.cold + ' deep cold night' + (counts.cold > 1 ? 's' : ''));
        var diff = { gale: 'Easier', jezero: 'Medium', hellas: 'Hardest' }[key];
        var box = MB.panel(sc, x, y, 320, 230, C.panel, C.line).setAlpha(0.95);
        box.setInteractive({ useHandCursor: true });
        txt(sc, x + 18, y + 14, s.name, 28, '#f1e2cb', { fontStyle: 'bold' });
        txt(sc, x + 18, y + 54, s.blurb, 18, C.dim, { wordWrap: { width: 285 } });
        txt(sc, x + 18, y + 150, risk.join('\n'), 18, '#e6c9a3', { lineSpacing: 4 });
        txt(sc, x + 302, y + 14, diff, 18, '#f0b34a', { fontStyle: 'bold' }).setOrigin(1, 0);
        box.on('pointerdown', function () { chosen = key; sc.registry.set('site', key); paint(); });
        cards.push({ key: key, box: box });
      });
      var mb = {};
      function mkMode(k, x, label, sub) {
        var b = MB.panel(sc, x, 425, 330, 84, C.panel, C.line).setAlpha(0.95); b.setInteractive({ useHandCursor: true });
        txt(sc, x + 16, 435, label, 24, '#f1e2cb', { fontStyle: 'bold' });
        txt(sc, x + 16, 468, sub, 17, C.dim);
        b.on('pointerdown', function () { mode = k; sc.registry.set('mode', k); paint(); });
        mb[k] = b;
      }
      mkMode('junior', 310, 'Friendly crew', 'Crew is tougher. Good for learning.');
      mkMode('classic', 650, 'Hard mode', 'Crew gets sick fast. Real challenge.');
      function paint() {
        cards.forEach(function (c) { c.box.setStrokeStyle(4, c.key === chosen ? C.amber : C.line); });
        Object.keys(mb).forEach(function (k) { mb[k].setStrokeStyle(4, k === mode ? C.amber : C.line); });
      }
      paint();
      txt(sc, 640, 536, 'Walk around the base, fix the machines, then sleep to end each sol.', 22, '#ecd9bf').setOrigin(0.5, 0);
      MB.button(sc, 470, 580, 340, 70, 'LAUNCH', function () {
        MB.sfx.click();
        sc.registry.set('site', chosen); sc.registry.set('mode', mode);
        resetRun(sc, null);
        sc.registry.set('S', sim.create(chosen, undefined, { mode: mode }));
        sc.scene.start('World');
      }, { size: 28 });
      MB.button(sc, 30, 640, 160, 50, 'BACK', function () { sc.scene.start('Menu'); }, { size: 22, fill: C.panel2, hover: C.line });
      MB.robot(sc, 1150, 620, 1);
    }
  }

  // ------------------------------------------------------------------ PLAN
  class PlanScene extends Phaser.Scene {
    constructor() { super('Plan'); }
    create() {
      var sc = this, S = this.registry.get('S'), w = S.weather[S.sol - 1];
      MB.backdrop(sc, w.ev === 'dust');
      // header
      MB.panel(sc, 0, 0, 1280, 72, C.panel, C.line).setAlpha(0.96);
      txt(sc, 30, 10, 'SOL ' + S.sol, 40, '#f1e2cb', { fontStyle: 'bold' });
      txt(sc, 190, 28, '/ ' + CFG.sols + '   ' + S.site.name, 22, C.dim);
      var pm = MB.meter(sc, 30, 56, 320, 8, C.sand); pm.set(S.sol / CFG.sols * 100, C.sand);
      // forecast
      txt(sc, 600, 8, 'FORECAST', 14, C.dim, { fontStyle: 'bold' });
      sim.forecast(S).forEach(function (f, i) {
        var x = 600 + i * 220, info = f.ev ? MB.EVENT_INFO[f.ev] : null;
        sc.add.rectangle(x, 28, 205, 38, C.panel2).setOrigin(0, 0).setStrokeStyle(1, C.line);
        MB.ICON(sc, f.ev || 'calm', x + 22, 47, 22);
        txt(sc, x + 44, 31, (i === 0 ? 'Today' : 'Sol ' + f.sol), 12, C.dim);
        txt(sc, x + 44, 44, info ? info.title : 'Quiet', 15, info ? '#ffd9a8' : '#cdbfae', { fontStyle: 'bold' });
      });
      // stores
      MB.panel(sc, 30, 86, 390, 474, C.panel, C.line).setAlpha(0.94);
      txt(sc, 50, 98, 'STORES', 16, C.dim, { fontStyle: 'bold' });
      var stores = [['power', 'Battery', C.amber], ['water', 'Water', C.blue], ['food', 'Food', C.green], ['oxygen', 'Oxygen', C.teal]];
      stores.forEach(function (s, i) {
        var y = 126 + i * 46;
        txt(sc, 50, y, s[1], 20, '#ecd9bf', { fontStyle: 'bold' });
        txt(sc, 400, y, r0(S.res[s[0]]) + '', 20, S.res[s[0]] < 20 ? C.bad : '#ecd9bf', { fontFamily: MB.MONO, fontStyle: 'bold' }).setOrigin(1, 0);
        var m = MB.meter(sc, 50, y + 26, 350, 12, s[2]); m.set(S.res[s[0]]);
      });
      txt(sc, 50, 318, 'SYSTEMS  (how well they work)', 16, C.dim, { fontStyle: 'bold' });
      SYS_ORDER.forEach(function (k, i) {
        var y = 346 + i * 44;
        txt(sc, 50, y, CFG.actions[k].short, 18, '#ecd9bf');
        txt(sc, 400, y, r0(S.cond[k]) + '%', 18, S.cond[k] < 30 ? C.bad : '#ecd9bf', { fontFamily: MB.MONO }).setOrigin(1, 0);
        var m = MB.meter(sc, 50, y + 24, 350, 10, SYS_COLOR[k]); m.set(S.cond[k]);
      });
      // crew
      MB.panel(sc, 440, 86, 380, 474, C.panel, C.line).setAlpha(0.94);
      txt(sc, 460, 98, 'CREW', 16, C.dim, { fontStyle: 'bold' });
      S.crew.forEach(function (c, i) {
        var y = 126 + i * 108;
        sc.add.rectangle(458, y, 344, 98, C.panel2).setOrigin(0, 0).setStrokeStyle(1, C.line).setAlpha(c.alive ? 1 : 0.5);
        sc.add.circle(488, y + 30, 18, c.alive ? C.sand : C.line);
        if (c.alive) { sc.add.ellipse(493, y + 28, 24, 17, C.ink).setAlpha(0.85); sc.add.ellipse(498, y + 24, 8, 4, 0xffffff).setAlpha(0.35); }
        txt(sc, 520, y + 10, c.name, 22, c.alive ? '#f1e2cb' : '#8c7a6a', { fontStyle: 'bold' });
        if (c.alive) {
          var m = MB.meter(sc, 520, y + 44, 270, 12, C.green); m.set(c.hp, c.hp < 35 ? C.red : c.hp < 65 ? C.amber : C.green);
          txt(sc, 520, y + 64, 'Health ' + r0(c.hp) + '   Radiation dose ' + (Math.round(c.dose * 10) / 10) + ' mSv', 14, C.dim);
        } else {
          txt(sc, 520, y + 46, 'Went home on sol ' + c.lostSol + '\n' + c.cause, 15, C.bad);
        }
      });
      // actions
      MB.panel(sc, 840, 86, 410, 474, C.panel, C.line).setAlpha(0.94);
      txt(sc, 860, 98, 'WHAT WILL YOU FIX TODAY?', 16, C.dim, { fontStyle: 'bold' });
      var bubble = MB.bubble(sc, 190, 590, 500, 104);
      var defaultTip = sim.advice(S);
      bubble.say(defaultTip);
      SYS_ORDER.forEach(function (k, i) {
        var a = CFG.actions[k], y = 126 + i * 66, can = sim.canAct(S, k);
        var box = sc.add.rectangle(858, y, 374, 58, S.done[k] ? 0x2f3a2a : C.panel2).setOrigin(0, 0).setStrokeStyle(2, can.ok ? SYS_COLOR[k] : C.line);
        txt(sc, 874, y + 7, a.name, 19, can.ok || S.done[k] ? '#f1e2cb' : '#8c7a6a', { fontStyle: 'bold' });
        txt(sc, 874, y + 33, a.hours + ' crew-hours   ' + a.power + ' power', 14, C.dim);
        var tag = S.done[k] ? 'DONE ' + r0(S.lastQ[k] * 100) + '%' : (can.ok ? 'GO' : '');
        txt(sc, 1218, y + 18, tag, 18, S.done[k] ? C.good : '#f0b34a', { fontStyle: 'bold' }).setOrigin(1, 0);
        box.setInteractive({ useHandCursor: can.ok });
        box.on('pointerover', function () { bubble.say(TIPS[k] + (can.ok ? '' : '  (' + can.why + ')')); });
        box.on('pointerout', function () { bubble.say(defaultTip); });
        box.on('pointerdown', function () {
          if (can.ok) sc.scene.start('Mini', { key: k, ret: 'Plan' }); else bubble.say(can.why);
        });
      });
      // budget pips
      txt(sc, 860, 466, 'CREW-HOURS LEFT', 14, C.dim, { fontStyle: 'bold' });
      for (var h = 0; h < S.hoursMax; h++) sc.add.rectangle(860 + h * 30, 488, 24, 22, h < sim.hoursLeft(S) ? C.sand : C.line).setOrigin(0, 0);
      txt(sc, 860, 520, 'Battery: ' + r0(S.res.power) + '  (each fix spends some)', 15, C.dim);
      // robot + end sol
      MB.robot(sc, 90, 660, 1);
      MB.button(sc, 980, 604, 270, 72, 'END SOL', function () {
        var rep = sim.endSol(S);
        sc.registry.set('R', rep);
        sc.scene.start('Recap');
      }, { size: 30 });
      txt(sc, 1115, 684, 'Unused hours are lost. Mars does not wait.', 13, C.dim).setOrigin(0.5, 0);
      MB.button(sc, 706, 604, 250, 72, 'BACK TO BASE', function () { sc.scene.start('World'); }, { size: 24, fill: C.panel2, hover: C.line });
    }
  }

  // ------------------------------------------------------------------ MINI
  class MiniScene extends Phaser.Scene {
    constructor() { super('Mini'); }
    init(d) { this.key = d.key; this.ret = d.ret || 'World'; this.playT = 0; this.hintShown = false; }
    create() {
      var sc = this, S = this.registry.get('S'), def = MB.mini[this.key], a = CFG.actions[this.key];
      this.input.removeAllListeners();
      this.input.keyboard.removeAllListeners();
      this.tick = null; this.running = false; this.finished = false; this.timerFill = null;
      MB.backdrop(sc, false);
      var A = { x: 140, y: 120, w: 1000, h: 500 };
      this.A = A;
      MB.panel(sc, A.x - 20, A.y - 20, A.w + 40, A.h + 40, 0x1b1310, C.line).setAlpha(0.93);
      txt(sc, 30, 22, def.title.toUpperCase(), 34, '#f1e2cb', { fontStyle: 'bold' });
      txt(sc, 30, 66, (sc.ret === 'World' && sc.registry.get('mission') ? 'Mission ' + sc.registry.get('mission').id : 'Sol ' + S.sol) + '  -  costs ' + a.hours + ' crew-hours and ' + a.power + ' power', 16, C.dim);
      this.setTimer = function (f) {
        if (!sc.timerFill) {
          sc.add.rectangle(900, 30, 340, 22, C.ink).setOrigin(0, 0).setStrokeStyle(2, C.line);
          sc.timerFill = sc.add.rectangle(902, 32, 336, 18, C.amber).setOrigin(0, 0);
        }
        sc.timerFill.width = 336 * clamp(f, 0, 1);
        sc.timerFill.setFillStyle(f < 0.25 ? C.red : C.amber);
      };
      // intro card
      var intro = [];
      var dim = sc.add.rectangle(0, 0, 1280, 720, 0x000000, 0.55).setOrigin(0, 0);
      var card = MB.panel(sc, 340, 200, 600, 300, C.panel, C.amber);
      var t1 = txt(sc, 640, 226, 'HOW TO PLAY', 18, '#f0b34a', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      var t2 = txt(sc, 640, 270, def.how, 22, '#ecd9bf', { align: 'center', wordWrap: { width: 540 }, lineSpacing: 6 }).setOrigin(0.5, 0);
      var btn = MB.button(sc, 540, 420, 200, 56, 'GO!', function () {
        intro.forEach(function (o) { o.destroy(); });
        btn.destroy();
        sc.running = true;
        def.start(sc, A, function (q) { sc.finish(q); });
      }, { size: 26 });
      intro = [dim, card, t1, t2];
      this.finish = function (q) {
        if (sc.finished) return;
        sc.finished = true; sc.running = false;
        var res = sim.applyAction(S, sc.key, q);
        if (sc.ret === 'World') sc.registry.set('lastAction', { key: sc.key, q: q, gain: res.gain });
        if (q > 0.5) MB.sfx.good(); else MB.sfx.bad();
        sc.add.rectangle(0, 0, 1280, 720, 0x000000, 0.6).setOrigin(0, 0);
        MB.panel(sc, 340, 190, 600, 330, C.panel, q > 0.66 ? C.green : q > 0.33 ? C.amber : C.red);
        var word = q > 0.85 ? 'EXCELLENT' : q > 0.66 ? 'GOOD WORK' : q > 0.33 ? 'PATCHED UP' : 'ROUGH JOB';
        txt(sc, 640, 216, word, 38, '#f1e2cb', { fontStyle: 'bold' }).setOrigin(0.5, 0);
        txt(sc, 640, 272, 'Quality ' + r0(q * 100) + '%', 28, '#f0b34a', { fontStyle: 'bold' }).setOrigin(0.5, 0);
        txt(sc, 640, 322, CFG.actions[sc.key].short + ' improved by ' + res.gain + ' points.\nBetter work means a bigger repair.', 20, '#ecd9bf', { align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0);
        MB.button(sc, 520, 438, 240, 58, 'BACK TO BASE', function () { sc.scene.start(sc.ret); }, { size: 22 });
      };
    }
    update(t, dt) {
      if (!this.running || !this.tick) return;
      this.tick(Math.min(dt, 50) / 1000);
      this.playT += Math.min(dt, 50) / 1000;
      var def = MB.mini[this.key];
      if (this.playT > 9 && !this.hintShown && !this.finished && def.hint) {
        this.hintShown = true;
        txt(this, 640, 656, 'ROVA hint: ' + def.hint, 21, '#ffe0a8', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      }
    }
  }

  // ------------------------------------------------------------------ RECAP
  class RecapScene extends Phaser.Scene {
    constructor() { super('Recap'); }
    create() {
      var sc = this, S = this.registry.get('S'), R = this.registry.get('R'), info = MB.EVENT_INFO[R.ev];
      MB.backdrop(sc, R.ev === 'dust');
      MB.panel(sc, 120, 30, 1040, 660, C.panel, C.line).setAlpha(0.95);
      txt(sc, 150, 44, 'SOL ' + R.sol + ' REPORT', 36, '#f1e2cb', { fontStyle: 'bold' });
      // event card
      sc.add.rectangle(150, 100, 980, 104, C.panel2).setOrigin(0, 0).setStrokeStyle(2, R.ev === 'calm' ? C.line : C.amber);
      MB.ICON(sc, R.ev, 190, 152, 44);
      txt(sc, 240, 110, info.title, 26, '#ffd9a8', { fontStyle: 'bold' });
      txt(sc, 240, 144, info.fact, 16, '#ecd9bf', { wordWrap: { width: 870 }, lineSpacing: 3 });
      txt(sc, 1112, 114, 'Night low ' + r0(R.tmin) + ' C', 15, C.dim).setOrigin(1, 0);
      // lines
      R.lines.forEach(function (l, i) {
        var y = 226 + i * 66;
        sc.add.rectangle(150, y, 980, 58, C.panel2).setOrigin(0, 0).setStrokeStyle(1, l.bad ? C.red : C.line);
        sc.add.rectangle(150, y, 8, 58, MB.RES_COLOR[l.k]).setOrigin(0, 0);
        txt(sc, 172, y + 8, RES_LABEL[l.k], 20, '#f1e2cb', { fontStyle: 'bold' });
        txt(sc, 172, y + 34, l.text, 15, '#d8c4a8', { wordWrap: { width: 800 } });
        if (l.from != null) {
          var d = r0(l.to - l.from);
          txt(sc, 1112, y + 8, r0(l.from) + '  >  ' + r0(l.to), 22, d < -8 ? C.bad : d > 3 ? C.good : '#ecd9bf', { fontFamily: MB.MONO, fontStyle: 'bold' }).setOrigin(1, 0);
        }
      });
      // crew status
      var alive = sim.aliveCount(S), y2 = 566;
      if (R.deaths.length) {
        R.deaths.forEach(function (d, i) {
          sc.add.rectangle(150, y2 + i * 40, 980, 36, 0x4a1d18).setOrigin(0, 0).setStrokeStyle(2, C.red);
          txt(sc, 170, y2 + 6 + i * 40, d.name + ' got too sick to work and flew home (' + d.cause + ').', 19, '#ffb3a6', { fontStyle: 'bold' });
        });
      } else {
        txt(sc, 150, y2 + 6, 'The whole crew got through the sol.', 20, C.good, { fontStyle: 'bold' });
      }
      txt(sc, 1130, 640, 'Crew alive: ' + alive + ' of ' + S.crew.length, 18, C.dim).setOrigin(1, 0);
      MB.button(sc, 150, 626, 300, 52, R.over ? 'SEE THE RESULT' : 'NEXT SOL', function () { sc.scene.start(R.over ? 'End' : 'World'); }, { size: 22 });
    }
  }

  // ------------------------------------------------------------------ END
  class EndScene extends Phaser.Scene {
    constructor() { super('End'); }
    create() {
      var sc = this, S = this.registry.get('S'), win = S.over === 'win', alive = sim.aliveCount(S);
      MB.backdrop(sc, false);
      MB.panel(sc, 60, 24, 1160, 672, C.panel, win ? C.green : C.red).setAlpha(0.96);
      txt(sc, 90, 40, win ? 'THE COLONY ENDURED' : 'THE BASE WENT QUIET', 46, win ? '#b8e5a4' : '#ff9d8c', { fontStyle: 'bold' });
      var sub = win ? CFG.sols + ' sols on Mars. ' + alive + ' of ' + S.crew.length + ' crew alive.' : 'The last crew member flew home on sol ' + S.history[S.history.length - 1].sol + '. Every astronaut learns from a hard mission.';
      txt(sc, 90, 98, sub, 22, '#ecd9bf');
      // chart
      var cx = 90, cy = 150, cw = 600, ch = 300;
      sc.add.rectangle(cx, cy, cw, ch, C.ink).setOrigin(0, 0).setStrokeStyle(2, C.line);
      var g = sc.add.graphics();
      g.lineStyle(1, C.line, 0.7);
      [25, 50, 75].forEach(function (v) { var yy = cy + ch - ch * v / 100; g.beginPath(); g.moveTo(cx, yy); g.lineTo(cx + cw, yy); g.strokePath(); });
      var keys = [['power', C.amber, 'Battery'], ['water', C.blue, 'Water'], ['food', C.green, 'Food'], ['oxygen', C.teal, 'Oxygen']];
      keys.forEach(function (k) {
        g.lineStyle(4, k[1], 1); g.beginPath();
        S.history.forEach(function (h, i) {
          var x = cx + (i / (CFG.sols - 1)) * cw, y = cy + ch - ch * clamp(h[k[0]], 0, 100) / 100;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.strokePath();
      });
      // death markers
      S.crew.forEach(function (c, ci) {
        if (c.lostSol) { var x = cx + ((c.lostSol - 1) / (CFG.sols - 1)) * cw; g.lineStyle(2, C.red, 1); g.beginPath(); g.moveTo(x, cy); g.lineTo(x, cy + ch); g.strokePath(); txt(sc, x + 4, cy + 4 + ci * 15, c.name, 12, C.bad); }
      });
      keys.forEach(function (k, i) { sc.add.rectangle(cx + i * 140, cy + ch + 14, 18, 8, k[1]).setOrigin(0, 0.5); txt(sc, cx + 24 + i * 140, cy + ch + 5, k[2], 14, C.dim); });
      txt(sc, cx, cy - 22, 'YOUR COLONY, SOL BY SOL', 14, C.dim, { fontStyle: 'bold' });
      // what happened
      txt(sc, 730, 150, 'WHAT HAPPENED', 16, C.dim, { fontStyle: 'bold' });
      var inc = S.incidents.slice(0, 7);
      var lines = inc.length ? inc.map(function (i) { return 'Sol ' + i.sol + ': ' + i.text; }).join('\n') : 'No crises. Every system stayed balanced.';
      txt(sc, 730, 178, lines, 16, '#ecd9bf', { wordWrap: { width: 460 }, lineSpacing: 7 });
      // lessons
      txt(sc, 90, 506, 'WHAT MARS TAUGHT YOU', 16, C.dim, { fontStyle: 'bold' });
      txt(sc, 90, 532, sim.analysis(S).slice(0, 3).map(function (t) { return '-  ' + t; }).join('\n'), 17, '#ecd9bf', { wordWrap: { width: 720 }, lineSpacing: 5 });
      MB.button(sc, 860, 540, 330, 60, 'TRY AGAIN', function () { resetRun(sc, null); sc.registry.set('S', sim.create(S.siteKey, undefined, { mode: S.mode })); sc.scene.start('World'); }, { size: 24 });
      MB.button(sc, 860, 616, 330, 56, 'MAIN MENU', function () { sc.scene.start('Menu'); }, { size: 20, fill: C.panel2, hover: C.line });
    }
  }


  // ------------------------------------------------------------------ MISSION COMPLETE
  class CompleteScene extends Phaser.Scene {
    constructor() { super('Complete'); }
    init(d) { this.res = d || { stars: 1, q: 0 }; }
    create() {
      var sc = this, D = MB.MISSION1, stars = this.res.stars;
      MB.backdrop(sc, false);
      this.cameras.main.fadeIn(400);
      MB.panel(sc, 140, 30, 1000, 660, C.panel, C.green).setAlpha(0.96);
      txt(sc, 640, 52, 'MISSION COMPLETE', 58, '#b8e5a4', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      txt(sc, 640, 122, 'Mission 1: ' + D.title, 28, '#f0b34a', { fontStyle: 'bold' }).setOrigin(0.5, 0);
      // stars drawn as shapes (no font dependency)
      for (var i = 0; i < 3; i++) {
        (function (k) {
          var on = k < stars, st = sc.add.star(520 + k * 120, 218, 5, 22, 50, on ? 0xf0b34a : C.panel2).setStrokeStyle(4, on ? 0xffe9a8 : C.line).setScale(0);
          sc.tweens.add({ targets: st, scale: 1, angle: on ? 360 : 0, duration: 500, delay: 300 + k * 350, ease: 'Back.out', onStart: function () { if (on) MB.sfx.tone(600 + k * 150, 0.2, 'triangle', 0.07); } });
        })(i);
      }
      txt(sc, 640, 290, 'You cleaned the panels and brought the power back. The crew is safe!', 24, '#ecd9bf', { align: 'center', wordWrap: { width: 840 } }).setOrigin(0.5, 0);
      txt(sc, 190, 360, 'WHAT YOU LEARNED', 20, C.dim, { fontStyle: 'bold' });
      txt(sc, 190, 392, D.learned.map(function (t) { return '-  ' + t; }).join('\n'), 23, '#f6e8d2', { wordWrap: { width: 900 }, lineSpacing: 10 });
      txt(sc, 190, 560, 'Words to remember:  Sol = a Mars day.   Solar panel = turns sunlight into electricity.', 19, '#e6c9a3', { wordWrap: { width: 900 } });
      MB.button(sc, 190, 612, 330, 60, 'FREE PLAY', function () { sc.scene.start('Sites'); }, { size: 24 });
      MB.button(sc, 545, 612, 260, 60, 'REPLAY', function () {
        resetRun(sc, { id: 1, step: 'intro', seen: {} });
        sc.registry.set('S', sim.create('gale', 11, { mode: 'junior' }));
        sc.scene.start('World');
      }, { size: 24, fill: C.panel2, hover: C.line });
      MB.button(sc, 830, 612, 280, 60, 'MAIN MENU', function () { sc.scene.start('Menu'); }, { size: 24, fill: C.panel2, hover: C.line });
      MB.robot(sc, 1210, 640, 0.9);
    }
  }

  MB.scenes = [MenuScene, SitesScene, MB.WorldScene, PlanScene, MiniScene, RecapScene, EndScene, CompleteScene];
})();
