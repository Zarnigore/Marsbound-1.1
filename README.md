# MARSBOUND

Walk around a Mars base with your robot buddy ROVA, fix the machines, and keep the crew alive.
Built for the NASA Space Apps "Build a Junior Astronaut Mission Trainer" challenge (ages 7-12).

**Status:** Mission 1 and Free Play are playable. Missions 2-10 are listed on the menu as "coming soon" and are not built.

## Run it
- **Locally:** open `index.html` in a browser. No install, no server, no internet (Phaser 3 is bundled in `lib/`).
- **Online:** it is a static site. Drag the folder onto https://app.netlify.com/drop, or use GitHub Pages / Vercel.
- **Headless tests:** open `index.html?canvas` to force the Canvas renderer (much faster without a GPU). The normal page uses WebGL when available.

## Controls
| Action | Desktop | Phone / tablet |
|---|---|---|
| Walk | Arrow keys or WASD | Tap the ground (no joystick) |
| Walk to a spot | Click the ground | Tap the ground |
| Walk to a machine | Click the machine (it opens its action when you arrive) | Same |
| Use the machine you stand at | `E` or `Space`, or the big button (bottom right) | The big button |
| Dialogue | Click the box, `Space` or `Enter` | Tap the box or NEXT |


## Mission 1: Dust on the Panels
A short guided story. ROVA shows you the greenhouse and the water station. A dust storm then covers the solar panels, the power runs out and the lights go off. You run to the Solar Farm and wipe the dust off in a minigame. The better you clean, the more the battery recharges, the lights come back on, and you get 1 to 3 stars (saved in the browser). ROVA explains why dust cuts solar power, and the Mission Complete screen lists what you learned.

## Free Play (30 sols)
Choose a site (Gale Crater, Jezero Crater, Hellas Basin) and a difficulty ("Friendly crew" is gentler, "Hard mode" is the original balance). Each Mars day (sol) the crew has limited *crew-hours* (2 per living crew member) and limited battery power. Five fixes compete for them and you cannot afford all five, so you must choose:
- Solar panels: sweep the dust off
- Water recycler: rotate pipes to connect source and tank
- Greenhouse: time light and water for the plants
- Air scrubbers: keep O2 and CO2 in the green band
- Regolith shield: stack soil bags on the habitat

Performance sets the size of the repair, it is not pass/fail. Stations change appearance with the simulation (dusty panels, dying plants, dark windows). The forecast chips show the next 3 sols (radiation bursts only about 1 sol ahead, like real space weather). Go to the Habitat and sleep to end the sol. The Recap screen explains every change in one line. The REPORT button opens a detailed stats screen. Survive 30 sols to win. If the colony is lost, the end screen shows a chart of the run and what went wrong.

Everything is linked: dust cuts solar power, low battery slows the recycler, greenhouse and scrubbers, stores drain, crew health falls. Each lost crew member removes crew-hours.

## About the NASA data
Sites, event types and magnitudes are **modelled on** ranges reported by Curiosity REMS/RAD and Perseverance MEDA (dust opacity, night lows, surface radiation, no global magnetic field, the 2018 dust storm that ended Opportunity, dust devils cleaning Spirit and Opportunity). The numbers are **representative and scaled for gameplay, not raw mission data**. Describe it as "inspired by NASA data". To use real series, replace the `MB.SITES` schedules in `src/data.js` (same structure).

## Files
```
index.html              open this
lib/phaser.min.js       Phaser 3.90 (bundled)
src/data.js             sites, events, Mars facts
src/sim.js              game rules and balance constants (CFG at the top), Mission 1 storm/recharge
src/ui.js               drawing helpers, astronaut and ROVA art, sound (WebAudio), save (localStorage)
src/missions.js         campaign chapters, Mission 1 script, ROVA lessons
src/minigames.js        the five minigames
src/world.js            the walkable base: movement, stations, dialogue, HUD, Mission 1 flow
src/scenes.js           Menu, Sites, Report (Plan), Minigame, Recap, End, Mission Complete
src/main.js             Phaser config
tests/browser_mission1.py   plays Mission 1 start to finish with real mouse and keyboard
tests/browser_freeplay.py   Free Play on desktop (mouse) and a phone-sized screen (touch)
tests/bots.js               balance simulation: node tests/bots.js 300 [junior]
```

## Tests
Needs Python Playwright with Chromium (`pip install playwright && playwright install chromium`). Screenshots are written to the output folder given as the first argument.
```
python3 tests/browser_mission1.py /tmp/m1
python3 tests/browser_freeplay.py /tmp/fp     # about 4-5 minutes in software rendering
node tests/bots.js 300
```
The browser tests wait on game state, not fixed delays, and fail on any console or page error.

**What the tests cover:** Mission 1 end to end (walking, tour, storm, real solar-panel sweep, lights, lesson, Mission Complete, saved stars) at 1280x720 with mouse and keyboard. Free Play at 1280x720 with mouse and at 844x390 with touch events: menu, site select, intro, walk to a station, minigame, lesson, Report screen and back, sleep, Recap, next sol. Text-fit checks on every screen and every ROVA line.

## Balance (300 bot runs per site, `node tests/bots.js 300`)
Win rate, "Hard mode" (classic):
| Bot | Gale | Jezero | Hellas |
|---|---|---|---|
| Idle (does nothing) | 0% (dies ~sol 12) | 0% | 0% |
| Random actions | 27% | 14% | 23% |
| Skilled (reads forecast) | 98% | 96% | 74% |

"Friendly crew": skilled bot 99% / 98% / 100%, random bot 29% / 26% / 55%.
To change difficulty, edit `CFG` at the top of `src/sim.js` and re-run the bots.

## Known limitations
- Missions 2-10 are not built. There is no guided mode for ages 7-9, no voice, no real NASA images, and no Uzbek/Russian text (strings are inline in `src/*.js`).
- Free Play minigames other than the solar-panel sweep were not played with real input in the tests; the test finishes them through the game's own `finish()` call. Mission 1 was not run with touch input.
- Touch was tested with synthetic touch events in headless Chromium, not on a real phone or tablet. Phone portrait mode was not tested and would show the 1280x720 game very small.
- On a phone-sized landscape screen the game is scaled down, so the small text on the Report and Recap screens is only about 8 px tall. Mission and walking screens are readable.
- Tapping a machine walks there and opens its action immediately. A minigame cannot be cancelled once started.
- Sound (WebAudio) was never listened to in tests.
- Real-device frame rate is unmeasured. Headless software rendering runs at about 10 fps.
