(function() {
  'use strict';

  window.Game = window.Game || {};

  // === Sprite Caches ===
  const skinSpriteCache = new Map();
  const itemSpriteCache = new Map();

  // === Quality Toggles ===
  const UA = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const IS_IOS = /iP(ad|hone|od)/i.test(UA);
  let smoothedFps = 60;
  let lastFrameTs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  let lowQualityUntil = 0;

  const ITEM_SPRITES = {
    coin: './assets/images/icons/coin.png',
    gem: './assets/images/icons/gem.png',
    booster: './assets/images/icons/boost.png',
    magnet: './assets/images/icons/magnet.png',
    barrier: './assets/images/icons/barrier.png',
    bit: './assets/images/icons/bit.png',
    big_gem: './assets/images/icons/chest.png'  // [위험한 유혹] 왕보석
  };

  function preloadItemSprites() {
    for (const [type, path] of Object.entries(ITEM_SPRITES)) {
      if (!itemSpriteCache.has(type)) {
        const img = new Image();
        img.onerror = () => {
          img.error = true;
          console.warn(`[ITEM] Failed to load sprite: ${path}`);
        };
        img.src = path;
        itemSpriteCache.set(type, img);
      }
    }
  }

  function getItemSprite(type) {
    return itemSpriteCache.get(type) || null;
  }

  function getSkinSpriteImage(skin) {
    if (!skin?.sprite) return null;
    let img = skinSpriteCache.get(skin.sprite);
    if (!img) {
      img = new Image();
      img.onerror = () => {
        img.error = true;
        console.warn(`[SKIN] Failed to load sprite: ${skin.sprite}`);
        skin.useSprite = false;
      };
      img.src = skin.sprite;
      skinSpriteCache.set(skin.sprite, img);
    }
    if (skin.useSprite === false) return null;
    if (img && img.complete && (img.naturalWidth === 0 || img.naturalHeight === 0 || img.error)) {
      skin.useSprite = false;
      return null;
    }
    return img;
  }

  // Preload on init
  preloadItemSprites();

  function trackFrame() {
    if (typeof performance === 'undefined' || !performance.now) return;
    const now = performance.now();
    if (lastFrameTs) {
      const fps = 1000 / Math.max(1, (now - lastFrameTs));
      smoothedFps = smoothedFps * 0.9 + fps * 0.1;
      // If FPS dips (common on iOS), hold low-quality mode for a short window
      if (smoothedFps < 52) {
        lowQualityUntil = now + 2000;
      }
    }
    lastFrameTs = now;
  }

  function shouldDisableShadows() {
    if (IS_IOS) return true;
    if (typeof performance === 'undefined' || !performance.now) return false;
    return performance.now() < lowQualityUntil;
  }

/**
 * Interpolates a hex color towards black.
 * @param {string} hex - The starting hex color (e.g., "#RRGGBB").
 * @param {number} t - The interpolation factor (0=original, 1=black).
 * @returns {string} The new interpolated hex color.
 */
function lerpColorToBlack(hex, t) {
  if (!hex) return '#000000';
  t = Math.max(0, Math.min(1, t));

  // Remove '#' and parse to R, G, B
  const hexVal = hex.startsWith('#') ? hex.substring(1) : hex;
  const r = parseInt(hexVal.substring(0, 2), 16);
  const g = parseInt(hexVal.substring(2, 4), 16);
  const b = parseInt(hexVal.substring(4, 6), 16);

  // Interpolate towards 0
  const newR = Math.floor(r * (1 - t));
  const newG = Math.floor(g * (1 - t));
  const newB = Math.floor(b * (1 - t));

  // Convert back to hex string
  const toHex = (c) => ('0' + c.toString(16)).slice(-2);
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

  // === Renderer Module ===
  const Renderer = {
    ctx: null,
    canvas: null,

    init: function(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
    },

    draw: function(state) {
      const {
        cameraY,
        cameraZoom = 1.0,    // 줌 레벨 (기본값 1.0)
        pivotX = 0,          // 줌 피벗 X (플레이어 X 위치)
        pivotY = 0,          // 줌 피벗 Y (화면상 플레이어 Y 위치)
        canvasWidth,
        canvasHeight,
        storm,
        items,
        player,
        gameState,
        targetColorIndex,
        currentThemeIdx,
        cycleTimer,
        qaConfig,
        COLS,
        CELL_W,
        CELL_H,
        STATE
      } = state;

      const ctx = this.ctx;
      const canvas = this.canvas;
      const getThemes = () => window.THEMES ?? window.GameConfig?.THEMES ?? [];
      const getSkins = () => window.SKINS ?? window.GameConfig?.SKINS ?? [];

      trackFrame();
      const useSoftShadows = !shouldDisableShadows();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // === [Dynamic Camera: Pivot-based Zoom] ===
      // 돌리 줌 효과: 플레이어를 앵커(피벗)로 삼아 배경만 확대/축소
      // 렌더링 파이프라인:
      // 1. 피벗 포인트(플레이어 화면 위치)로 이동
      // 2. 줌(스케일) 적용
      // 3. 피벗 포인트에서 다시 돌아옴
      // 4. 카메라 Y 오프셋 적용
      ctx.translate(pivotX, pivotY);
      ctx.scale(cameraZoom, cameraZoom);
      ctx.translate(-pivotX, -pivotY);
      ctx.translate(0, -cameraY);

      // === Tile Rendering ===
      // 줌 레벨에 따라 렌더링 범위 조정 (줌 아웃 시 더 많은 타일 필요)
      const zoomFactor = Math.max(1.0, 1.0 / cameraZoom);  // 줌 아웃 시 확장
      const extraRows = Math.ceil((zoomFactor - 1) * (canvasHeight / CELL_H) / 2) + 3;
      const startRow = Math.floor(cameraY / CELL_H) - extraRows;
      const endRow = startRow + Math.ceil((canvasHeight * zoomFactor) / CELL_H) + extraRows + 2;

      let morphAlpha = 0;
      let targetColor = null;

      if (gameState === STATE.WARNING && targetColorIndex !== -1) {
        const remaining = cycleTimer;
        if (remaining <= qaConfig.morphTrigger) {
          let elapsed = qaConfig.morphTrigger - remaining;
          morphAlpha = elapsed / qaConfig.morphDuration;
          morphAlpha = Math.max(0, Math.min(1, morphAlpha));
        }
        targetColor = getThemes()[currentThemeIdx]?.colors?.[targetColorIndex];
      }

      // Get gimmick module for effects
      const Gimmick = window.GameModules?.Gimmick;
      const safeFadeIntensity = Gimmick?.getSafeFadeIntensity?.(gameState, cycleTimer, qaConfig.stopPhaseDuration) ?? 0;
      const safeFadeGlowColor = Gimmick?.getSafeFadeGlowColor?.() ?? '#00ff00';

      for (let r = startRow; r <= endRow; r++) {
        const rowData = window.Game.LevelManager.getRow(r);
        if (!rowData) continue;

        const palette = getThemes()[rowData.themeIdx]?.colors ?? [];
        const y = r * CELL_H;

        for (let c = 0; c < COLS; c++) {
          // Check for GLITCH_SWAP color override
          const swappedColor = Gimmick?.getSwappedColor?.(r, c);
          const colorIdx = swappedColor !== null ? swappedColor : rowData.colors[c];
          const x = c * CELL_W;

          ctx.fillStyle = palette[colorIdx];
          if (gameState === STATE.STOP && colorIdx !== targetColorIndex) {
            ctx.fillStyle = '#111';
          }
          ctx.fillRect(x, y, CELL_W, CELL_H);

          // SAFE_FADE: Glow effect on safe tiles during STOP phase
          if (gameState === STATE.STOP && colorIdx === targetColorIndex && safeFadeIntensity > 0) {
            ctx.save();
            ctx.globalAlpha = safeFadeIntensity * 0.6;
            ctx.fillStyle = safeFadeGlowColor;
            ctx.fillRect(x, y, CELL_W, CELL_H);
            // Add border glow
            ctx.strokeStyle = safeFadeGlowColor;
            ctx.lineWidth = 2 + safeFadeIntensity * 4;
            ctx.shadowBlur = 10 + safeFadeIntensity * 15;
            ctx.shadowColor = safeFadeGlowColor;
            ctx.strokeRect(x + 2, y + 2, CELL_W - 4, CELL_H - 4);
            ctx.restore();
          }

          // GLITCH_SWAP: Visual glitch effect on swapped tiles
          if (swappedColor !== null) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, CELL_W, CELL_H);
            ctx.restore();
          }

          if (gameState === STATE.WARNING && colorIdx !== targetColorIndex && morphAlpha > 0 && targetColor) {
            if (qaConfig.visualMode === 'A') {
                // A모드: 타일의 원래 색에서 검은색으로 점점 변함
                ctx.fillStyle = lerpColorToBlack(palette[colorIdx], morphAlpha);
                ctx.fillRect(x, y, CELL_W, CELL_H);
            } else {
                // B모드: 타겟 색상으로 덮어씌워짐 (기존)
                ctx.globalAlpha = morphAlpha;
                ctx.fillStyle = targetColor;
                ctx.fillRect(x, y, CELL_W, CELL_H);
                ctx.globalAlpha = 1.0;
            }
          }

          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.strokeRect(x, y, CELL_W, CELL_H);
        }
      }

      // === Item Rendering ===
      this.drawItems(ctx, items, useSoftShadows);

      // === Storm Rendering ===
      this.drawStorm(ctx, storm, canvasWidth, canvasHeight);

      // === Player Rendering ===
      if (!player.isDead) {
        const skins = getSkins();
        const skin = skins.find(s => s.id === window.GameData.equippedSkin) || skins[0];
        const spriteImg = getSkinSpriteImage(skin);
        player.draw(ctx, skin, spriteImg, { useShadows: useSoftShadows });
      }

      // === Floating Texts ===
      this.drawFloatingTexts(ctx);

      ctx.globalAlpha = 1.0;
      ctx.restore();

      // === Matrix-style SlowMo Visual Effects ===
      this.drawSlowMoEffects(ctx, canvasWidth, canvasHeight);
    },

    /**
     * Draw Matrix-style slow motion visual effects
     * - Blue/cyan color overlay (mobile-compatible)
     * - Vignette effect (dark edges)
     * - Radial lines from center (motion emphasis)
     */
    drawSlowMoEffects: function(ctx, canvasWidth, canvasHeight) {
      const SlowMo = window.GameModules?.SlowMo;
      const runtime = window.Game?.runtime;
      const intensity = SlowMo?.getVisualIntensity?.(runtime) ?? 0;

      // Debug: Always show slowmo status (can remove later)
      const slowMoEnabled = window.qaConfig?.slowMo?.enabled;
      const slowMoActive = runtime?.slowMo?.active;
      const phase = runtime?.slowMo?.phase ?? 0;
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = slowMoActive ? '#0f0' : '#888';
      ctx.textAlign = 'left';
      ctx.fillText(`SM: ${slowMoEnabled ? 'ON' : 'OFF'} | Active: ${slowMoActive ? 'Y' : 'N'} | Phase: ${phase} | Int: ${(intensity*100).toFixed(0)}%`, 10, canvasHeight - 30);
      ctx.restore();

      if (intensity <= 0) return;

      ctx.save();

      // 1. Color overlay - cool cyan/blue tint (Matrix-like)
      // 모바일 호환성을 위해 간단한 오버레이 사용
      const overlayAlpha = intensity * 0.2;
      ctx.fillStyle = `rgba(0, 150, 220, ${overlayAlpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 2. 어두운 오버레이로 채도 감소 효과 (모바일 호환)
      const darkAlpha = intensity * 0.15;
      ctx.fillStyle = `rgba(30, 30, 50, ${darkAlpha})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 3. Vignette effect (dark edges)
      const vignetteAlpha = intensity * 0.7;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      const maxDist = Math.max(centerX, centerY) * 1.2;

      const vignette = ctx.createRadialGradient(
        centerX, centerY, maxDist * 0.2,
        centerX, centerY, maxDist
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.6, `rgba(0, 10, 30, ${vignetteAlpha * 0.4})`);
      vignette.addColorStop(1, `rgba(0, 5, 20, ${vignetteAlpha})`);

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // 4. Subtle radial lines (speed/focus effect) - 모바일에서도 가벼움
      if (intensity > 0.4) {
        const lineAlpha = (intensity - 0.4) * 0.2;
        const lineCount = 16;  // 줄여서 성능 개선
        ctx.strokeStyle = `rgba(100, 180, 255, ${lineAlpha})`;
        ctx.lineWidth = 2;

        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2;
          const innerRadius = maxDist * 0.5;
          const outerRadius = maxDist * 1.0;

          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(angle) * innerRadius,
            centerY + Math.sin(angle) * innerRadius
          );
          ctx.lineTo(
            centerX + Math.cos(angle) * outerRadius,
            centerY + Math.sin(angle) * outerRadius
          );
          ctx.stroke();
        }
      }

      // 5. Time indicator border flash
      if (intensity > 0.3) {
        const borderAlpha = intensity * 0.5;
        ctx.strokeStyle = `rgba(0, 200, 255, ${borderAlpha})`;
        ctx.lineWidth = 4 + intensity * 4;
        ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);
      }

      ctx.restore();
    },

    drawItems: function(ctx, items, useSoftShadows) {
      const ICON_SIZE = 32;
      const glowColors = {
        coin: '#f1c40f',
        gem: '#00d2d3',
        booster: '#e74c3c',
        magnet: '#9b59b6',
        barrier: '#3498db',
        big_gem: '#ffd700'  // [위험한 유혹] 왕보석 - 황금색
      };

      const timeNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      items.forEach(it => {
        const bob = Math.sin((timeNow * 0.005) + (it.x * 0.02)) * 3;
        ctx.save();
        ctx.translate(it.x, it.y + bob);

        const sprite = getItemSprite(it.type);
        const glowColor = glowColors[it.type] || '#fff';

        // [위험한 유혹] big_gem 특별 처리
        const isBigGem = it.type === 'big_gem';
        const sizeMultiplier = isBigGem ? 2.0 : 1.0;
        const itemSize = ICON_SIZE * sizeMultiplier;

        // [위험한 유혹] big_gem 황금색 후광 효과
        if (isBigGem) {
          const pulse = Math.sin(timeNow * 0.008) * 0.3 + 0.7;  // 0.4 ~ 1.0 맥동
          const gradient = ctx.createRadialGradient(0, 0, itemSize * 0.3, 0, 0, itemSize * 1.2);
          gradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * pulse})`);
          gradient.addColorStop(0.5, `rgba(255, 180, 0, ${0.3 * pulse})`);
          gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, itemSize * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        if (useSoftShadows) {
          ctx.shadowBlur = isBigGem ? 24 : 12;
          ctx.shadowColor = glowColor;
        } else {
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        if (sprite && sprite.complete && sprite.naturalWidth > 0 && !sprite.error) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          // [위험한 유혹] big_gem은 brightness 필터 적용
          if (isBigGem) {
            ctx.filter = 'brightness(1.5)';
          }
          ctx.drawImage(sprite, -itemSize / 2, -itemSize / 2, itemSize, itemSize);
          if (isBigGem) {
            ctx.filter = 'none';
          }
        } else {
          let char = '';
          if (it.type === 'coin') char = '🪙';
          else if (it.type === 'gem') char = '💎';
          else if (it.type === 'booster') char = '🚀';
          else if (it.type === 'magnet') char = '🧲';
          else if (it.type === 'barrier') char = '🛡️';
          else if (it.type === 'big_gem') char = '💰';  // 왕보석 폴백 이모지
          ctx.font = isBigGem ? "48px Segoe UI Emoji" : "24px Segoe UI Emoji";
          ctx.textAlign = "center";
          ctx.fillText(char, 0, isBigGem ? 16 : 8);
        }

        if (!useSoftShadows) {
          ctx.lineWidth = isBigGem ? 4 : 2.5;
          ctx.strokeStyle = glowColor;
          ctx.beginPath();
          ctx.arc(0, 0, itemSize * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      });
    },

    drawStorm: function(ctx, storm, canvasWidth, canvasHeight) {
      // Check if storm is pulsing (STORM_PULSE gimmick)
      const Gimmick = window.GameModules?.Gimmick;
      const isPulsing = Gimmick?.isStormPulsing?.() ?? false;
      const pulseMult = Gimmick?.getStormPulseMult?.() ?? 1.0;

      // Storm line - brighter when pulsing
      if (isPulsing) {
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(0, storm.y - 2, canvasWidth, 9);
        // Add glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
      }
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, storm.y, canvasWidth, 5);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(20, 0, 0, 0.9)";
      ctx.fillRect(0, storm.y + 5, canvasWidth, canvasHeight * 2);

      // More intense flames when pulsing
      const flameCount = isPulsing ? 25 : 15;
      const flameIntensity = isPulsing ? 0.7 : 0.5;
      for (let i = 0; i < flameCount; i++) {
        const h = Math.random() * (isPulsing ? 150 : 100) + 20;
        const w = Math.random() * 20 + 5;
        const x = Math.random() * canvasWidth;
        ctx.fillStyle = `rgba(255, ${isPulsing ? 50 : 0}, 0, ${Math.random() * flameIntensity})`;
        ctx.fillRect(x, storm.y, w, h);
      }
    },

    drawFloatingTexts: function(ctx) {
      const floatingTexts = window.Game.UI?.getFloatingTexts?.() || [];
      floatingTexts.forEach(ft => {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '900 20px Roboto, sans-serif'; // 크기 증가 (18px → 20px)
        ctx.fillStyle = ft.color;

        if (ft.life > 0.35) {
          ctx.globalAlpha = 1.0;
        } else {
          ctx.globalAlpha = ft.life / 0.35;
        }

        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
    },

    // Expose sprite utilities for external use
    getSkinSpriteImage: getSkinSpriteImage,
    getItemSprite: getItemSprite
  };

  window.Game.Renderer = Renderer;
})();
