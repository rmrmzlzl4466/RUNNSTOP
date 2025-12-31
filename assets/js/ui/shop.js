// UI shop + upgrades + skins (extracted from game.js)

  function checkUnlockCondition(skin) {
    if (skin.condType === 'none') return true;
    if (skin.condType === 'maxDist') return window.GameData.stats.maxDist >= skin.condVal;
    if (skin.condType === 'totalCoins') return window.GameData.stats.totalCoins >= skin.condVal;
    if (skin.condType === 'totalGames') return window.GameData.stats.totalGames >= skin.condVal;
    if (skin.condType === 'totalDeaths') return window.GameData.stats.totalDeaths >= skin.condVal;
    return false;
  }

  function getTreasureStateClass(isOwned, isEquipped) {
    if (isEquipped) return 'equipped';
    if (isOwned) return 'owned';
    return '';
  }

  function buildSkinActionHTML(skin, isOwned, isEquipped, conditionMet) {
    if (isOwned) {
      return isEquipped
        ? `<button class="btn-buy btn-equipped">EQUIPPED</button>`
        : `<button class="btn-buy btn-equip" onclick="window.equipSkin(${skin.id})">EQUIP</button>`;
    }

    const coinClass = conditionMet ? 'btn-coin' : 'btn-coin locked';
    const coinText = conditionMet ? `${skin.coinPrice} C` : `LOCKED ${skin.condText}`;
    const coinAction = conditionMet ? `onclick="window.buySkinWithCoin(${skin.id})"` : '';
    if (skin.coinPrice > 0 || skin.gemPrice > 0) {
      return `<div class="skin-actions"><button class="btn-buy btn-gem" onclick="window.buySkinWithGem(${skin.id})">${skin.gemPrice} G</button><button class="btn-buy ${coinClass}" ${coinAction}>${coinText}</button></div>`;
    }
    return `<button class="btn-buy btn-coin" onclick="window.buySkinWithCoin(${skin.id})">GET FREE</button>`;
  }

  function buildTreasureActionHTML(treasure, isOwned, isEquipped, equippedSlot) {
    if (isEquipped) {
      return `<button class="btn-common" style="background:#e74c3c;" onclick="window.unequipTreasure(${equippedSlot})">UNEQUIP</button>`;
    }
    if (isOwned) {
      return `<button class="btn-common btn-equip" onclick="window.equipTreasure('${treasure.id}')">EQUIP</button>`;
    }
    return `<button class="btn-common" onclick="window.buyTreasure('${treasure.id}')">${treasure.price.toLocaleString()} C</button>`;
  }

  function renderList(container, items, renderItem) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach((item) => {
      const el = renderItem(item);
      if (el) container.appendChild(el);
    });
  }

  const UPGRADE_KEYS = ['boosterDistance', 'magnetDuration', 'magnetRange', 'shieldDropChance'];

  function updateUpgradeItemUI(upgradeKey) {
    const info = window.ItemUpgrades?.getUpgradeInfo?.(upgradeKey);
    if (!info) return;

    const container = window.ShopUI?.cache?.upgradeEls?.[upgradeKey] || document.getElementById(`upgrade-${upgradeKey}`);
    if (!container) return;

    const cached = window.ShopUI?.cache?.upgradeNodes?.[upgradeKey];
    const levelEl = cached?.level || container.querySelector('.upgrade-level');
    const previewEl = cached?.preview || container.querySelector('.stat-preview');
    const btnEl = cached?.button || container.querySelector('.btn-upgrade');

    if (levelEl) {
      levelEl.innerText = `Lv.${info.currentLevel}/${info.maxLevel}`;
    }

    if (previewEl) {
      if (info.isMaxed) {
        previewEl.innerText = `${info.formatValue(info.currentValue)} (MAX)`;
      } else {
        previewEl.innerText = `${info.formatValue(info.currentValue)} -> ${info.formatValue(info.nextValue)}`;
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
        btnEl.innerText = `${info.cost} C`;
        btnEl.disabled = !canAfford;
        btnEl.classList.toggle('disabled', !canAfford);
        btnEl.onclick = () => buyItemUpgrade(upgradeKey);
      }
    }
  }

  // Purchase an upgrade item.
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
    window.ShopUI?.ensureInit?.();
    window.ShopUI?.renderCurrency?.();

    // Update all upgrade entries.
    UPGRADE_KEYS.forEach((key) => updateUpgradeItemUI(key));
  };

  window.renderSkinList = function() {
    window.ShopUI?.ensureInit?.();
    const list = window.ShopUI?.cache?.skinList || document.getElementById('skin-list-container');
    const skins = window.SKINS || [];
    renderList(list, skins, (skin) => {
      const isOwned = window.GameData.unlockedSkins.includes(skin.id);
      const isEquipped = window.GameData.equippedSkin === skin.id;
      const conditionMet = checkUnlockCondition(skin);
      const el = document.createElement('div');
      el.className = `skin-list-item ${isEquipped ? 'equipped' : ''}`;

      const actionHTML = buildSkinActionHTML(skin, isOwned, isEquipped, conditionMet);

      const previewStyles = [`background:${skin.color}`];
      if (skin.sprite) {
        previewStyles.push(`background-image:url('${skin.sprite}')`);
        previewStyles.push('background-size: cover');
        previewStyles.push('background-position: center');
        previewStyles.push('background-repeat: no-repeat');
      }

      el.innerHTML = `<div class="skin-header"><div class="skin-info-left"><div class="skin-preview" style="${previewStyles.join(';')}"></div><div class="skin-details"><span class="skin-name">${skin.name}</span><span class="skin-rarity rarity-${skin.rarity}">${skin.rarity}</span></div></div></div><div class="skin-desc">${skin.desc}</div>${actionHTML}`;
      return el;
    });
  }

  window.buySkinWithCoin = (id) => { const skin = (window.SKINS || []).find(s=>s.id===id); if (!skin) return; if (!checkUnlockCondition(skin)) { alert(`Locked: ${skin.condText}`); return; } if (window.GameData.coins >= skin.coinPrice) { window.GameData.coins -= skin.coinPrice; window.GameData.unlockedSkins.push(id); window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); window.renderSkinList(); window.updateUpgradeUI(); window.updateLobbyUI?.(); window.Sound?.sfx('coin'); } else alert("Not enough coins"); };

  window.buySkinWithGem = (id) => { const skin = (window.SKINS || []).find(s=>s.id===id); if (!skin) return; if (window.GameData.gems >= skin.gemPrice) { window.GameData.gems -= skin.gemPrice; window.GameData.unlockedSkins.push(id); window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); window.renderSkinList(); window.updateUpgradeUI(); window.updateLobbyUI?.(); window.Sound?.sfx('coin'); } else alert("Not enough gems!"); };

  window.equipSkin = (id) => { window.GameData.equippedSkin = id; window.SaveManager.persist(window.GameData); window.renderSkinList(); window.updateLobbyUI?.(); window.Sound?.sfx('btn'); };

// === Lobby UI update ===
window.updateLobbyUI = function() {
  // Currency display.
  const lobbyCoins = document.getElementById('lobby-coins');
  const lobbyGems = document.getElementById('lobby-gems');
  if (lobbyCoins) lobbyCoins.innerText = window.GameData.coins.toLocaleString();
  if (lobbyGems) lobbyGems.innerText = window.GameData.gems.toLocaleString();

  // Character preview.
  const lobbyChar = document.getElementById('lobby-char');
  const skinNameEl = document.getElementById('lobby-skin-name');
  const equippedSkinId = Number(window.GameData?.equippedSkin ?? 0);
  const currentSkin = (window.SKINS || []).find(s => Number(s.id) === equippedSkinId) || (window.SKINS || [])[0];
  if (lobbyChar) {
    const baseColor = currentSkin?.color || '#333';
    // Reset to solid color if a sprite is not used.
    lobbyChar.style.backgroundColor = baseColor;
    lobbyChar.style.backgroundImage = 'none';
    lobbyChar.style.backgroundSize = '';
    lobbyChar.style.backgroundRepeat = '';
    lobbyChar.style.backgroundPosition = '';
    lobbyChar.innerHTML = currentSkin?.emoji || '';

    if (currentSkin?.sprite) {
      lobbyChar.style.backgroundImage = `url('${currentSkin.sprite}')`;
      lobbyChar.style.backgroundSize = 'contain';
      lobbyChar.style.backgroundRepeat = 'no-repeat';
      lobbyChar.style.backgroundPosition = 'center';
      lobbyChar.innerHTML = '';
    }
  }
  if (skinNameEl && currentSkin) {
    skinNameEl.innerText = currentSkin.name;
  }

  // Treasure slots.
  const slots = [document.getElementById('lobby-slot-0'), document.getElementById('lobby-slot-1')];
  const equipped = window.GameData.equippedTreasures || [null, null];

  slots.forEach((slot, idx) => {
    if (!slot) return;
    const treasureId = equipped[idx];
    const treasure = treasureId ? window.getTreasureById?.(treasureId) : null;

    const iconEl = slot.querySelector('.slot-icon');
    if (treasure) {
      slot.classList.add('filled');
      if (iconEl) iconEl.innerHTML = getTreasureIconHTML();
    } else {
      slot.classList.remove('filled');
      if (iconEl) iconEl.innerText = '+';
    }
  });
};

// === Shop UI cache ===
window.ShopUI = {
  cache: {
    currency: null,
    upgradeEls: {},
    upgradeNodes: {},
    skinList: null,
    treasureList: null
  },
  ensureInit() {
    if (this.cache.currency) return;
    this.init();
  },
  init() {
    const coinEl = document.getElementById('shop-coins');
    const gemEl = document.getElementById('shop-gems');
    this.cache.currency = { coinEl, gemEl };
    this.cache.skinList = document.getElementById('skin-list-container');
    this.cache.treasureList = document.getElementById('treasure-list-container');

    const upgradeKeys = UPGRADE_KEYS;
    upgradeKeys.forEach((key) => {
      const container = document.getElementById(`upgrade-${key}`);
      if (!container) return;
      this.cache.upgradeEls[key] = container;
      this.cache.upgradeNodes[key] = {
        level: container.querySelector('.upgrade-level'),
        preview: container.querySelector('.stat-preview'),
        button: container.querySelector('.btn-upgrade')
      };
    });
  },
  renderCurrency() {
    const coinEl = this.cache.currency?.coinEl || document.getElementById('shop-coins');
    const gemEl = this.cache.currency?.gemEl || document.getElementById('shop-gems');
    if (coinEl) coinEl.innerText = window.GameData.coins.toLocaleString();
    if (gemEl) gemEl.innerText = window.GameData.gems.toLocaleString();
  }
};

window.updateShopUI = function() {
  window.ShopUI?.ensureInit?.();
  window.ShopUI?.renderCurrency?.();
  window.updateUpgradeUI();
};

// === Treasure list ===
window.renderTreasureList = function() {
  window.ShopUI?.ensureInit?.();
  const container = window.ShopUI?.cache?.treasureList || document.getElementById('treasure-list-container');
  const treasures = window.TREASURES || [];
  const owned = window.GameData.unlockedTreasures || [];
  const equipped = window.GameData.equippedTreasures || [null, null];
  renderList(container, treasures, (t) => {
    const isOwned = owned.includes(t.id);
    const isEquipped = equipped.includes(t.id);
    const equippedSlot = equipped.indexOf(t.id);

    const stateClass = getTreasureStateClass(isOwned, isEquipped);
    const actionHTML = buildTreasureActionHTML(t, isOwned, isEquipped, equippedSlot);

    const el = document.createElement('div');
    el.className = `treasure-item ${stateClass}`;
    el.innerHTML = `
      <div class="treasure-info">
        <span class="treasure-name">${getTreasureIconHTML()} ${t.name}</span>
        <span class="treasure-desc rarity-${t.rarity}">[${t.rarity}] ${t.desc}</span>
      </div>
      <div class="treasure-actions">${actionHTML}</div>
    `;
    return el;
  });
};


// Treasure icon fallback (ASCII).
// Treasure icon image (temporary single asset).
function getTreasureIconHTML() {
  return '<img class="treasure-icon" src="assets/images/treasures/treasure_01.png" alt="treasure">';
}

// === Treasure purchase ===
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

// === Treasure equip ===
window.equipTreasure = function(id) {
  const equipped = window.GameData.equippedTreasures || [null, null];

  // Find an empty slot.
  let slot = equipped.indexOf(null);
  if (slot === -1) {
    // Replace the first slot if no empty slot exists.
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

// === Treasure unequip ===
window.unequipTreasure = function(slot) {
  if (slot < 0 || slot > 1) return;
  window.GameData.equippedTreasures[slot] = null;
  window.SaveManager.persist(window.GameData);
  window.renderTreasureList();
  window.updateLobbyUI?.();
  window.Sound?.sfx('btn');
};

// Shop entry point for navigation
window.openShop = function(defaultTab = 'upgrade') {
  window.updateShopUI?.();
  if (typeof window.switchTab === 'function') {
    window.switchTab(defaultTab);
  }
};




























