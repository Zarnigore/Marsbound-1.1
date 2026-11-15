// MARSBOUND - the five minigames. Each one calls done(q) once, q in 0..1.
// The scene gives them: sc (Phaser scene), A (play area), and sc.setTimer(fraction).
(function () {
  var MB = (window.MB = window.MB || {});
  var C = MB.C;
  var M = (MB.mini = {});
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rint(n) { return Math.floor(Math.random() * n); }

  // ---------------------------------------------------------------- POWER
  M.power = {
    title: 'Clean the solar panels',
    how: 'Press and drag your finger (or mouse) across the panels to wipe off the dust. Wind keeps blowing new dust on, so keep moving!',
    hint: 'Sweep back and forth, row by row, like painting.',
    start: function (sc, A, done) {
      var cols = 8, rows = 4, cw = 104, ch = 92, T = 18, t = 0, wind = 0, finished = false;
      var gx = A.x + (A.w - cols * cw) / 2, gy = A.y + 60;
      var cells = [], dusty = 0, total0 = 0, r, c;
      function addDust(cell) {
        var d = sc.add.rectangle(cell.x + 4, cell.y + 4, cw - 8, ch - 8, 0xd8a46a, 0.92).setOrigin(0, 0);
        cell.dust = d; dusty++;
      }
      for (r = 0; r < rows; r++) {
        for (c = 0; c < cols; c++) {
          var x = gx + c * cw, y = gy + r * ch;
          sc.add.rectangle(x + 4, y + 4, cw - 8, ch - 8, 0x2f5a9c).setOrigin(0, 0).setStrokeStyle(2, 0x9db8e0);
          sc.add.rectangle(x + cw / 2, y + 6, 2, ch - 12, 0x7da0d6, 0.6);
          sc.add.rectangle(x + 8, y + ch / 2, cw - 16, 2, 0x7da0d6, 0.6).setOrigin(0, 0.5);
          var cell = { x: x, y: y, dust: null };
          cells.push(cell);
          if (Math.random() < 0.7) { addDust(cell); total0++; }
        }
      }
      var brush = sc.add.circle(-50, -50, 26, 0xffffff, 0.15).setStrokeStyle(2, 0xffffff, 0.5);
      function hit(p) {
        brush.setPosition(p.x, p.y);
        var cc = Math.floor((p.x - gx) / cw), rr = Math.floor((p.y - gy) / ch);
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) return;
        var cell = cells[rr * cols + cc];
        if (cell.dust) {
          var d = cell.dust; cell.dust = null; dusty--;
          sc.tweens.add({ targets: d, alpha: 0, duration: 200, onComplete: function () { d.destroy(); } });
        }
      }
      sc.input.on('pointermove', function (p) { if (p.isDown) hit(p); });
      sc.input.on('pointerdown', hit);
      function q() { return clamp(1 - dusty / Math.max(1, total0), 0, 1); }
      sc.tick = function (dt) {
        if (finished) return;
        t += dt; wind += dt;
        if (wind > 1.0) {
          wind = 0;
          var clean = cells.filter(function (k) { return !k.dust; });
          if (clean.length) addDust(clean[rint(clean.length)]);
        }
        sc.setTimer(1 - t / T);
        if (dusty === 0) { finished = true; done(1); }
        else if (t >= T) { finished = true; done(q()); }
      };
    }
  };

  // ---------------------------------------------------------------- WATER
  M.water = {
    title: 'Fix the water pipes',
    hint: 'Start at the water on the left. Turn each pipe until it points to the next one.',
    how: 'Tap a pipe piece to turn it. Connect the water source on the left to the tank on the right. Faster is better.',
    start: function (sc, A, done) {
      var N = 1, E = 2, S = 4, W = 8, cols = 6, rows = 4, sz = 104, T = 35, t = 0, finished = false;
      var gx = A.x + (A.w - cols * sz) / 2, gy = A.y + 60;
      function rot(m) { return ((m << 1) | (m >> 3)) & 15; }
      var sr = rint(rows), er = rint(rows), seq = [], prev = sr, c, r;
      for (c = 0; c < cols; c++) {
        var nxt = c === cols - 1 ? er : rint(rows);
        var step = nxt >= prev ? 1 : -1;
        for (r = prev; r !== nxt + step; r += step) seq.push({ c: c, r: r });
        prev = nxt;
      }
      var grid = [];
      for (r = 0; r < rows; r++) { grid.push([]); for (c = 0; c < cols; c++) { var kinds = [5, 5, 3, 3, 3]; grid[r].push(kinds[rint(kinds.length)]); } }
      function dirBit(a, b) { return b.c < a.c ? W : b.c > a.c ? E : b.r < a.r ? N : S; }
      var targets = [];
      seq.forEach(function (cell, i) {
        var entry = i === 0 ? W : dirBit(cell, seq[i - 1]);
        var exit = i === seq.length - 1 ? E : dirBit(cell, seq[i + 1]);
        var m = entry | exit, k = rint(4);
        grid[cell.r][cell.c] = m;
        targets.push({ cell: cell, m: m, k: k });
      });
      targets.forEach(function (tg) { for (var i = 0; i < tg.k; i++) grid[tg.cell.r][tg.cell.c] = rot(grid[tg.cell.r][tg.cell.c]); });
      var g = sc.add.graphics();
      function reach() {
        var seen = {}, queue = [], maxC = -1;
        if (grid[sr][0] & W) { queue.push([0, sr]); seen['0,' + sr] = 1; }
        while (queue.length) {
          var cur = queue.shift(), cc = cur[0], rr = cur[1], m = grid[rr][cc];
          if (cc > maxC) maxC = cc;
          var tries = [[N, 0, -1, S], [E, 1, 0, W], [S, 0, 1, N], [W, -1, 0, E]];
          tries.forEach(function (d) {
            if (!(m & d[0])) return;
            var nc = cc + d[1], nr = rr + d[2];
            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) return;
            if (!(grid[nr][nc] & d[3]) || seen[nc + ',' + nr]) return;
            seen[nc + ',' + nr] = 1; queue.push([nc, nr]);
          });
        }
        var solved = !!seen[(cols - 1) + ',' + er] && !!(grid[er][cols - 1] & E);
        return { seen: seen, solved: solved, maxC: maxC };
      }
      function render() {
        var st = reach();
        g.clear();
        for (var rr = 0; rr < rows; rr++) {
          for (var cc = 0; cc < cols; cc++) {
            var x = gx + cc * sz, y = gy + rr * sz, m = grid[rr][cc], wet = st.seen[cc + ',' + rr];
            g.fillStyle(0x2e211c, 1); g.fillRect(x + 3, y + 3, sz - 6, sz - 6);
            g.lineStyle(14, wet ? 0x58b3a6 : 0x8a7a6c, 1);
            var cx = x + sz / 2, cy = y + sz / 2;
            [[N, 0, -sz / 2], [E, sz / 2, 0], [S, 0, sz / 2], [W, -sz / 2, 0]].forEach(function (d) {
              if (m & d[0]) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + d[1], cy + d[2]); g.strokePath(); }
            });
            g.fillStyle(wet ? 0x58b3a6 : 0x8a7a6c, 1); g.fillCircle(cx, cy, 9);
          }
        }
        // source and tank
        g.lineStyle(14, grid[sr][0] & W ? 0x58b3a6 : 0x8a7a6c, 1);
        g.beginPath(); g.moveTo(gx - 40, gy + sr * sz + sz / 2); g.lineTo(gx, gy + sr * sz + sz / 2); g.strokePath();
        g.fillStyle(0x5b8fd6, 1); g.fillRect(gx - 90, gy + sr * sz + sz / 2 - 26, 50, 52);
        g.lineStyle(14, st.solved ? 0x58b3a6 : 0x8a7a6c, 1);
        g.beginPath(); g.moveTo(gx + cols * sz, gy + er * sz + sz / 2); g.lineTo(gx + cols * sz + 40, gy + er * sz + sz / 2); g.strokePath();
        g.fillStyle(st.solved ? 0x58b3a6 : 0x4a3429, 1); g.fillRect(gx + cols * sz + 40, gy + er * sz + sz / 2 - 30, 56, 60);
        return st;
      }
      MB.txt(sc, gx - 90, gy + sr * sz + sz / 2 - 46, 'WATER', 14, C.text);
      MB.txt(sc, gx + cols * sz + 38, gy + er * sz + sz / 2 - 50, 'TANK', 14, C.text);
      render();
      sc.input.on('pointerdown', function (p) {
        if (finished) return;
        var cc = Math.floor((p.x - gx) / sz), rr = Math.floor((p.y - gy) / sz);
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) return;
        grid[rr][cc] = rot(grid[rr][cc]);
        var st = render();
        if (st.solved) { finished = true; done(clamp(0.6 + 0.4 * (1 - t / T), 0.6, 1)); }
      });
      // test hook: rotates every pipe to its intended position (used by tests/browser_test.py)
      sc.debugSolve = function () {
        targets.forEach(function (tg) { var n = 0; while (grid[tg.cell.r][tg.cell.c] !== tg.m && n++ < 4) grid[tg.cell.r][tg.cell.c] = rot(grid[tg.cell.r][tg.cell.c]); });
        var st = render();
        if (st.solved && !finished) { finished = true; done(1); }
        return st.solved;
      };
      sc.tick = function (dt) {
        if (finished) return;
        t += dt; sc.setTimer(1 - t / T);
        if (t >= T) { finished = true; var st = reach(); done(clamp(0.4 * (st.maxC + 1) / cols, 0.05, 0.4)); }
      };
    }
  };

  // ---------------------------------------------------------------- FOOD
  M.food = {
    title: 'Tend the greenhouse',
    hint: 'Wait for the marker to pass the green zone, then tap.',
    how: 'Plants need light, then water, then light again... Tap (or press SPACE) when the moving marker is inside the green zone. 5 plants, closer to the middle is better.',
    start: function (sc, A, done) {
      var rounds = 5, round = 0, tx = A.x + 150, tw = 700, ty = A.y + 90, th = 46, scores = [], finished = false, gate = 0;
      sc.add.rectangle(tx, ty, tw, th, C.ink).setOrigin(0, 0).setStrokeStyle(2, C.line);
      var zw, zx, zone = sc.add.rectangle(0, ty + 3, 10, th - 6, 0x7fbf6a, 0.9).setOrigin(0, 0);
      var mark = sc.add.rectangle(tx, ty - 8, 8, th + 16, 0xfff4e4).setOrigin(0.5, 0);
      var cap = MB.txt(sc, A.x + A.w / 2, ty - 50, '', 28, '#ecd9bf', { fontStyle: 'bold' }).setOrigin(0.5);
      var mx = tx, dir = 1, speed;
      // trays
      var pots = [];
      for (var i = 0; i < rounds; i++) {
        var px = A.x + 120 + i * 170;
        sc.add.rectangle(px - 55, A.y + 390, 110, 48, 0x8a4f2c).setOrigin(0, 0).setStrokeStyle(2, 0x3b2214);
        sc.add.rectangle(px - 55, A.y + 390, 110, 12, 0x3b2214).setOrigin(0, 0);
        pots.push(px);
      }
      function setup() {
        zw = 170 - round * 22; zx = tx + 30 + rint(tw - zw - 60);
        zone.setPosition(zx, ty + 3); zone.width = zw;
        speed = 420 + round * 90;
        cap.setText('Plant ' + (round + 1) + ' of ' + rounds + ':  ' + (round % 2 === 0 ? 'give it LIGHT' : 'give it WATER'));
        gate = 0.35;
      }
      function grow(i, s) {
        var px = pots[i], h = 20 + s * 110, col = s > 0.7 ? 0x7fbf6a : s > 0.4 ? 0xb9c25a : 0xa08a4a;
        var stem = sc.add.rectangle(px, A.y + 390, 6, 1, col).setOrigin(0.5, 1);
        sc.tweens.add({ targets: stem, height: h, duration: 400 });
        sc.time.delayedCall(300, function () {
          var n = Math.max(1, Math.round(s * 4));
          for (var k = 0; k < n; k++) sc.add.ellipse(px + (k % 2 ? 16 : -16), A.y + 390 - h * (0.45 + 0.15 * k), 26, 14, col).setAngle(k % 2 ? -25 : 25);
        });
      }
      function press() {
        if (finished || gate > 0) return;
        var d = Math.abs(mx - (zx + zw / 2)), half = zw / 2, s;
        s = d <= half ? 1 - 0.5 * d / half : clamp(0.25 - (d - half) / 400, 0, 0.25);
        scores.push(s); grow(round, s);
        var fb = MB.txt(sc, mx, ty + 70, s > 0.8 ? 'Perfect!' : s > 0.5 ? 'Good' : s > 0.2 ? 'Meh' : 'Missed', 22, s > 0.5 ? C.good : C.bad).setOrigin(0.5);
        sc.tweens.add({ targets: fb, alpha: 0, y: fb.y - 20, duration: 700 });
        round++;
        if (round >= rounds) {
          finished = true;
          var avg = scores.reduce(function (a, b) { return a + b; }, 0) / rounds;
          sc.time.delayedCall(900, function () { done(avg); });
        } else setup();
      }
      sc.input.on('pointerdown', press);
      sc.input.keyboard.on('keydown-SPACE', press);
      setup();
      sc.tick = function (dt) {
        if (finished) return;
        gate -= dt;
        mx += dir * speed * dt;
        if (mx > tx + tw) { mx = tx + tw; dir = -1; }
        if (mx < tx) { mx = tx; dir = 1; }
        mark.x = mx;
      };
    }
  };

  // ---------------------------------------------------------------- LIFE
  M.life = {
    title: 'Balance the air',
    hint: 'Hold ADD when the needle is too low, VENT when it is too high.',
    how: 'Oxygen and CO2 keep drifting. Hold the ADD and VENT buttons to push each needle back into the green band and keep it there.',
    start: function (sc, A, done) {
      var T = 22, t = 0, finished = false, gh = 320, gw = 90, top = A.y + 50;
      var gauges = [
        { name: 'OXYGEN', x: A.x + 260, v: 0.5, vel: 0, bias: -0.07, dir: 0, tin: 0, col: C.teal },
        { name: 'CO2', x: A.x + 650, v: 0.5, vel: 0, bias: 0.09, dir: 0, tin: 0, col: C.amber }
      ];
      var lo = 0.38, hi = 0.62;
      gauges.forEach(function (g) {
        sc.add.rectangle(g.x, top, gw, gh, C.ink).setOrigin(0, 0).setStrokeStyle(3, C.line);
        g.band = sc.add.rectangle(g.x + 3, top + gh * (1 - hi), gw - 6, gh * (hi - lo), 0x7fbf6a, 0.35).setOrigin(0, 0);
        g.needle = sc.add.rectangle(g.x - 14, top, gw + 28, 8, g.col).setOrigin(0, 0.5);
        MB.txt(sc, g.x + gw / 2, top + gh + 14, g.name, 22, C.text, { fontStyle: 'bold' }).setOrigin(0.5, 0);
        MB.txt(sc, g.x - 12, top + gh * (1 - (lo + hi) / 2), 'GOOD', 14, '#9fd68b', { fontStyle: 'bold' }).setOrigin(1, 0.5);
        function mk(label, y, d) {
          var b = sc.add.rectangle(g.x + gw + 30, y, 120, 56, C.panel2).setOrigin(0, 0).setStrokeStyle(2, g.col);
          MB.txt(sc, g.x + gw + 90, y + 28, label, 22, C.text, { fontStyle: 'bold' }).setOrigin(0.5);
          b.setInteractive({ useHandCursor: true });
          b.on('pointerdown', function () { g.dir = d; b.setFillStyle(C.line); });
          var up = function () { if (g.dir === d) g.dir = 0; b.setFillStyle(C.panel2); };
          b.on('pointerup', up); b.on('pointerout', up);
        }
        mk('ADD +', top + 70, 1); mk('VENT -', top + 170, -1);
      });
      var kb = sc.input.keyboard;
      kb.on('keydown-W', function () { gauges[0].dir = 1; }); kb.on('keydown-S', function () { gauges[0].dir = -1; });
      kb.on('keyup-W', function () { gauges[0].dir = 0; }); kb.on('keyup-S', function () { gauges[0].dir = 0; });
      kb.on('keydown-UP', function () { gauges[1].dir = 1; }); kb.on('keydown-DOWN', function () { gauges[1].dir = -1; });
      kb.on('keyup-UP', function () { gauges[1].dir = 0; }); kb.on('keyup-DOWN', function () { gauges[1].dir = 0; });
      sc.tick = function (dt) {
        if (finished) return;
        t += dt; sc.setTimer(1 - t / T);
        gauges.forEach(function (g) {
          g.vel += ((Math.random() - 0.5) * 1.6 + g.bias) * dt - 0.5 * g.vel * dt;
          g.v += g.vel * dt + g.dir * 0.48 * dt;
          if (g.v < 0) { g.v = 0; g.vel = 0; } if (g.v > 1) { g.v = 1; g.vel = 0; }
          var ok = g.v >= lo && g.v <= hi;
          if (ok) g.tin += dt;
          g.needle.y = top + gh * (1 - g.v);
          g.needle.setFillStyle(ok ? C.green : C.red);
        });
        if (t >= T) { finished = true; done(clamp((gauges[0].tin + gauges[1].tin) / (2 * T), 0, 1)); }
      };
    }
  };

  // ---------------------------------------------------------------- SHIELD
  M.shield = {
    title: 'Stack the regolith wall',
    hint: 'Tap just when the swinging bag is right above the bag below.',
    how: 'Tap (or press SPACE) to drop each bag of Martian soil. Line it up with the bag below. A bag that lands off to the side falls off the wall. 6 bags.',
    start: function (sc, A, done) {
      var drops = 6, n = 0, stacked = 0, scores = [], state = 'swing', finished = false;
      var bw = 130, bh = 36, x0 = A.x + A.w / 2 + 60, ground = A.y + A.h - 24, prevX = x0, cx = x0, dir = 1, speed = 270;
      // habitat to protect
      sc.add.ellipse(A.x + 190, ground, 300, 230, 0xbfc3c8).setOrigin(0.5, 1).setStrokeStyle(3, 0x120d0b);
      sc.add.rectangle(A.x + 190, ground, 300, 20, 0x9aa0a6).setOrigin(0.5, 1);
      MB.txt(sc, A.x + 190, ground - 90, 'HABITAT', 20, '#2b1c16', { fontStyle: 'bold' }).setOrigin(0.5);
      sc.add.rectangle(x0, ground + 4, 520, 10, 0x4a2a1a).setOrigin(0.5, 0);
      sc.add.rectangle(x0, A.y + 14, 700, 6, 0x6b6b6b).setOrigin(0.5, 0);
      var bag = null;
      function newBag() { bag = sc.add.rectangle(cx, A.y + 50, bw, bh, 0xa9693a).setStrokeStyle(3, 0x3b2214); }
      newBag();
      function drop() {
        if (state !== 'swing' || finished) return;
        state = 'fall';
        var target = ground - stacked * bh - bh / 2, off = Math.abs(bag.x - prevX), b = bag, ok = off <= bw * 0.85;
        if (ok) {
          sc.tweens.add({ targets: b, y: target, duration: 380, ease: 'Quad.in', onComplete: function () { next(clamp(1 - off / (bw * 0.85), 0, 1), true, b); } });
        } else {
          sc.tweens.add({ targets: b, y: ground + 120, x: b.x + (b.x > prevX ? 80 : -80), angle: 40, alpha: 0, duration: 650, ease: 'Quad.in', onComplete: function () { b.destroy(); next(0, false, null); } });
        }
      }
      function next(s, ok, b) {
        scores.push(s); n++;
        if (ok) { stacked++; prevX = b.x; }
        var fb = MB.txt(sc, cx, A.y + 90, s > 0.85 ? 'Perfect!' : ok ? 'Wobbly' : 'It fell off!', 24, ok ? C.good : C.bad).setOrigin(0.5);
        sc.tweens.add({ targets: fb, alpha: 0, y: fb.y - 24, duration: 800 });
        if (n >= drops) {
          finished = true;
          var avg = scores.reduce(function (a, c) { return a + c; }, 0) / drops;
          sc.time.delayedCall(800, function () { done(avg); });
        } else { speed += 55; state = 'swing'; newBag(); }
      }
      sc.input.on('pointerdown', drop);
      sc.input.keyboard.on('keydown-SPACE', drop);
      sc.tick = function (dt) {
        if (finished || state !== 'swing') return;
        cx += dir * speed * dt;
        if (cx > x0 + 320) { cx = x0 + 320; dir = -1; } if (cx < x0 - 320) { cx = x0 - 320; dir = 1; }
        bag.x = cx;
      };
    }
  };
})();
