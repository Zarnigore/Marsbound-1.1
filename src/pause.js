// MARSBOUND - pause menu.
// PauseScene is launched ON TOP of the World (or a minigame) and the scene underneath is paused with
// scene.pause(). A paused scene freezes its update loop, timers, tweens and input, so nothing keeps moving
// and no tap can leak through to the world. Resume / Restart / Main menu.
(function () {
  var MB = (window.MB = window.MB || {});
  var C = MB.C, txt = MB.txt;

  // Round "II" button for the HUD. Returns { box, g }. The caller positions/depths it.
  MB.pauseButton = function (sc, x, y, cb) {
    var box = sc.add.rectangle(x, y, 48, 48, C.panel2).setOrigin(0, 0).setStrokeStyle(2, C.line);
    var g = sc.add.graphics();
    g.fillStyle(C.white, 1); g.fillRect(x + 15, y + 13, 7, 22); g.fillRect(x + 27, y + 13, 7, 22);
    box.setInteractive({ useHandCursor: true });
    box.on('pointerdown', function () { MB.sfx.click(); cb(); });
    return { box: box, g: g };
  };

  class PauseScene extends Phaser.Scene {
    constructor() { super('Pause'); }
    init(d) { this.from = (d && d.from) || 'World'; this.miniData = (d && d.miniData) || null; this.busy = false; }

    create() {
      var sc = this;
      this.view = null; this.items = [];
      this.input.keyboard.removeAllListeners();
      this.input.keyboard.on('keydown-ESC', function () { if (sc.view === 'confirm') sc.showMain(); else sc.resume(); });
      this.input.keyboard.on('keydown-P', function () { if (sc.view !== 'confirm') sc.resume(); });
      // dim the frozen game; also swallows any pointer event
      this.add.rectangle(0, 0, 1280, 720, MB.C.ink, 0.72).setOrigin(0, 0).setInteractive();
      MB.panel(this, 390, 120, 500, 480, C.panel, C.cyan);
      this.showMain();
    }

    clear() { this.items.forEach(function (o) { if (o.destroy) o.destroy(); }); this.items = []; }
    add_(o) { this.items.push(o); return o; }

    showMain() {
      var sc = this, mini = this.from === 'Mini', M = this.registry.get('mission');
      this.clear(); this.view = 'main';
      this.add_(txt(this, 640, 150, 'PAUSED', 44, MB.C.tWhite, { fontStyle: 'bold' }).setOrigin(0.5, 0));
      var sub = mini ? 'Minigame' : M ? 'Mission ' + M.id : 'Free play, Mars day ' + this.registry.get('S').sol;
      this.add_(txt(this, 640, 206, sub, 22, MB.C.tCyan).setOrigin(0.5, 0));
      var b1 = MB.button(this, 450, 260, 380, 84, 'RESUME', function () { sc.resume(); }, { size: 30, icon: 'play' });
      var b2 = MB.button(this, 450, 364, 380, 72, mini ? 'RESTART GAME' : M ? 'RESTART MISSION' : 'RESTART RUN', function () { sc.askConfirm('restart'); }, { size: 26, kind: 'secondary' });
      var b3 = MB.button(this, 450, 456, 380, 72, 'MAIN MENU', function () { sc.askConfirm('menu'); }, { size: 26, kind: 'secondary', icon: 'back' });
      this.add_(b1); this.add_(b2); this.add_(b3);
      this.add_(txt(this, 640, 548, 'ESC or P to resume', 18, C.dim).setOrigin(0.5, 0));
    }

    askConfirm(what) {
      var sc = this, mini = this.from === 'Mini';
      this.clear(); this.view = 'confirm';
      var title = what === 'restart' ? (mini ? 'Restart this game?' : 'Start over?') : 'Leave to the main menu?';
      var body = what === 'restart'
        ? (mini ? 'You will start this job again from the beginning.' : 'All progress in this run will be lost.')
        : 'Progress in this run will be lost.';
      this.add_(txt(this, 640, 170, title, 34, MB.C.tWhite, { fontStyle: 'bold', align: 'center', wordWrap: { width: 440 } }).setOrigin(0.5, 0));
      this.add_(txt(this, 640, 250, body, 24, MB.C.tCyan, { align: 'center', wordWrap: { width: 420 }, lineSpacing: 4 }).setOrigin(0.5, 0));
      var yes = MB.button(this, 450, 360, 380, 84, what === 'restart' ? 'YES, RESTART' : 'YES, LEAVE', function () { if (what === 'restart') sc.doRestart(); else sc.doMenu(); }, { size: 28, kind: 'danger' });
      var no = MB.button(this, 450, 464, 380, 72, 'NO, GO BACK', function () { sc.showMain(); }, { size: 26, kind: 'secondary', icon: 'back' });
      this.add_(yes); this.add_(no);
    }

    resume() {
      if (this.busy) return; this.busy = true;
      MB.sfx.back();
      this.scene.resume(this.from);
      this.scene.stop();
    }

    doRestart() {
      if (this.busy) return; this.busy = true;
      var from = this.from, under = this.scene.get(from);
      if (from === 'Mini') { this.scene.start('Mini', this.miniData); return; }
      under.skipPosSave = true;               // do not let the old astronaut position overwrite the fresh start
      MB.restartRun(this);                    // resets the run, then starts a fresh World
    }

    doMenu() {
      if (this.busy) return; this.busy = true;
      this.scene.stop(this.from);
      this.scene.start('Menu');
    }
  }

  MB.PauseScene = PauseScene;
})();
