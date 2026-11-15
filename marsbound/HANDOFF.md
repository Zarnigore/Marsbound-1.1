# MARSBOUND - handoff notes

## State
Mission 1 and Free Play are tested end to end (see README "Tests" and "Known limitations").
Run `python3 tests/browser_mission1.py` and `python3 tests/browser_freeplay.py` (both PASS, no console errors).

## Fixed this session
- ui.js: text was drawn at double size under `?canvas` (Phaser 3.90 canvas ignores text resolution). setResolution(2) now only under WebGL.
- sim.js missionRecharge: also raises panel condition (60 + 40*q) so cleaned panels look clean.
- Mission test waits for the minigame score instead of a fixed 800 ms.
- Old browser_test.py / browser_test2.py deleted; new tests/browser_freeplay.py (desktop mouse + phone-size touch).
- README rewritten.

## Open / not built
1. Missions 2-10, guided mode ages 7-9, voice, real NASA images.
2. Real-device check: phone performance, real touch, portrait, sound.
3. Free Play water/food/life/shield minigames never played with real input (test calls finish()). Mission 1 not run with touch.
4. UX: tapping a station auto-opens its action; minigames cannot be cancelled; Report/Recap text ~8 px on a phone-landscape screen.
