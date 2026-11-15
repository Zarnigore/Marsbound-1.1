// MARSBOUND - pure simulation (no Phaser). Runs in browser and in Node (for bot balance tests).
(function () {
  'use strict';
  var G = typeof window !== 'undefined' ? window : globalThis;
  var MB = (G.MB = G.MB || {});

  var CFG = (MB.CFG = {
    sols: 30,
    crewNames: ['Amira', 'Kenji', 'Sofia', 'Timur'],
    resil: [1.0, 0.7, 1.5, 0.85],
    hoursPerCrew: 2,
    start: { power: 75, water: 70, food: 70, oxygen: 75, cond: { power: 80, water: 78, food: 75, life: 78, shield: 25 } },
    actions: {
      power:  { name: 'Clean solar panels',  short: 'Solar panels',   hours: 2, power: 3, gain: 38 },
      water:  { name: 'Fix water recycler',  short: 'Water recycler', hours: 2, power: 5, gain: 34 },
      food:   { name: 'Tend greenhouse',     short: 'Greenhouse',     hours: 2, power: 5, gain: 34 },
      life:   { name: 'Balance the air',     short: 'Air scrubbers',  hours: 2, power: 5, gain: 34 },
      shield: { name: 'Stack regolith wall', short: 'Regolith shield', hours: 3, power: 8, gain: 30 }
    },
    decay: { panelBase: 2.5, panelTau: 4.0, water: 8.5, food: 9, life: 8.5, shield: 3.5, shieldDust: 3, shieldFlare: 5 },
    solarMax: 74, baseLoad: 9, perCrewLoad: 2, subLoad: 5, heatBase: 3, heatPerDeg: 1.0,
    waterUse: 3.0, waterRec: 2.9, foodUse: 2.8, foodProd: 3.2, o2Use: 2.6, o2Prod: 3.0,
    baseDose: 0.67, shieldMax: 0.78, radFree: 0.22, radDmg: 6,
    juniorDmg: 0.45
  });

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r0(v) { return Math.round(v); }
  var PRIO = { flare: 4, dust: 3, cold: 2, gust: 1 };

  function buildWeather(site, rand) {
    var w = [], i;
    for (i = 0; i < CFG.sols; i++) {
      w.push({ tau: site.tau + (rand() - 0.5) * 0.12, tmin: site.tmin + (rand() - 0.5) * 6, rad: (1 + (rand() - 0.5) * 0.15) * site.radMod, gust: false, ev: null });
    }
    site.schedule.forEach(function (e) {
      var start = clamp(e.s + Math.round((rand() - 0.5) * 3), 2, CFG.sols - e.len + 1);
      for (var k = 0; k < e.len; k++) {
        var x = w[start + k - 1];
        if (!x) continue;
        if (e.t === 'dust') x.tau += e.mag * 2.0 * Math.sin(Math.PI * (k + 0.5) / e.len) + 0.35;
        if (e.t === 'cold') x.tmin -= 14;
        if (e.t === 'flare') x.rad *= 6.5;
        if (e.t === 'gust') x.gust = true;
        if (!x.ev || PRIO[e.t] > PRIO[x.ev]) x.ev = e.t;
      }
    });
    return w;
  }

  // opts.mode === 'junior' makes the crew tougher (less damage per sol) so a mistake is a lesson, not game over.
  function create(siteKey, seed, opts) {
    opts = opts || {};
    seed = seed == null ? Date.now() : seed;
    var site = MB.SITES[siteKey];
    var rand = rng(seed);
    var S = {
      siteKey: siteKey, site: site, seed: seed, sol: 1, over: null, mode: opts.mode || 'classic', dmgScale: opts.mode === 'junior' ? CFG.juniorDmg : 1,
      res: { power: CFG.start.power, water: CFG.start.water, food: CFG.start.food, oxygen: CFG.start.oxygen },
      cond: JSON.parse(JSON.stringify(CFG.start.cond)),
      crew: CFG.crewNames.map(function (n, i) { return { name: n, hp: 100, dose: 0, resil: CFG.resil[i], alive: true, lostSol: null, cause: null }; }),
      weather: buildWeather(site, rand),
      hoursUsed: 0, done: {}, history: [], incidents: [], flags: {}, lastQ: {}
    };
    S.hoursMax = hoursMax(S);
    return S;
  }

  function aliveCount(S) { return S.crew.filter(function (c) { return c.alive; }).length; }
  function hoursMax(S) { return aliveCount(S) * CFG.hoursPerCrew; }
  function hoursLeft(S) { return S.hoursMax - S.hoursUsed; }

  function canAct(S, key) {
    var a = CFG.actions[key];
    if (S.over) return { ok: false, why: 'The mission is over.' };
    if (S.done[key]) return { ok: false, why: 'Already done this sol.' };
    if (hoursLeft(S) < a.hours) return { ok: false, why: 'Not enough crew-hours left.' };
    if (S.res.power < a.power) return { ok: false, why: 'Not enough battery power.' };
    return { ok: true };
  }

  // Performance (q 0..1) changes the result, it is not pass/fail.
  function applyAction(S, key, q) {
    var a = CFG.actions[key];
    var m = 0.5 + 0.6 * q;
    S.hoursUsed += a.hours;
    S.res.power = Math.max(0, S.res.power - a.power);
    S.cond[key] = clamp(S.cond[key] + a.gain * m, 0, 100);
    if (key === 'water') S.res.water = clamp(S.res.water + 6 * m, 0, 100);
    if (key === 'food') S.res.food = clamp(S.res.food + 5 * m, 0, 100);
    if (key === 'life') S.res.oxygen = clamp(S.res.oxygen + 4 * m, 0, 100);
    S.done[key] = true;
    S.lastQ[key] = q;
    return { gain: r0(a.gain * m), m: m };
  }

  function forecast(S) {
    var out = [];
    for (var k = 0; k < 3; k++) {
      var w = S.weather[S.sol - 1 + k];
      if (!w) break;
      var ev = w.ev;
      if (ev === 'flare' && k > 0) ev = null; // space weather is only seen about one sol ahead
      out.push({ sol: S.sol + k, ev: ev, tau: w.tau });
    }
    return out;
  }

  function advice(S) {
    var f = forecast(S), i, cfg = CFG.actions;
    var alive = aliveCount(S);
    if (f[0] && f[0].ev === 'flare') return 'Radiation burst today! The regolith wall is your armour.';
    for (i = 0; i < f.length; i++) {
      if (f[i].ev === 'dust') return i === 0 ? 'Dust storm now. Panels will make very little power. Save the battery.' : 'Dust storm in ' + i + ' sol' + (i > 1 ? 's' : '') + '. Charge up and fill the stores first.';
      if (f[i].ev === 'cold') return i === 0 ? 'A deep cold night. Heaters will drain the battery.' : 'Cold night coming. Keep the battery healthy.';
    }
    if (S.res.oxygen < 30) return 'Oxygen is low. Fix the air scrubbers first.';
    if (S.res.water < 25) return 'Water is running low. Fix the recycler.';
    if (S.res.food < 25) return 'Food is running low. Tend the greenhouse.';
    if (S.res.power < 25) return 'Battery is low. Clean the panels and spend less.';
    var worst = null;
    Object.keys(S.cond).forEach(function (k) { if (!worst || S.cond[k] < S.cond[worst]) worst = k; });
    if (S.cond[worst] < 45) return 'The ' + cfg[worst].short.toLowerCase() + ' is in bad shape. Fix it before it fails.';
    if (alive < 4) return 'Fewer crew means fewer crew-hours. Protect the ones you have.';
    return 'All steady. You cannot do everything each sol, so choose what matters most.';
  }

  function incident(S, text, kind) { S.incidents.push({ sol: S.sol, text: text, kind: kind }); }

  function endSol(S) {
    var C = CFG, w = S.weather[S.sol - 1], alive = aliveCount(S), lines = [], deaths = [];
    var before = { power: S.res.power, water: S.res.water, food: S.res.food, oxygen: S.res.oxygen };
    var dustWord = w.tau > 1.8 ? 'thick dust' : w.tau > 1.0 ? 'dusty air' : 'clear air';

    // wear and tear
    S.cond.power = clamp(S.cond.power - (C.decay.panelBase + w.tau * C.decay.panelTau), 0, 100);
    S.cond.water = clamp(S.cond.water - C.decay.water, 0, 100);
    S.cond.food = clamp(S.cond.food - C.decay.food, 0, 100);
    S.cond.life = clamp(S.cond.life - C.decay.life, 0, 100);
    S.cond.shield = clamp(S.cond.shield - C.decay.shield - (w.ev === 'dust' ? C.decay.shieldDust : 0) - (w.ev === 'flare' ? C.decay.shieldFlare : 0), 0, 100);
    if (w.gust) { S.cond.power = clamp(S.cond.power + 16, 0, 100); }

    // power
    var dustMult = clamp(1 - (w.tau - 0.5) * 0.4, 0.18, 1);
    var solar = C.solarMax * (S.cond.power / 100) * dustMult;
    var heat = C.heatBase + Math.max(0, -w.tmin - 70) * C.heatPerDeg;
    var used = C.baseLoad + C.perCrewLoad * alive + C.subLoad * 3 + heat;
    var batt = S.res.power + solar - used;
    var blackout = batt <= 0;
    S.res.power = clamp(batt, 0, 100);
    var pOK = blackout ? 0.15 : (S.res.power < 12 ? 0.6 : 1);
    var powerWhy = 'Sun gave +' + r0(solar) + ' (' + dustWord + ', panels ' + r0(S.cond.power) + '%). Base used -' + r0(used) + (heat > 12 ? ' incl. heaters' : '') + '.';
    lines.push({ k: 'power', text: powerWhy, from: before.power, to: S.res.power, bad: S.res.power < before.power - 10 });
    if (blackout && !S.flags.blackoutPrev) { incident(S, 'Blackout. The battery hit zero and every system slowed to a crawl.', 'power'); }
    S.flags.blackoutPrev = blackout;

    // water / food / oxygen
    var effW = (S.cond.water / 100) * pOK, effF = (S.cond.food / 100) * pOK, effL = (S.cond.life / 100) * pOK;
    var wUse = C.waterUse * alive, wRec = C.waterRec * alive * effW;
    S.res.water = clamp(S.res.water - wUse + wRec, 0, 100);
    var fUse = C.foodUse * alive, fProd = C.foodProd * alive * effF * (S.res.water > 10 ? 1 : 0.5);
    S.res.food = clamp(S.res.food - fUse + fProd, 0, 100);
    var oUse = C.o2Use * alive, oProd = C.o2Prod * alive * effL;
    S.res.oxygen = clamp(S.res.oxygen - oUse + oProd, 0, 100);

    lines.push({ k: 'water', text: 'Crew drank -' + r0(wUse) + ', recycler gave back +' + r0(wRec) + ' (' + r0(S.cond.water) + '% working' + (blackout ? ', no power' : '') + ').', from: before.water, to: S.res.water, bad: S.res.water < before.water - 8 });
    lines.push({ k: 'food', text: 'Crew ate -' + r0(fUse) + ', greenhouse grew +' + r0(fProd) + (S.res.water <= 10 ? ' (too little water)' : '') + '.', from: before.food, to: S.res.food, bad: S.res.food < before.food - 8 });
    lines.push({ k: 'oxygen', text: 'Crew breathed -' + r0(oUse) + ', scrubbers made +' + r0(oProd) + ' (' + r0(S.cond.life) + '% working).', from: before.oxygen, to: S.res.oxygen, bad: S.res.oxygen < before.oxygen - 8 });

    ['oxygen', 'water', 'food'].forEach(function (k) {
      if (S.res[k] <= 0 && !S.flags[k + '0']) {
        S.flags[k + '0'] = true;
        incident(S, { oxygen: 'Oxygen ran out.', water: 'The water tanks ran dry.', food: 'The food stores ran out.' }[k], k);
      }
    });

    // radiation
    var dose = C.baseDose * w.rad * (1 - C.shieldMax * S.cond.shield / 100);
    var rawDose = C.baseDose * w.rad;
    lines.push({ k: 'shield', text: 'Radiation outside: ' + r1(rawDose) + ' mSv. Wall at ' + r0(S.cond.shield) + '% cut it to ' + r1(dose) + '.', from: null, to: null, bad: dose > 1.2 });
    if (w.ev === 'flare' && dose > 1.2) incident(S, 'A radiation burst hit while the wall was too thin (' + r0(S.cond.shield) + '%).', 'radiation');

    // crew
    S.crew.forEach(function (c) {
      if (!c.alive) return;
      var parts = { oxygen: 0, water: 0, food: 0, radiation: 0, cold: 0 };
      if (S.res.oxygen <= 0) parts.oxygen = 22; else if (S.res.oxygen < 15) parts.oxygen = 6;
      if (S.res.water <= 0) parts.water = 11; else if (S.res.water < 12) parts.water = 3;
      if (S.res.food <= 0) parts.food = 7; else if (S.res.food < 12) parts.food = 2;
      parts.radiation = Math.max(0, dose - C.radFree) * C.radDmg;
      if (blackout) parts.cold = 4;
      var total = 0, worst = 'radiation', k;
      for (k in parts) { total += parts[k]; if (parts[k] > parts[worst]) worst = k; }
      total = total / c.resil * S.dmgScale;
      c.dose += dose;
      if (total > 0.5) c.hp = clamp(c.hp - total, 0, 100); else c.hp = clamp(c.hp + 3, 0, 100);
      if (c.hp <= 0) {
        c.alive = false; c.lostSol = S.sol;
        c.cause = { oxygen: 'low oxygen', water: 'not enough water', food: 'not enough food', radiation: 'radiation sickness', cold: 'the cold during the blackout' }[worst];
        deaths.push({ name: c.name, cause: c.cause });
        incident(S, c.name + ' got too sick to work and flew home (' + c.cause + ').', 'crew');
      }
    });

    S.history.push({ sol: S.sol, power: S.res.power, water: S.res.water, food: S.res.food, oxygen: S.res.oxygen, alive: aliveCount(S) });

    var report = { sol: S.sol, ev: w.ev || 'calm', lines: lines, deaths: deaths, blackout: blackout, tau: w.tau, tmin: w.tmin };

    // next sol or end
    if (aliveCount(S) === 0) { S.over = 'dead'; }
    else if (S.sol >= C.sols) { S.over = 'win'; }
    else {
      S.sol++;
      S.hoursMax = hoursMax(S);
      S.hoursUsed = 0;
      S.done = {};
    }
    report.over = S.over;
    return report;
  }

  // Mission 1 set-up: a dust storm has just buried the panels and the battery is nearly flat.
  function missionStorm(S) {
    S.cond.power = 10; S.res.power = 6;
    S.weather[0].ev = 'dust'; S.weather[0].tau = 2.2;
    return S;
  }
  // Mission 1 pay-off: clean panels let the sun charge the battery again (q = minigame quality 0..1).
  function missionRecharge(S, q) {
    var gain = 30 + 40 * q;
    S.res.power = clamp(S.res.power + gain, 0, 100);
    S.cond.power = clamp(Math.max(S.cond.power, 60 + 40 * q), 0, 100); // a good wipe leaves the panels visibly clean
    return gain;
  }

  // Takeaways for the end screen (what happened and why).
  function analysis(S) {
    var out = [], kinds = {};
    S.incidents.forEach(function (i) { kinds[i.kind] = (kinds[i.kind] || 0) + 1; });
    var tips = {
      power: 'Power runs everything. Dust storms cut solar output, so the battery has to be full BEFORE the storm arrives.',
      oxygen: 'Air scrubbers need power. When the battery dies, oxygen production almost stops.',
      water: 'Recycling water saves the crew. A broken recycler drains the tanks within days.',
      food: 'Plants need light, water and power together. If one fails, the harvest falls.',
      radiation: 'Mars has no magnetic shield. A thick regolith wall is the cheapest armour against radiation bursts.',
      crew: 'Every lost crew member removes crew-hours, so the base can do less each sol.'
    };
    Object.keys(tips).forEach(function (k) { if (kinds[k]) out.push(tips[k]); });
    if (!out.length) out.push('No major failures. The colony kept every system balanced.');
    return out;
  }

  MB.sim = { create: create, missionStorm: missionStorm, missionRecharge: missionRecharge, canAct: canAct, applyAction: applyAction, endSol: endSol, forecast: forecast, advice: advice, analysis: analysis, aliveCount: aliveCount, hoursLeft: hoursLeft, hoursMax: hoursMax };
  if (typeof module !== 'undefined') module.exports = MB;
})();
