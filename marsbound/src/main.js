(function () {
  var config = {
    type: location.search.indexOf('canvas') >= 0 ? Phaser.CANVAS : Phaser.AUTO,   // ?canvas is for headless tests
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#120d0b',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { keyboard: true, touch: true, activePointers: 3 },
    disableContextMenu: true,
    scene: MB.scenes
  };
  window.game = new Phaser.Game(config);
})();
