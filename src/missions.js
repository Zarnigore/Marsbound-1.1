// MARSBOUND - campaign structure and Mission 1 script.
// Only Mission 1 is playable. The other missions are listed so the campaign architecture is visible,
// and are shown as "coming soon" (they are not clickable).
(function () {
  var MB = (window.MB = window.MB || {});

  MB.CHAPTERS = [
    { id: 1, title: 'Our First Home', missions: [
      { n: 1, title: 'Dust on the Panels', ready: true },
      { n: 2, title: 'Thirsty Base', ready: true },
      { n: 3, title: 'First Harvest', ready: true } ] },
    { id: 2, title: 'Mars Strikes Back', missions: [
      { n: 4, title: 'Breathe Easy', ready: true },
      { n: 5, title: 'Solar Flare Warning', ready: true },
      { n: 6, title: 'Night Shift', ready: true },
      { n: 7, title: 'Dust Storm', ready: true } ] },
    { id: 3, title: 'A New World', missions: [
      { n: 8, title: 'Broken Part', ready: true },
      { n: 9, title: 'Crew of Four', ready: true },
      { n: 10, title: 'A New World', ready: true } ] }
  ];

  // What ROVA teaches after each activity (simple words, real science).
  MB.LESSONS = {
    power: 'Mars has lots of dust. When dust covers solar panels, they catch less sunlight and make less electricity. Clean panels mean more power!',
    water: 'Water is precious on Mars. The recycler cleans used water so the crew can drink it again and again.',
    food: 'Plants need light, water and power to grow. They give the crew food and fresh air.',
    life: 'The air-cleaning machines take out the CO2 we breathe out and keep the oxygen at a safe level. They need power too!',
    shield: 'Mars has no magnetic shield like Earth. Piling up Mars soil, called regolith, blocks dangerous space energy called radiation.'
  };

  MB.MISSION1 = {
    id: 1,
    title: 'Dust on the Panels',
    intro: [
      'Welcome to Mars, Junior Astronaut! I am ROVA, your robot buddy.',
      'This is our home base. Use the stick to walk, or tap the ground and I will lead the way.'
    ],
    tour: {
      greenhouse: 'This is the greenhouse. Plants grow here. They give us food and fresh air!',
      water: 'This is the water station. It cleans used water so we can drink it again. Water is precious on Mars!'
    },
    alarm: [
      'BEEP BEEP! A dust storm is blowing in!',
      'Uh-oh. Dust is covering the solar panels. They cannot catch sunlight, so our power is running out and the lights went off!',
      'Run to the Solar Farm and clean the panels. Follow the arrow!'
    ],
    solarArrive: 'Look at all that dust! Tap CLEAN PANELS and wipe it off.',
    objectives: {
      greenhouse: 'Walk to the Greenhouse',
      water: 'Visit the Water Station',
      solar: 'Run to the Solar Farm!',
      clean: 'Tap CLEAN PANELS'
    },
    hints: {
      greenhouse: 'Use the stick, or tap the ground. The greenhouse is to the right.',
      water: 'Keep walking to the right. Look for the big blue tank.',
      solar: 'The Solar Farm is far to the left. Follow the arrow on the edge of the screen!',
      clean: 'Stand next to the panels and press the big button.'
    },
    restore: [
      'It worked! Look, the lights are coming back on!',
      'Mars has lots of dust. When dust covers solar panels, they catch less sunlight and make less electricity. Clean panels mean more power!',
      'Mission complete, astronaut. The whole crew is safe because of you!'
    ],
    learned: [
      'Dust on solar panels blocks sunlight, so there is less electricity.',
      'Dust storms on Mars can last for weeks. Real rovers have lost power in them.',
      'Cleaning the panels brings the power back. Always check them after a storm.'
    ]
  };
})();
