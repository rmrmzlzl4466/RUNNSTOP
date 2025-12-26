(function() {
  'use strict';

  window.Game = window.Game || {};

  const Physics = {
    // Grid configuration (set from main.js)
    COLS: 5,
    CELL_W: 0,
    CELL_H: 100,

    // Initialize grid dimensions
    init: function(cols, cellW, cellH) {
      if (this._initialized && this.COLS === cols && this.CELL_W === cellW && this.CELL_H === cellH) {
        return;
      }
      this.COLS = cols;
      this.CELL_W = cellW;
      this.CELL_H = cellH;
      this._initialized = true;
    },

    // Update cell width (called on canvas resize)
    setCellWidth: function(cellW) {
      this.CELL_W = cellW;
    },

    /**
     * Check if player is on a safe tile (hitbox-based)
     * @param {Object} player - Player object with x, y, radius
     * @param {number} targetColorIndex - The safe color index
     * @returns {boolean} True if player is safe
     */
    isPlayerOnSafeTile: function(player, targetColorIndex) {
      const CELL_W = this.CELL_W;
      const CELL_H = this.CELL_H;
      const COLS = this.COLS;

      // Safety check: prevent division by zero
      if (!CELL_W || !CELL_H || !player.radius) {
        return false;
      }

      // Player hitbox (shrunk by 30% for forgiving collision)
      const hitboxShrink = player.radius * 0.3;
      const left = player.x - player.radius + hitboxShrink;
      const right = player.x + player.radius - hitboxShrink;
      const top = player.y - player.radius + hitboxShrink;
      const bottom = player.y + player.radius - hitboxShrink;

      // Find all tiles the hitbox overlaps
      const minCol = Math.max(0, Math.floor(left / CELL_W));
      const maxCol = Math.min(COLS - 1, Math.floor(right / CELL_W));
      const minRow = Math.floor(top / CELL_H);
      const maxRow = Math.floor(bottom / CELL_H);

      // Calculate hitbox area
      const hitboxWidth = right - left;
      const hitboxHeight = bottom - top;
      const hitboxArea = hitboxWidth * hitboxHeight;

      // Safety check: prevent division by zero
      if (hitboxArea <= 0) {
        return false;
      }

      let safeArea = 0;

      for (let row = minRow; row <= maxRow; row++) {
        const rowData = window.Game.LevelManager.getRow(row);
        if (!rowData || !rowData.colors) continue;

        for (let col = minCol; col <= maxCol; col++) {
          if (rowData.colors[col] === targetColorIndex) {
            // Calculate overlap between safe tile and hitbox
            const tileLeft = col * CELL_W;
            const tileRight = (col + 1) * CELL_W;
            const tileTop = row * CELL_H;
            const tileBottom = (row + 1) * CELL_H;

            const overlapLeft = Math.max(left, tileLeft);
            const overlapRight = Math.min(right, tileRight);
            const overlapTop = Math.max(top, tileTop);
            const overlapBottom = Math.min(bottom, tileBottom);

            if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
              const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
              safeArea += overlapArea;
            }
          }
        }
      }

      // Safe if configured % of hitbox is on safe tiles
      const safetyThreshold = Math.max(0.1, Math.min(0.9, window.qaConfig?.safetyThreshold ?? 0.5));
      const safeThreshold = safetyThreshold;
      return (safeArea / hitboxArea) >= safeThreshold;
    },

    /**
     * Check safe zone and return result with action needed
     * @param {Object} player - Player object
     * @param {number} targetColorIndex - Safe color index
     * @returns {Object} { isSafe, action: 'none'|'barrier_save'|'die' }
     */
    checkSafeZone: function(player, targetColorIndex) {
      if (player.invincibleTimer > 0) {
        return { isSafe: true, action: 'none' };
      }

      const isSafe = this.isPlayerOnSafeTile(player, targetColorIndex);

      if (isSafe) {
        return { isSafe: true, action: 'none' };
      }

      // Not safe - check barrier
      if (player.hasBarrier) {
        return { isSafe: false, action: 'barrier_save' };
      }

      return { isSafe: false, action: 'die' };
    },

    /**
     * Apply barrier save effect to player
     * @param {Object} player - Player object
     */
    applyBarrierSave: function(player) {
      player.hasBarrier = false;
      player.vy = -1000;
      player.invincibleTimer = 1.5;
    },

    /**
     * Check storm collision
     * @param {Object} player - Player object
     * @param {Object} storm - Storm object with y position
     * @returns {boolean} True if player hit by storm
     */
    checkStormCollision: function(player, storm) {
      if (player.isBoosting) return false;
      return storm.y < player.y + player.radius;
    },

    /**
     * Process item collisions with magnet effect
     * @param {Object} player - Player object
     * @param {Array} items - Array of item objects
     * @param {number} magnetRange - Active magnet range
     * @returns {Array} Array of collected items
     */
    processItemCollisions: function(player, items, magnetRange) {
      const collectedItems = [];

      items.forEach(it => {
        if (!it.active) it.active = true;

        const dx = player.x - it.x;
        const dy = player.y - it.y;
        const distSq = dx * dx + dy * dy;

        // Magnet effect: pull items (except barrier and big_gem) within range
        // big_gem은 자석 면역 - 플레이어가 직접 가서 획득해야 함 (위험한 유혹)
        if (it.type !== 'barrier' && it.type !== 'big_gem' && distSq < magnetRange * magnetRange) {
          const dist = Math.sqrt(distSq);
          if (dist > 0) {
            it.x += (dx / dist) * 12;
            it.y += (dy / dist) * 12;
          }
        }

        // Collision detection
        const collisionDist = player.radius + it.r;
        if (distSq < collisionDist * collisionDist) {
          collectedItems.push(it);
        }
      });

      return collectedItems;
    },

    /**
     * Remove collected items from array (mutates original)
     * @param {Array} items - Original items array (mutated)
     * @param {Array} collected - Collected items to remove
     */
    removeCollectedItems: function(items, collected) {
      if (!Array.isArray(items) || !collected || collected.length === 0) return;
      const collectedSet = new Set(collected);
      for (let i = items.length - 1; i >= 0; i--) {
        if (collectedSet.has(items[i])) {
          items.splice(i, 1);
        }
      }
    },

    /**
     * Filter items behind storm (mutates original)
     * @param {Array} items - Items array (mutated)
     * @param {Object} storm - Storm object
     */
    filterItemsBehindStorm: function(items, storm) {
      if (!Array.isArray(items) || !storm) return;
      const limit = storm.y + 100;
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].y >= limit) {
          items.splice(i, 1);
        }
      }
    },

    /**
     * Calculate storm speed based on player distance
     * @param {number} playerDist - Player distance
     * @param {number} baseSpeed - Base storm speed
     * @returns {number} Current storm speed
     */
    getStormSpeed: function(playerDist, baseSpeed) {
      // Use effective storm speed if loop difficulty is applied
      const effectiveBase = window.qaConfig?._effectiveStormSpeed ?? baseSpeed;
      const difficulty = Math.min(playerDist / 5000, 1.0);
      return effectiveBase + (difficulty * 200);
    }
  };

  window.Game.Physics = Physics;
})();
