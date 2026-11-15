// MARSBOUND - site and event data.
// Values are REPRESENTATIVE, modelled on the ranges reported by Curiosity REMS/RAD
// and Perseverance MEDA, and scaled for gameplay. They are not raw mission data.
(function () {
  var G = typeof window !== 'undefined' ? window : globalThis;
  var MB = (G.MB = G.MB || {});

  MB.EVENT_INFO = {
    dust: {
      title: 'Dust storm',
      icon: 'dust',
      fact: 'Dust storms can hide the Sun for weeks. In 2018 a global storm starved the solar panels of the Opportunity rover and it never woke up again.'
    },
    cold: {
      title: 'Deep cold night',
      icon: 'cold',
      fact: 'Night temperatures can fall below -80 C. Heaters keep batteries and pipes alive, and heaters eat power.'
    },
    flare: {
      title: 'Solar radiation burst',
      icon: 'flare',
      fact: 'Mars has no global magnetic field to deflect solar particles. Curiosity’s RAD instrument measures the radiation that reaches the surface.'
    },
    gust: {
      title: 'Lucky wind gust',
      icon: 'gust',
      fact: 'Wind and dust devils sometimes blew the dust off the panels of Spirit and Opportunity and gave the rovers extra life.'
    },
    calm: {
      title: 'Quiet sol',
      icon: 'calm',
      fact: 'Even a calm day is cold and thin: the air pressure on Mars is less than 1% of Earth’s, so nobody can breathe it.'
    }
  };

  // Each site: baseline weather and a schedule of events (start sol, length, magnitude).
  MB.SITES = {
    gale: {
      name: 'Gale Crater',
      blurb: 'Where Curiosity landed. Cold nights, two dust storms, bursts of radiation.',
      tau: 0.55, tmin: -76, radMod: 1.0,
      schedule: [
        { t: 'gust', s: 5, len: 1 },
        { t: 'dust', s: 9, len: 5, mag: 1.0 },
        { t: 'flare', s: 15, len: 1 },
        { t: 'cold', s: 19, len: 3 },
        { t: 'dust', s: 24, len: 3, mag: 0.85 },
        { t: 'flare', s: 27, len: 1 }
      ]
    },
    jezero: {
      name: 'Jezero Crater',
      blurb: 'Where Perseverance landed. Dustier air and a long storm early on.',
      tau: 0.65, tmin: -72, radMod: 1.0,
      schedule: [
        { t: 'dust', s: 6, len: 6, mag: 1.1 },
        { t: 'gust', s: 12, len: 1 },
        { t: 'flare', s: 14, len: 1 },
        { t: 'cold', s: 18, len: 2 },
        { t: 'dust', s: 22, len: 5, mag: 1.2 }
      ]
    },
    hellas: {
      name: 'Hellas Basin',
      blurb: 'The deepest place on Mars. Thicker air means less radiation, but it is freezing.',
      tau: 0.65, tmin: -77, radMod: 0.8,
      schedule: [
        { t: 'cold', s: 4, len: 2 },
        { t: 'dust', s: 8, len: 4, mag: 1.0 },
        { t: 'gust', s: 13, len: 1 },
        { t: 'flare', s: 17, len: 1 },
        { t: 'dust', s: 20, len: 5, mag: 1.05 },
        { t: 'cold', s: 27, len: 2 }
      ]
    }
  };

  if (typeof module !== 'undefined') module.exports = MB;
})();
