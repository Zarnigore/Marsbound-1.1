// MARSBOUND - data-driven mission engine for Missions 2-10 (goal -> predict -> do -> see -> why -> reward).
(function () {
  var MB = (window.MB = window.MB || {});
  var sim = MB.sim;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var RESMAP = { power: 'power', water: 'water', food: 'food', life: 'oxygen' };

  // Each mission is plain data. crisis(S) sets the problem. tasks = station keys to repair, in order.
  // opts[i].ok marks the best answer. hoursLeft limits crew-hours so choices cost something.
  MB.MISSIONS = {
    2: { title: 'Thirsty Base', learns: 'Water recycling', trade: 'Power vs water', lesson: 'water', visual: 'flicker',
      tasks: ['water'], hoursLeft: 4, crisis: function (S) { S.cond.water = 12; S.res.water = 14; },
      intro: ['Mission 2: Thirsty Base. Our water tank is almost empty!', 'The crew drinks, cooks and grows plants with water. We cannot just fetch more on Mars.'],
      alarm: ['Uh-oh! The water recycler is clogged and the tank is nearly dry.'],
      q: 'What should we fix first?', opts: [{ t: 'Recycler', ok: 1 }, { t: 'Solar panels' }, { t: 'Stone wall' }],
      hint: 'We need water, and the machine that cleans old water is the recycler.',
      good: 'Yes! Recycling is the way to get water on Mars.',
      why: ['The recycler cleans used water so we can drink it again.', 'Recycling is cheaper than carrying water from Earth. Every drop counts!'],
      learned: ['Water on Mars is precious, so we recycle almost all of it.', 'A broken recycler drains the tank in a few days.', 'Fix water early, before it runs out.'] },
    3: { title: 'First Harvest', learns: 'Food and light', trade: 'Water and power vs food', lesson: 'food', visual: 'flicker',
      tasks: ['water', 'food'], hoursLeft: 4, crisis: function (S) { S.cond.water = 30; S.cond.food = 10; S.res.food = 18; S.res.water = 35; },
      intro: ['Mission 3: First Harvest. The plants are drooping and food is running low.', 'Plants need light, water and power. If one is missing, they stop growing.'],
      alarm: ['The greenhouse is weak and water is low too. We only have time for two jobs!'],
      q: 'What helps plants grow?', opts: [{ t: 'Water and light', ok: 1 }, { t: 'More dust' }, { t: 'Cold air' }],
      hint: 'Plants on Earth need water and light. Mars plants are the same!',
      good: 'Right! First water, then tend the plants.',
      why: ['Plants turn light and water into food and fresh air.', 'But the greenhouse also uses power. Everything is connected!'],
      learned: ['Plants need light, water and power to grow.', 'Plants give food and fresh air to the crew.', 'Fix the water first, then the plants can use it.'] },
    4: { title: 'Breathe Easy', learns: 'Air (CO2 and O2)', trade: 'Power vs air', lesson: 'life', visual: 'flicker',
      tasks: ['life'], hoursLeft: 4, crisis: function (S) { S.cond.life = 10; S.res.oxygen = 22; },
      intro: ['Mission 4: Breathe Easy. The air in the base feels stuffy.', 'We breathe out CO2. The air scrubbers take CO2 out and keep oxygen safe.'],
      alarm: ['Warning! The air scrubbers are slowing down and oxygen is dropping.'],
      q: 'What do we breathe out?', opts: [{ t: 'CO2', ok: 1 }, { t: 'Water' }, { t: 'Dust' }],
      hint: 'Plants love it, but too much CO2 in a room is not good for us.',
      good: 'Correct! CO2 builds up, so we must clean the air.',
      why: ['Scrubbers remove CO2 and the plants add oxygen.', 'Scrubbers need power, so power and air are linked.'],
      learned: ['People breathe out CO2. Too much is dangerous.', 'Air scrubbers clean the air but need power.', 'Plants help make oxygen too.'] },
    5: { title: 'Solar Flare Warning', learns: 'Radiation shield', trade: 'Shield work vs everything else', lesson: 'shield', visual: 'flare',
      tasks: ['shield'], hoursLeft: 4, crisis: function (S) { S.cond.shield = 8; S.weather[0].ev = 'flare'; },
      intro: ['Mission 5: Solar Flare Warning. The Sun is sending a burst of radiation!', 'Mars has no magnetic shield like Earth. We need thick walls.'],
      alarm: ['ALERT! A radiation burst is coming and our wall is too thin.'],
      q: 'What blocks radiation best?', opts: [{ t: 'Thick soil wall', ok: 1 }, { t: 'A curtain' }, { t: 'Open door' }],
      hint: 'Piling up lots of Mars soil, called regolith, makes a strong wall.',
      good: 'Great thinking! Regolith is cheap armour.',
      why: ['A thick regolith wall soaks up dangerous particles.', 'Building it costs crew-hours, so we must plan before the flare.'],
      learned: ['Mars has no global magnetic shield.', 'Thick regolith walls block radiation.', 'Build the shield BEFORE the flare arrives.'] },
    6: { title: 'Night Shift', learns: 'Batteries and cold', trade: 'Heating vs saving power', lesson: 'night', visual: 'flicker',
      tasks: ['power'], hoursLeft: 4, crisis: function (S) { S.cond.power = 35; S.res.power = 24; S.weather[0].ev = 'cold'; S.weather[0].tmin -= 14; },
      intro: ['Mission 6: Night Shift. Night on Mars is freezing, below minus 80 degrees!', 'Heaters keep pipes and batteries alive, but heaters use lots of power.'],
      alarm: ['The cold night is here and the battery is low. Heaters are draining it fast!'],
      q: 'Where does night power come from?', opts: [{ t: 'The battery', ok: 1 }, { t: 'The Sun' }, { t: 'The wind' }],
      hint: 'There is no sunlight at night, so we need stored power.',
      good: 'Yes! Batteries store daytime sun for the night.',
      why: ['Solar panels charge the battery in the daytime.', 'The battery runs the heaters at night, so clean panels matter.'],
      learned: ['Batteries store sun power for the night.', 'Cold nights make heaters use more power.', 'Charge up before dark.'] },
    7: { title: 'Dust Storm', learns: 'Planning ahead', trade: 'Prepare vs react', lesson: 'storm', visual: 'dust',
      tasks: ['power', 'life'], hoursLeft: 5, crisis: function (S) { S.cond.power = 20; S.res.power = 30; S.cond.life = 40; },
      intro: ['Mission 7: Dust Storm. A big storm is coming and the sky is turning brown.', 'Smart astronauts prepare BEFORE the storm hits.'],
      alarm: ['The storm is here! Panels are dusty and power will drop. We have limited time.'],
      q: 'When should we prepare?', opts: [{ t: 'Before it hits', ok: 1 }, { t: 'After it ends' }, { t: 'Never' }],
      hint: 'If power is already gone, it is too late to fix things.',
      good: 'Exactly! Preparing early keeps the lights on.',
      why: ['Clean panels and a full battery get us through the storm.', 'Then we keep the air scrubbers running too.'],
      learned: ['Dust storms can last for weeks.', 'Prepare early: clean panels and charge the battery.', 'Plan which systems matter most.'] },
    8: { title: 'Broken Part', learns: 'Repair and priorities', trade: 'Fix the right thing first', lesson: 'repair', visual: 'flicker',
      tasks: ['life', 'water'], hoursLeft: 4, crisis: function (S) { S.cond.life = 12; S.res.oxygen = 25; S.cond.water = 18; S.res.water = 30; },
      intro: ['Mission 8: Broken Part. Two machines broke at once, and we only have time to fix two jobs!', 'Engineers choose what is most dangerous first.'],
      alarm: ['The air scrubbers AND the water recycler are failing.'],
      q: 'Which is most urgent?', opts: [{ t: 'Air first', ok: 1 }, { t: 'Paint it' }, { t: 'Nap time' }],
      hint: 'People can live days without water, but only minutes without air.',
      good: 'Right! Air comes first, then water.',
      why: ['Engineers fix the biggest danger first.', 'That is called setting priorities.'],
      learned: ['Fix what keeps the crew safest first.', 'Air is more urgent than water or food.', 'You cannot fix everything at once.'] },
    9: { title: 'Crew of Four', learns: 'Sharing limited supplies', trade: 'Fairness vs speed', lesson: 'share', visual: 'flicker',
      tasks: ['food', 'water'], hoursLeft: 4, crisis: function (S) { S.cond.food = 15; S.res.food = 20; S.cond.water = 25; S.res.water = 30; },
      intro: ['Mission 9: Crew of Four. Food and water are low, and four people need to share.', 'Good crews plan so everyone gets enough.'],
      alarm: ['Supplies are running low for the whole crew.'],
      q: 'How do we share?', opts: [{ t: 'Equal shares', ok: 1 }, { t: 'One hogs it' }, { t: 'Waste it' }],
      hint: 'A fair crew makes sure nobody runs out first.',
      good: 'Yes! Sharing fairly keeps the whole crew healthy.',
      why: ['Fixing food and water makes more supplies for everyone.', 'Teamwork matters more than speed on Mars.'],
      learned: ['Supplies must be shared fairly.', 'A bigger crew uses more food and water.', 'Teamwork keeps everyone safe.'] },
    10: { title: 'A New World', learns: 'Everything combined', trade: 'All of the above', lesson: 'home', visual: 'dust',
      tasks: ['power', 'life', 'shield'], hoursLeft: 7, crisis: function (S) { S.cond.power = 25; S.res.power = 45; S.cond.life = 35; S.cond.shield = 10; S.weather[0].ev = 'flare'; },
      intro: ['Mission 10: A New World. The big test! Power, air and radiation all need help.', 'Use everything you learned. Choose wisely!'],
      alarm: ['A storm AND a radiation burst are coming. Fix the base before time runs out!'],
      q: 'What must always be balanced?', opts: [{ t: 'Everything', ok: 1 }, { t: 'Only food' }, { t: 'Only power' }],
      hint: 'Power, air, water, food and shield all depend on each other.',
      good: 'Perfect! A base only survives when every system works together.',
      why: ['You balanced power, air and the shield. That is real engineering.', 'Welcome home, Mars settler!'],
      learned: ['Every system depends on the others.', 'Good engineers plan, prioritise and share.', 'You can help build a real Mars base!'] }
  };
  MB.LESSONS.night = 'Batteries store solar power for the night. Cold nights make heaters use extra power.';
  MB.LESSONS.storm = 'Prepare before a dust storm: clean the panels and charge the battery.';
  MB.LESSONS.repair = 'When two things break, fix the most dangerous one first. Air matters most.';
  MB.LESSONS.share = 'Limited food and water must be shared fairly so the whole crew stays healthy.';
  MB.LESSONS.home = 'A Mars base works only when power, air, water, food and shield are balanced.';

  MB.CFGACTIONS = {}; Object.keys(MB.CFG.actions).forEach(function (k) { MB.CFGACTIONS[k] = MB.CFG.actions[k].name; });
  var W = MB.WorldScene.prototype;

  W.engineFlow = function (la) {
    var sc = this, S = this.S, M = this.M, D = MB.MISSIONS[M.id];
    M.seen = M.seen || {}; this.registry.set('lastAction', null);
    if (D.visual === 'dust' && M.crisisDone) this.setStorm(1);
    if (!M.crisisDone) {
      M.step = 'intro';
      return this.say(D.intro, function () { sc.engineCrisis(); });
    }
    var key = D.tasks[M.idx || 0];
    if (la && la.key === key && S.done[key]) return this.engineTaskDone(la);
    if (!M.predicted) return this.enginePredict();
    this.setObjective(key, 'Fix: ' + MB.CFGACTIONS[key]);
  };
  W.engineCrisis = function () {
    var sc = this, S = this.S, M = this.M, D = MB.MISSIONS[M.id];
    M.crisisDone = true; M.idx = 0; M.wrong = 0; M.qs = [];
    D.crisis(S);
    S.hoursUsed = Math.max(0, S.hoursMax - D.hoursLeft);
    MB.sfx.alarm(); this.cameras.main.shake(400, 0.004); this.flicker();
    if (D.visual === 'dust') this.tweens.addCounter({ from: 0, to: 1, duration: 2000, onUpdate: function (tw) { sc.setStorm(tw.getValue()); } });
    this.paint(); this.refreshHud();
    this.time.delayedCall(1200, function () { sc.say(D.alarm, function () { sc.enginePredict(); }); });
  };
  W.enginePredict = function () {
    var sc = this, M = this.M, D = MB.MISSIONS[M.id];
    M.step = 'predict';
    var rot = (M.id + (M.wrong || 0)) % D.opts.length, opts = D.opts.slice(rot).concat(D.opts.slice(0, rot));
    var choices = opts.map(function (o) {
      return { label: o.t, cb: function () {
        if (o.ok) { M.predicted = true; MB.sfx.done(); sc.say([D.good], function () { sc.engineNextTask(); }); }
        else { M.wrong++; MB.sfx.bad(); sc.say(['Hmm, not quite. Hint: ' + D.hint], function () { sc.enginePredict(); }); }
      } };
    });
    this.say([D.q], null, choices);
  };
  W.engineNextTask = function () {
    var M = this.M, D = MB.MISSIONS[M.id], key = D.tasks[M.idx];
    M.step = 'task'; this.setObjective(key, 'Fix: ' + MB.CFGACTIONS[key]);
  };
  W.engineTaskDone = function (la) {
    var sc = this, S = this.S, M = this.M, D = MB.MISSIONS[M.id], key = la.key, q = la.q;
    M.qs.push(q); M.idx++; this.setObjective(null, null);
    var rk = RESMAP[key];
    if (rk) S.res[rk] = clamp(S.res[rk] + 25 + 30 * q, 0, 100);
    S.cond[key] = clamp(Math.max(S.cond[key], 55 + 40 * q), 0, 100);
    if (D.tasks.indexOf('power') >= 0 && key === 'power') S.res.power = clamp(S.res.power + 15 + 25 * q, 0, 100);
    this.paint(); this.refreshHud(); MB.sfx.powerUp(); this.player.celebrate && this.player.celebrate();
    if (M.idx < D.tasks.length) {
      var nk = D.tasks[M.idx];
      this.time.delayedCall(700, function () {
        sc.say(['Nice! Next job: ' + MB.CFGACTIONS[nk] + '.'], function () { sc.engineNextTask(); });
      });
      return;
    }
    this.lock = true;
    this.time.delayedCall(900, function () {
      sc.say(D.why, function () {
        var avg = M.qs.reduce(function (a, b) { return a + b; }, 0) / M.qs.length;
        var stars = avg > 0.85 ? 3 : avg > 0.6 ? 2 : 1;
        if (M.wrong > 0) stars = Math.min(stars, 2);
        var save = MB.save.get(); save['m' + M.id] = Math.max(save['m' + M.id] || 0, stars);
        save.lessons = save.lessons || {}; save.lessons[D.lesson] = 1; save.sols = (save.sols || 0) + 1; MB.save.set(save);
        sc.cameras.main.fadeOut(600);
        sc.cameras.main.once('camerafadeoutcomplete', function () { sc.scene.start('Complete', { id: M.id, stars: stars, q: avg }); });
      });
    });
  };
})();
