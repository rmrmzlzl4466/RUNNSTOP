// UI shop + upgrades + skins (extracted from game.js)

  function checkUnlockCondition(skin) { if(skin.condType === 'none') return true; if(skin.condType === 'maxDist') return window.GameData.stats.maxDist >= skin.condVal; if(skin.condType === 'totalCoins') return window.GameData.stats.totalCoins >= skin.condVal; if(skin.condType === 'totalGames') return window.GameData.stats.totalGames >= skin.condVal; if(skin.condType === 'totalDeaths') return window.GameData.stats.totalDeaths >= skin.condVal; return false; }

  function updateUpgradeUI() {
    // GameConfig.Formulas를 사용하여 상점 UI와 게임 로직 일치
    const F = window.GameConfig?.Formulas;
    const baseSpeed = window.qaConfig?.baseSpeed ?? 400;

    const shopCoins = document.getElementById('shop-coins');
    const shopGems = document.getElementById('shop-gems');
    if (shopCoins) shopCoins.innerText = window.GameData.coins;
    if (shopGems) shopGems.innerText = window.GameData.gems;

    // Speed Upgrade
    const speedCost = F ? F.getUpgradeCost(window.GameData.lvlSpeed) : window.GameData.lvlSpeed * 100;
    const speedBonus = F ? F.getSpeed(window.GameData.lvlSpeed, baseSpeed) - baseSpeed : (window.GameData.lvlSpeed - 1) * 20;
    document.getElementById('lvl-speed').innerText = `Lv.${window.GameData.lvlSpeed}`;
    document.getElementById('stat-speed').innerText = `Max Speed +${speedBonus}`;
    document.getElementById('btn-buy-speed').innerText = `${speedCost} 🪙`;
    document.getElementById('btn-buy-speed').onclick = () => buyUpgrade('lvlSpeed', speedCost);

    // Cooldown Upgrade
    const coolCost = F ? F.getUpgradeCost(window.GameData.lvlCool) : window.GameData.lvlCool * 100;
    const coolReduction = F ? (1.0 - F.getCool(window.GameData.lvlCool)).toFixed(2) : ((window.GameData.lvlCool - 1) * 0.05).toFixed(2);
    document.getElementById('lvl-cool').innerText = `Lv.${window.GameData.lvlCool}`;
    document.getElementById('stat-cool').innerText = `Cool -${coolReduction}s`;
    document.getElementById('btn-buy-cool').innerText = `${coolCost} 🪙`;
    document.getElementById('btn-buy-cool').onclick = () => buyUpgrade('lvlCool', coolCost);

    // Greed Upgrade
    const greedCost = F ? F.getUpgradeCost(window.GameData.lvlGreed) : window.GameData.lvlGreed * 100;
    const greedBonus = F ? Math.round((F.getGreed(window.GameData.lvlGreed) - 1.0) * 100) : (window.GameData.lvlGreed - 1) * 10;
    document.getElementById('lvl-greed').innerText = `Lv.${window.GameData.lvlGreed}`;
    document.getElementById('stat-greed').innerText = `Bonus +${greedBonus}%`;
    document.getElementById('btn-buy-greed').innerText = `${greedCost} 🪙`;
    document.getElementById('btn-buy-greed').onclick = () => buyUpgrade('lvlGreed', greedCost);
  }

  function buyUpgrade(key, cost) { if (window.GameData.coins >= cost) { window.GameData.coins -= cost; window.GameData[key]++; window.SaveManager.persist(window.GameData); updateUpgradeUI(); Sound.sfx('coin'); showToast('UPGRADE PURCHASED', 'info', 750); } else alert("Not enough coins!"); };

  function renderSkinList() { const list = document.getElementById('skin-list-container'); list.innerHTML = ''; const skins = window.SKINS || []; skins.forEach(skin => { const isOwned = window.GameData.unlockedSkins.includes(skin.id); const isEquipped = window.GameData.equippedSkin === skin.id; const conditionMet = checkUnlockCondition(skin); const el = document.createElement('div'); el.className = `skin-list-item ${isEquipped ? 'equipped' : ''}`; let actionHTML = ''; if (isOwned) { actionHTML = isEquipped ? `<button class=\"btn-buy btn-equipped\">EQUIPPED</button>` : `<button class=\"btn-buy btn-equip\" onclick=\"window.equipSkin(${skin.id})\">EQUIP</button>`; } else { const coinClass = conditionMet ? 'btn-coin' : 'btn-coin locked'; const coinText = conditionMet ? `${skin.coinPrice} 🪙` : `🔒 ${skin.condText}`; const coinAction = conditionMet ? `onclick=\"window.buySkinWithCoin(${skin.id})\"` : ''; if(skin.coinPrice > 0 || skin.gemPrice > 0) { actionHTML = `<div class=\"skin-actions\"><button class=\"btn-buy btn-gem\" onclick=\"window.buySkinWithGem(${skin.id})\">${skin.gemPrice} 💎</button><button class=\"btn-buy ${coinClass}\" ${coinAction}>${coinText}</button></div>`; } else { actionHTML = `<button class=\"btn-buy btn-coin\" onclick=\"window.buySkinWithCoin(${skin.id})\">GET FREE</button>`; } } const previewStyles = [`background:${skin.color}`]; if (skin.sprite) { previewStyles.push(`background-image:url('${skin.sprite}')`); previewStyles.push('background-size: cover'); previewStyles.push('background-position: center'); previewStyles.push('background-repeat: no-repeat'); } el.innerHTML = `<div class=\"skin-header\"><div class=\"skin-info-left\"><div class=\"skin-preview\" style=\"${previewStyles.join(';')}\"></div><div class=\"skin-details\"><span class=\"skin-name\">${skin.name}</span><span class=\"skin-rarity rarity-${skin.rarity}\">${skin.rarity}</span></div></div></div><div class=\"skin-desc\">${skin.desc}</div>${actionHTML}`; list.appendChild(el); }); }

  window.buySkinWithCoin = (id) => { const skin = (window.SKINS || []).find(s=>s.id===id); if (!skin) return; if (!checkUnlockCondition(skin)) { alert(`Locked: ${skin.condText}`); return; } if (window.GameData.coins >= skin.coinPrice) { window.GameData.coins -= skin.coinPrice; window.GameData.unlockedSkins.push(id); window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); renderSkinList(); updateUpgradeUI(); Sound.sfx('coin'); } else alert("Not enough coins"); };

  window.buySkinWithGem = (id) => { const skin = (window.SKINS || []).find(s=>s.id===id); if (!skin) return; if (window.GameData.gems >= skin.gemPrice) { window.GameData.gems -= skin.gemPrice; window.GameData.unlockedSkins.push(id); window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); renderSkinList(); updateUpgradeUI(); Sound.sfx('coin'); } else alert("Not enough gems!"); };

  window.equipSkin = (id) => { window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); renderSkinList(); Sound.sfx('btn'); };

// === [NEW] 로비 UI 업데이트 ===
window.updateLobbyUI = function() {
  // 재화 표시
  const lobbyCoins = document.getElementById('lobby-coins');
  const lobbyGems = document.getElementById('lobby-gems');
  if (lobbyCoins) lobbyCoins.innerText = window.GameData.coins.toLocaleString();
  if (lobbyGems) lobbyGems.innerText = window.GameData.gems.toLocaleString();

  // 캐릭터 미리보기
  const lobbyChar = document.getElementById('lobby-char');
  const skinNameEl = document.getElementById('lobby-skin-name');
  const currentSkin = (window.SKINS || []).find(s => s.id === window.GameData.equippedSkin);
  if (lobbyChar) {
    if (currentSkin?.sprite) {
      // [SVG 모드] 배경/테두리 싹 지우고 이미지만 표시
      lobbyChar.style.background = 'transparent';
      lobbyChar.style.border = 'none';
      lobbyChar.style.boxShadow = 'none';

      lobbyChar.style.backgroundImage = `url('${currentSkin.sprite}')`;
      lobbyChar.style.backgroundSize = 'contain';
      lobbyChar.style.backgroundRepeat = 'no-repeat';
      lobbyChar.style.backgroundPosition = 'center';
      lobbyChar.innerHTML = '';
    } else {
      // [기본 모드] 동그란 색깔 원 복구
      lobbyChar.style.background = currentSkin?.color || '#333';
      lobbyChar.style.border = '4px solid #fff';
      lobbyChar.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';

      lobbyChar.style.backgroundImage = '';
      lobbyChar.innerHTML = currentSkin?.emoji || '';
    }
  }
  if (skinNameEl && currentSkin) {
    skinNameEl.innerText = currentSkin.name;
  }

  // 보물 슬롯 업데이트
  const slots = [document.getElementById('lobby-slot-0'), document.getElementById('lobby-slot-1')];
  const equipped = window.GameData.equippedTreasures || [null, null];

  slots.forEach((slot, idx) => {
    if (!slot) return;
    const treasureId = equipped[idx];
    const treasure = treasureId ? window.getTreasureById?.(treasureId) : null;

    if (treasure) {
      slot.classList.add('filled');
      slot.querySelector('.slot-icon').innerText = getTreasureEmoji(treasure.effect);
    } else {
      slot.classList.remove('filled');
      slot.querySelector('.slot-icon').innerText = '+';
    }
  });
};

// === [NEW] 상점 UI 업데이트 ===
window.updateShopUI = function() {
  // 재화 표시
  const shopCoins = document.getElementById('shop-coins');
  const shopGems = document.getElementById('shop-gems');
  if (shopCoins) shopCoins.innerText = window.GameData.coins.toLocaleString();
  if (shopGems) shopGems.innerText = window.GameData.gems.toLocaleString();

  updateUpgradeUI();
};

// === [NEW] 보물 리스트 렌더링 ===
window.renderTreasureList = function() {
  const container = document.getElementById('treasure-list-container');
  if (!container) return;
  container.innerHTML = '';

  const treasures = window.TREASURES || [];
  const owned = window.GameData.unlockedTreasures || [];
  const equipped = window.GameData.equippedTreasures || [null, null];

  treasures.forEach(t => {
    const isOwned = owned.includes(t.id);
    const isEquipped = equipped.includes(t.id);
    const equippedSlot = equipped.indexOf(t.id);

    let stateClass = '';
    if (isEquipped) stateClass = 'equipped';
    else if (isOwned) stateClass = 'owned';

    let actionHTML = '';
    if (isEquipped) {
      actionHTML = `<button class="btn-common" style="background:#e74c3c;" onclick="window.unequipTreasure(${equippedSlot})">UNEQUIP</button>`;
    } else if (isOwned) {
      actionHTML = `<button class="btn-common btn-equip" onclick="window.equipTreasure('${t.id}')">EQUIP</button>`;
    } else {
      actionHTML = `<button class="btn-common" onclick="window.buyTreasure('${t.id}')">${t.price.toLocaleString()} 🪙</button>`;
    }

    const el = document.createElement('div');
    el.className = `treasure-item ${stateClass}`;
    el.innerHTML = `
      <div class="treasure-info">
        <span class="treasure-name">${getTreasureEmoji(t.effect)} ${t.name}</span>
        <span class="treasure-desc rarity-${t.rarity}">[${t.rarity}] ${t.desc}</span>
      </div>
      <div class="treasure-actions">${actionHTML}</div>
    `;
    container.appendChild(el);
  });
};

// 보물 이모지 반환
function getTreasureEmoji(effect) {
  const map = {
    'revive': '🥚',
    'magnet': '🤖',
    'speed': '🚀',
    'barrier_start': '🛡️',
    'coin_bonus': '🌸'
  };
  return map[effect] || '📦';
}

// === [NEW] 보물 구매 ===
window.buyTreasure = function(id) {
  const treasure = window.getTreasureById?.(id);
  if (!treasure) return;

  if (window.GameData.coins >= treasure.price) {
    window.GameData.coins -= treasure.price;
    window.GameData.unlockedTreasures.push(id);
    window.SaveManager.persist(window.GameData);
    window.renderTreasureList();
    window.updateShopUI?.();
    Sound.sfx('coin');
    showToast(`${treasure.name} PURCHASED!`, 'info', 800);
  } else {
    alert('Not enough coins!');
  }
};

// === [NEW] 보물 장착 ===
window.equipTreasure = function(id) {
  const equipped = window.GameData.equippedTreasures || [null, null];

  // 빈 슬롯 찾기
  let slot = equipped.indexOf(null);
  if (slot === -1) {
    // 빈 슬롯 없으면 첫 번째 슬롯 교체
    slot = 0;
  }

  equipped[slot] = id;
  window.GameData.equippedTreasures = equipped;
  window.SaveManager.persist(window.GameData);
  window.renderTreasureList();
  window.updateLobbyUI?.();
  Sound.sfx('btn');
  showToast('TREASURE EQUIPPED!', 'info', 600);
};

// === [NEW] 보물 해제 ===
window.unequipTreasure = function(slot) {
  if (slot < 0 || slot > 1) return;
  window.GameData.equippedTreasures[slot] = null;
  window.SaveManager.persist(window.GameData);
  window.renderTreasureList();
  window.updateLobbyUI?.();
  Sound.sfx('btn');
};

