// Balance test: run bots through 30 sols. Usage: node tests/bots.js [runs] [junior]
require('../src/data.js');
require('../src/sim.js');
var MB = globalThis.MB, sim = MB.sim, CFG = MB.CFG;

function rnd(seed) { var a = seed; return function () { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

var policies = {
  idle: function () { return null; },
  random: function (S, r) {
    var keys = Object.keys(CFG.actions).filter(function (k) { return sim.canAct(S, k).ok; });
    if (!keys.length) return null;
    return { key: keys[Math.floor(r() * keys.length)], q: 0.3 + r() * 0.5 };
  },
  skilled: function (S, r) {
    var f = sim.forecast(S);
    var stormSoon = f.some(function (x) { return x.ev === 'dust'; });
    var flare = f[0] && f[0].ev === 'flare';
    var w = { power: 1.0, water: 1.0, food: 1.0, life: 1.25, shield: 0.9 };
    if (stormSoon) w.power += 0.5;
    if (flare) w.shield += 2.5;
    if (S.res.power < 25) w.power += 0.6;
    var best = null, bestScore = 20;
    Object.keys(CFG.actions).forEach(function (k) {
      if (!sim.canAct(S, k).ok) return;
      var sc = (100 - S.cond[k]) * w[k];
      if (k === 'life') sc += Math.max(0, 40 - S.res.oxygen);
      if (k === 'water') sc += Math.max(0, 40 - S.res.water);
      if (k === 'food') sc += Math.max(0, 40 - S.res.food);
      if (sc > bestScore) { bestScore = sc; best = k; }
    });
    return best ? { key: best, q: Math.min(1, 0.65 + r() * 0.3) } : null;
  }
};

function run(policy, site, seed) {
  var S = sim.create(site, seed, { mode: MODE }), r = rnd(seed + 7), guard = 0;
  var deathSols = [];
  while (!S.over && guard++ < 200) {
    var act, tries = 0;
    while ((act = policies[policy](S, r)) && tries++ < 6) sim.applyAction(S, act.key, act.q);
    var rep = sim.endSol(S);
    rep.deaths.forEach(function () { deathSols.push(rep.sol); });
  }
  return { win: S.over === 'win', sols: S.history.length, alive: sim.aliveCount(S), deathSols: deathSols };
}

var MODE = process.argv[3] === 'junior' ? 'junior' : 'classic';
console.log('mode:', MODE);
var N = parseInt(process.argv[2] || '200', 10);
Object.keys(policies).forEach(function (p) {
  ['gale', 'jezero', 'hellas'].forEach(function (site) {
    var wins = 0, solsSum = 0, aliveSum = 0, firstDeath = [], spread = 0, nd = 0;
    for (var i = 0; i < N; i++) {
      var res = run(p, site, 1000 + i);
      if (res.win) wins++;
      solsSum += res.sols; aliveSum += res.alive;
      if (res.deathSols.length) { firstDeath.push(res.deathSols[0]); }
      if (res.deathSols.length > 1) { spread += res.deathSols[res.deathSols.length - 1] - res.deathSols[0]; nd++; }
    }
    var fd = firstDeath.length ? (firstDeath.reduce(function (a, b) { return a + b; }, 0) / firstDeath.length).toFixed(1) : '-';
    console.log((p + '      ').slice(0, 8) + (site + '       ').slice(0, 8) + ' win ' + ((wins / N) * 100).toFixed(0).padStart(3) + '%  avg sols ' + (solsSum / N).toFixed(1).padStart(5) + '  avg crew alive ' + (aliveSum / N).toFixed(2) + '  first death sol ' + fd + '  death spread ' + (nd ? (spread / nd).toFixed(1) : '-'));
  });
});
