window.GameModules = window.GameModules || {};

(function() {
  const { formatNumber } = window.GameModules.Config;

  function spawnItemAtCol(runtime, rowIdx, type, col) {
    const { CELL_W, CELL_H } = runtime.grid;
    const x = col * CELL_W + CELL_W / 2;
    const baseY = rowIdx * CELL_H;

    if (type === 'coin' || type === 'bit') {
      runtime.items.push({ x, y: baseY + CELL_H * 0.3, type, r: 12, active: false });
      runtime.items.push({ x, y: baseY + CELL_H * 0.7, type, r: 12, active: false });
    } else if (type === 'big_gem') {
      runtime.items.push({ x, y: baseY + CELL_H * 0.5, type, r: 24, active: false });
    } else {
      runtime.items.push({ x, y: baseY + CELL_H * 0.5, type, r: 12, active: false });
    }
  }

  function spawnItem(runtime, rowIdx, type) {
    const col = Math.floor(Math.random() * runtime.grid.COLS);
    spawnItemAtCol(runtime, rowIdx, type, col);
  }

  function spawnWarningGem(runtime, player) {
    const rowIdx = Math.floor(player.y / runtime.grid.CELL_H) - Math.floor(Math.random() * 3 + 4);
    spawnItem(runtime, rowIdx, 'gem');
  }

  function spawnBigGem(runtime, player, targetColorIndex) {
    const playerRow = Math.floor(player.y / runtime.grid.CELL_H);
    const targetRow = playerRow - Math.floor(Math.random() * 3 + 2);

    if (!window.Game.LevelManager.getRow(targetRow)) {
      window.Game.LevelManager.generateRow(targetRow, (type, col) => spawnItemAtCol(runtime, targetRow, type, col));
    }

    const rowData = window.Game.LevelManager.getRow(targetRow);
    if (!rowData || !rowData.colors) return;

    const dangerousCols = [];
    for (let i = 0; i < runtime.grid.COLS; i++) {
      if (rowData.colors[i] !== targetColorIndex) {
        dangerousCols.push(i);
      }
    }

    if (dangerousCols.length > 0) {
      const bigGemCol = dangerousCols[Math.floor(Math.random() * dangerousCols.length)];
      spawnItemAtCol(runtime, targetRow, 'big_gem', bigGemCol);
    }
  }

  function pruneItemsBehindPlayer(runtime, player) {
    for (let i = runtime.items.length - 1; i >= 0; i--) {
      if (runtime.items[i].y >= player.y) runtime.items.splice(i, 1);
    }
  }

  function applyItem(runtime, player, qaConfig, item) {
    const itemCfg = qaConfig.item || {};
    if (item.type === 'bit') {
      player.sessionBits += 1;
      player.sessionScore += qaConfig.scorePerBit ?? 0;
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
      window.Sound?.sfx('bit');
      window.Game.UI.showToast(player, `+${qaConfig.scorePerBit ?? 0}`, '#79F566', 650);
    } else if (item.type === 'coin') {
      const val = Math.floor(1 * player.coinMult);
      player.sessionCoins += val;
      player.sessionScore += (qaConfig.scorePerCoin ?? 0) * val;
      window.Game.UI.setCoinDisplay(player.sessionCoins);
      window.Sound?.sfx('coin');
      window.Game.UI.showToast(player, `+${val}`, '#f1c40f', 650);
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
    } else if (item.type === 'gem') {
      player.sessionGems++;
      player.sessionScore += qaConfig.scorePerGem ?? 0;
      window.Game.UI.setGemDisplay(player.sessionGems);
      window.Sound?.sfx('gem');
      window.Game.UI.showToast(player, '+1', '#00d2d3', 650);
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
    } else if (item.type === 'big_gem') {
      const bigGemScore = itemCfg.bigGemScore ?? 50000;
      const bigGemReward = itemCfg.bigGemGems ?? 50;
      player.sessionGems += bigGemReward;
      player.sessionScore += bigGemScore;
      window.Game.UI.setGemDisplay(player.sessionGems);
      window.Sound?.sfx('alert');
      window.Sound?.sfx('coin');
      window.Game.UI.showToast(player, `+${bigGemReward} GEM`, '#00d2d3', 1200);
      setTimeout(() => {
        window.Game.UI.showToast(player, `+${formatNumber(bigGemScore)} SCORE`, '#ffd700', 1200);
      }, 200);
      window.Game.UI.updateScore(player.sessionScore, formatNumber);
    } else if (item.type === 'barrier') {
      player.hasBarrier = true;
      window.Sound?.sfx('item');
    } else if (item.type === 'booster') {
      player.isBoosting = true;
      player.boostTargetY = player.y - qaConfig.boostDist;
      window.Sound?.sfx('item');
    } else if (item.type === 'magnet') {
      const magnetDuration = itemCfg.magnetDurationSec ?? 10.0;
      player.magnetTimer = magnetDuration;
      window.Sound?.sfx('item');
    }
  }

  window.GameModules.Items = {
    spawnItemAtCol,
    spawnItem,
    spawnWarningGem,
    spawnBigGem,
    pruneItemsBehindPlayer,
    applyItem
  };
})();
