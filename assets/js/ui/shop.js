// UI shop + upgrades + skins (extracted from game.js)
// 아이템 업그레이드 시스템으로 교체됨 (캐릭터 스탯 업그레이드 폐지)

  function checkUnlockCondition(skin) { if(skin.condType === 'none') return true; if(skin.condType === 'maxDist') return window.GameData.stats.maxDist >= skin.condVal; if(skin.condType === 'totalCoins') return window.GameData.stats.totalCoins >= skin.condVal; if(skin.condType === 'totalGames') return window.GameData.stats.totalGames >= skin.condVal; if(skin.condType === 'totalDeaths') return window.GameData.stats.totalDeaths >= skin.condVal; return false; }

  // 개별 업그레이드 항목 UI 갱신
  function updateUpgradeItemUI(upgradeKey) {
    const info = window.ItemUpgrades?.getUpgradeInfo?.(upgradeKey);
    if (!info) return;

    const container = document.getElementById(`upgrade-${upgradeKey}`);
    if (!container) return;

    const levelEl = container.querySelector('.upgrade-level');
    const previewEl = container.querySelector('.stat-preview');
    const btnEl = container.querySelector('.btn-upgrade');

    if (levelEl) {
      levelEl.innerText = `Lv.${info.currentLevel}/${info.maxLevel}`;
    }

    if (previewEl) {
      if (info.isMaxed) {
        previewEl.innerText = `${info.formatValue(info.currentValue)} (MAX)`;
      } else {
        previewEl.innerText = `${info.formatValue(info.currentValue)} → ${info.formatValue(info.nextValue)}`;
      }
    }

    if (btnEl) {
      if (info.isMaxed) {
        btnEl.innerText = 'MAX';
        btnEl.disabled = true;
        btnEl.classList.add('disabled');
        btnEl.onclick = null;
      } else {
        const canAfford = window.GameData.coins >= info.cost;
        btnEl.innerText = `${info.cost} 🪙`;
        btnEl.disabled = !canAfford;
        btnEl.classList.toggle('disabled', !canAfford);
        btnEl.onclick = () => buyItemUpgrade(upgradeKey);
      }
    }
  }

  // 아이템 업그레이드 구매
  function buyItemUpgrade(upgradeKey) {
    const result = window.ItemUpgrades?.purchase?.(upgradeKey, window.GameData);
    if (!result) return;

    if (result.success) {
      window.Sound?.sfx('coin');
      window.showToast?.('UPGRADE PURCHASED', 'info', 750);
      window.updateUpgradeUI();
      window.updateShopUI?.();
    } else {
      if (result.message === 'Not enough coins') {
        window.showToast?.('Not enough coins!', 'warn', 600);
      } else {
        console.warn('[Shop] Upgrade failed:', result.message);
      }
    }
  }

  window.updateUpgradeUI = function() {
    const shopCoins = document.getElementById('shop-coins');
    const shopGems = document.getElementById('shop-gems');
    if (shopCoins) shopCoins.innerText = window.GameData.coins.toLocaleString();
    if (shopGems) shopGems.innerText = window.GameData.gems.toLocaleString();

    // 4개 아이템 업그레이드 UI 갱신
    updateUpgradeItemUI('boosterDistance');
    updateUpgradeItemUI('magnetDuration');
    updateUpgradeItemUI('magnetRange');
    updateUpgradeItemUI('shieldDropChance');
  };

  window.renderSkinList = function() { const list = document.getElementById('skin-list-container'); list.innerHTML = ''; const skins = window.SKINS || []; skins.forEach(skin => { const isOwned = window.GameData.unlockedSkins.includes(skin.id); const isEquipped = window.GameData.equippedSkin === skin.id; const conditionMet = checkUnlockCondition(skin); const el = document.createElement('div'); el.className = `skin-list-item ${isEquipped ? 'equipped' : ''}`; let actionHTML = ''; if (isOwned) { actionHTML = isEquipped ? `<button class=\"btn-buy btn-equipped\">EQUIPPED</button>` : `<button class=\"btn-buy btn-equip\" onclick=\"window.equipSkin(${skin.id})\">EQUIP</button>`; } else { const coinClass = conditionMet ? 'btn-coin' : 'btn-coin locked'; const coinText = conditionMet ? `${skin.coinPrice} 🪙` : `🔒 ${skin.condText}`; const coinAction = conditionMet ? `onclick=\"window.buySkinWithCoin(${skin.id})\"` : ''; if(skin.coinPrice > 0 || skin.gemPrice > 0) { actionHTML = `<div class=\"skin-actions\"><button class=\"btn-buy btn-gem\" onclick=\"window.buySkinWithGem(${skin.id})\">${skin.gemPrice} 💎</button><button class=\"btn-buy ${coinClass}\" ${coinAction}>${coinText}</button></div>`; } else { actionHTML = `<button class=\"btn-buy btn-coin\" onclick=\"window.buySkinWithCoin(${skin.id})\">GET FREE</button>`; } } const previewStyles = [`background:${skin.color}`]; if (skin.sprite) { previewStyles.push(`background-image:url('${skin.sprite}')`); previewStyles.push('background-size: cover'); previewStyles.push('background-position: center'); previewStyles.push('background-repeat: no-repeat'); } el.innerHTML = `<div class=\"skin-header\"><div class=\"skin-info-left\"><div class=\"skin-preview\" style=\"${previewStyles.join(';')}\"></div><div class=\"skin-details\"><span class=\"skin-name\">${skin.name}</span><span class=\"skin-rarity rarity-${skin.rarity}\">${skin.rarity}</span></div></div></div><div class=\"skin-desc\">${skin.desc}</div>${actionHTML}`; list.appendChild(el); }); }

  window.buySkinWithCoin = (id) => { const skin = (window.SKINS || []).find(s=>s.id===id); if (!skin) return; if (!checkUnlockCondition(skin)) { alert(`Locked: ${skin.condText}`); return; } if (window.GameData.coins >= skin.coinPrice) { window.GameData.coins -= skin.coinPrice; window.GameData.unlockedSkins.push(id); window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); window.renderSkinList(); window.updateUpgradeUI(); window.Sound?.sfx('coin'); } else alert("Not enough coins"); };

  window.buySkinWithGem = (id) => { const skin = (window.SKINS || []).find(s=>s.id===id); if (!skin) return; if (window.GameData.gems >= skin.gemPrice) { window.GameData.gems -= skin.gemPrice; window.GameData.unlockedSkins.push(id); window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); window.renderSkinList(); window.updateUpgradeUI(); window.Sound?.sfx('coin'); } else alert("Not enough gems!"); };

  window.equipSkin = (id) => { window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); window.renderSkinList(); window.Sound?.sfx('btn'); };

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
  const equippedSkinId = Number(window.GameData?.equippedSkin ?? 0);
  const currentSkin = (window.SKINS || []).find(s => Number(s.id) === equippedSkinId) || (window.SKINS || [])[0];
  if (lobbyChar) {
    const baseColor = currentSkin?.color || '#333';
    lobbyChar.style.background = baseColor;
    lobbyChar.style.border = '';
    lobbyChar.style.boxShadow = '';
    lobbyChar.style.backgroundImage = '';
    lobbyChar.style.backgroundSize = '';
    lobbyChar.style.backgroundRepeat = '';
    lobbyChar.style.backgroundPosition = '';
    lobbyChar.innerHTML = currentSkin?.emoji || '';

    if (currentSkin?.sprite) {
      lobbyChar.style.backgroundImage = `url('${currentSkin.sprite}')`;
      lobbyChar.style.backgroundSize = 'contain';
      lobbyChar.style.backgroundRepeat = 'no-repeat';
      lobbyChar.style.backgroundPosition = 'center';
      // 이미지가 로드되지 않아도 색상/네온 외곽선이 유지되도록 텍스트는 비움
      lobbyChar.innerHTML = '';
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

  window.updateUpgradeUI();
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
    'magnet_enhance': '⏱️',  // 자석 지속시간 강화
    'booster_enhance': '🚀', // 부스터 거리 강화
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
    window.Sound?.sfx('coin');
    window.showToast?.(`${treasure.name} PURCHASED!`, 'info', 800);
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
  window.Sound?.sfx('btn');
  window.showToast?.('TREASURE EQUIPPED!', 'info', 600);
};

// === [NEW] 보물 해제 ===
window.unequipTreasure = function(slot) {
  if (slot < 0 || slot > 1) return;
  window.GameData.equippedTreasures[slot] = null;
  window.SaveManager.persist(window.GameData);
  window.renderTreasureList();
  window.updateLobbyUI?.();
  window.Sound?.sfx('btn');
};
