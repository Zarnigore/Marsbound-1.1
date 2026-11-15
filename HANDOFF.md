# MARSBOUND - handoff notes

## State (pause menu added in Session 6, see bottom)
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

## UI/UX pass (this session)
- ui.js: new MB.C tokens (navy/blue/cyan/white/muted/marsOrange/red/green), MB.ENV for terrain shades, MB.button kinds (primary/secondary/danger/ghost, hover/press/disabled/focus, icon), MB.icon set, MB.chip, MB.toast, MB.meter(icon), new astronaut (blue details, outline, interact/celebrate) and ROVA (hover egg, setMood/setTalking).
- Hex literals remapped to tokens in scenes/world/minigames; Journal + Profile scenes added.
- NOT done: text sizes >=28px, button heights >=90px, HUD zone re-layout, ROVA talking hook in dialogue, contrast numbers, per-screen restyle review. Both browser tests pass.

## Session 3 (smooth UI + missions)
- Smooth UI: pill buttons (squash on press), rounded panels via MB.panel (graphics-based, supports setStrokeStyle/setInteractive), rounded dialogue box.
- src/engine.js: data-driven missions 2-10 (MB.MISSIONS). Flow: intro -> crisis -> predict (rotating answers, hint on wrong) -> repair task(s) via existing minigames -> why -> stars (wrong prediction caps at 2) -> Complete. Saves m<N> stars, lessons, sols.
- Menu: PLAY next mission + tappable campaign map (unlocks in order). Journal has 10 cards.
- tests/browser_missions.py plays 2-10 (minigame replaced by applyAction q=0.9: labelled shortcut). All 3 tests pass.
- STILL NOT DONE: 28px text / 90px button sizes everywhere, HUD zone re-layout (5 resource bars, forecast chips), cost/gain on action button, Base Status + dependency chain, cause->effect recap, rounded world HUD/minigame pieces, minigame cancel button, contrast numbers, 844x390 screenshots.

## Session 4 (ROVA, joystick, sounds)
- ROVA is the orange six-wheeled rover again (one big cyan eye, white antenna, moods idle/talk/happy/warn/hint, setMood/setTalking kept). It sits on the ground beside the astronaut.
- Joystick removed. Tap anywhere to walk (bottom-left included); keyboard unchanged. freeplay test now checks tap-to-walk.
- MB.sfx (ui.js) expanded: click, back, select, pop, talk, good, done (task completed), star, win, bad, warn, danger, alarm, lose, powerUp, powerDown, dust, sleep, newDay, step, rub, pipe, thud, ding. Wired into buttons, world (low resource = danger, storm = alarm+dust, lights out = powerDown, sleep, footsteps), minigames, Recap, End and Complete.
- Sounds were exercised for errors only (all play without exceptions); nobody has listened to them yet, so volumes and taste are unchecked.

## Session 5 (mission bugs)
- BUG FIXED: Missions 2-10 had no action button at their repair station (World.actionFor returned null unless Mission 1). The old missions test bypassed the button, so it passed. Now actionFor opens the current task's minigame, and tests/browser_missions.py clicks the real button.
- Menu: tap any built mission on the campaign map to choose it, then PLAY (default is still the next unplayed one). All built missions are selectable (no locks). tests/browser_menu.py covers it.
- Button: removed the press scale tween (it shrank the hit area and flickered) and touch no longer leaves buttons in hover.

## Session 6 (pause menu)
- NEW src/pause.js: PauseScene (Resume / Restart / Main menu, each Restart and Main menu asks "YES / NO" first) launched ON TOP of World or Mini; the scene underneath is scene.pause()d, so timers, tweens, movement and input all freeze and no tap leaks through. Opened by the II button (free play: under the sound button; missions: left of it; minigames: top right) or ESC / P. ESC or P also resumes.
- World: on resume, keyboard.resetKeys() and the walk target are cleared (a key released while paused would otherwise leave the astronaut walking forever). Restart sets skipPosSave so the old astronaut position does not overwrite the fresh start.
- MB.restartRun (scenes.js): mission -> startMission(id); free play -> new run, same site and mode. Minigame restart replays the same job from its how-to card (nothing is charged until it finishes).
- tests/browser_pause.py (real mouse + keyboard): freeze, tap-leak, stuck key, ESC toggle, mash ESC, confirm/cancel, restart, main menu, mission, minigame. All 5 tests pass.
- Test gotcha: never `ev("() => game.scene.start(...)")` without braces; Playwright tries to serialize the returned SceneManager and hangs.
- Not checked: a finger held down inside a minigame when pause is pressed (drag state may resume mid-drag); phone-size layout of the pause buttons.
