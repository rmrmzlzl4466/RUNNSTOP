/**
 * Debug Overlay Module (REQ-A)
 *
 * Shows effective config values with their sources in a HUD overlay.
 * Toggle: F2 (PC) or "Show Effective Overlay" checkbox in QA tab
 */
window.GameModules = window.GameModules || {};

(function() {
  'use strict';

  let overlayVisible = false;
  let overlayElement = null;
  let updateInterval = null;

  // Source color coding
  const SOURCE_COLORS = {
    override: '#ff6b6b',  // Red - user override
    stage: '#ffd93d',     // Yellow - stage tuning
    qa: '#6bcb77',        // Green - QA sliders
    fallback: '#4d96ff', // Blue - defaults
    meta: '#888888'       // Gray - metadata
  };

  /**
   * Create the overlay DOM element
   */
  function createOverlay() {
    if (overlayElement) return overlayElement;

    const overlay = document.createElement('div');
    overlay.id = 'effective-config-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 10000;
      max-height: 80vh;
      overflow-y: auto;
      pointer-events: none;
      display: none;
      min-width: 320px;
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    overlay.innerHTML = `
      <div style="font-weight: bold; font-size: 11px; margin-bottom: 6px; border-bottom: 1px solid #444; padding-bottom: 4px;">
        EFFECTIVE CONFIG
        <span style="float: right; font-size: 9px; color: #888;">[F2 to toggle]</span>
      </div>
      <div id="overlay-meta" style="margin-bottom: 8px; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 3px;"></div>
      <div style="display: flex; gap: 8px; margin-bottom: 6px; font-size: 9px;">
        <span><span style="color:${SOURCE_COLORS.override};">&#9632;</span> override</span>
        <span><span style="color:${SOURCE_COLORS.stage};">&#9632;</span> stage</span>
        <span><span style="color:${SOURCE_COLORS.qa};">&#9632;</span> qa</span>
        <span><span style="color:${SOURCE_COLORS.fallback};">&#9632;</span> fallback</span>
      </div>
      <table id="overlay-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #444;">
            <th style="text-align: left; padding: 2px 4px;">Key</th>
            <th style="text-align: right; padding: 2px 4px;">Value</th>
            <th style="text-align: center; padding: 2px 4px; width: 50px;">Source</th>
          </tr>
        </thead>
        <tbody id="overlay-tbody"></tbody>
      </table>
    `;

    document.body.appendChild(overlay);
    overlayElement = overlay;
    return overlay;
  }

  /**
   * Format value for display
   */
  function formatValue(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(3);
    }
    if (typeof value === 'object') {
      // For theme/gimmick objects
      try {
        const entries = Object.entries(value);
        if (entries.length <= 3) {
          return entries.map(([k, v]) => `${k}:${v}`).join(' ');
        }
        return JSON.stringify(value).substring(0, 30) + '...';
      } catch (e) {
        return '[object]';
      }
    }
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value).substring(0, 20);
  }

  /**
   * Update overlay content
   */
  function updateOverlay() {
    if (!overlayElement || !overlayVisible) return;

    const StageConfig = window.GameModules?.StageConfig;
    if (!StageConfig) return;

    const effective = StageConfig.getEffective?.() ?? {};
    const sources = StageConfig.getEffectiveSources?.() ?? {};

    // Merge itemUpgrades from runtime for UPGRADES category
    const runtime = window.Game?.runtime;
    if (runtime?.itemUpgrades) {
      effective.boosterDistanceMult = runtime.itemUpgrades.boosterDistanceMult ?? 1.0;
      effective.magnetDurationBonusSec = runtime.itemUpgrades.magnetDurationBonusSec ?? 0;
      effective.magnetRangeMult = runtime.itemUpgrades.magnetRangeMult ?? 1.0;
      effective.shieldDropChanceBonus = runtime.itemUpgrades.shieldDropChanceBonus ?? 0;
      sources.boosterDistanceMult = 'stage';  // Calculated at run start
      sources.magnetDurationBonusSec = 'stage';
      sources.magnetRangeMult = 'stage';
      sources.shieldDropChanceBonus = 'stage';
    }
    if (runtime?.treasureCoinBonus !== undefined) {
      effective.treasureCoinBonus = runtime.treasureCoinBonus;
      sources.treasureCoinBonus = 'stage';
    }

    // Update meta section
    const metaEl = document.getElementById('overlay-meta');
    if (metaEl) {
      const isLoop = effective._isLoop ? ' (LOOP)' : '';
      metaEl.innerHTML = `
        <div><b>Stage:</b> ${effective._stageId} - ${effective._stageName || 'Unknown'}${isLoop}</div>
        <div><b>Loop:</b> ${effective._loopCount} | <b>Scale:</b> ${(effective._loopScale || 1).toFixed(2)}</div>
      `;
    }

    // Update table
    const tbody = document.getElementById('overlay-tbody');
    if (!tbody) return;

    // Define display order and categories
    const categories = {
      'TIMING (Global)': ['runPhaseDuration', 'stopPhaseDuration', 'firstWarningTimeBase', 'warningTimeBase', 'warningTimeMin', 'warningTimeMult'],
      'SPEED (Stage)': ['stormSpeedMult', 'baseSpeedMult', 'stormSpeed'],
      'ECONOMY (Stage)': ['coinRate', 'barrierRate', 'boosterRate', 'magnetRate', 'scoreMult'],
      'PHYSICS (Global)': ['friction', 'stopFriction', 'baseAccel', 'turnAccelMult'],
      'THEME/GIMMICK': ['theme', 'gimmick'],
      'UPGRADES': ['boosterDistanceMult', 'magnetDurationBonusSec', 'magnetRangeMult', 'shieldDropChanceBonus', 'treasureCoinBonus']
    };

    let html = '';

    Object.entries(categories).forEach(([category, keys]) => {
      // Category header
      html += `<tr><td colspan="3" style="padding: 4px 0 2px 0; font-weight: bold; color: #aaa; font-size: 9px; border-top: 1px solid #333;">${category}</td></tr>`;

      keys.forEach(key => {
        const value = effective[key];
        const source = sources[key] || 'fallback';
        const color = SOURCE_COLORS[source] || '#fff';

        // Format theme/gimmick specially
        let displayValue = formatValue(value);
        if (key === 'theme' && value) {
          displayValue = value.paletteId || JSON.stringify(value);
        }
        if (key === 'gimmick' && value) {
          displayValue = value.id || JSON.stringify(value);
        }

        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
            <td style="padding: 2px 4px; color: #ccc;">${key}</td>
            <td style="padding: 2px 4px; text-align: right; color: #fff;">${displayValue}</td>
            <td style="padding: 2px 4px; text-align: center; color: ${color}; font-size: 9px;">${source}</td>
          </tr>
        `;
      });
    });

    tbody.innerHTML = html;
  }

  /**
   * Show overlay
   */
  function show() {
    createOverlay();
    overlayElement.style.display = 'block';
    overlayVisible = true;
    updateOverlay();

    // Start update interval
    if (!updateInterval) {
      updateInterval = setInterval(updateOverlay, 100); // Update 10x/sec
    }
  }

  /**
   * Hide overlay
   */
  function hide() {
    if (overlayElement) {
      overlayElement.style.display = 'none';
    }
    overlayVisible = false;

    // Stop update interval
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
    }
  }

  /**
   * Toggle overlay
   */
  function toggle() {
    if (overlayVisible) {
      hide();
    } else {
      show();
    }
    return overlayVisible;
  }

  /**
   * Check if overlay is visible
   */
  function isVisible() {
    return overlayVisible;
  }

  // === Keyboard Handler ===
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      toggle();

      // Update checkbox if exists
      const checkbox = document.getElementById('qa-show-overlay');
      if (checkbox) {
        checkbox.checked = overlayVisible;
      }
    }
  });

  // === Export ===
  window.GameModules.DebugOverlay = {
    show,
    hide,
    toggle,
    isVisible,
    updateOverlay
  };

  // Also attach to window for easy console access
  window.toggleEffectiveOverlay = toggle;

})();
