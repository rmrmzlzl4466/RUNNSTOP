(function() {
  const canvas = document.getElementById('gameCanvas');
  const surface = document.getElementById('game-surface') || document.getElementById('game-container');
  const container = document.getElementById('game-container');
  if (!canvas || !surface || !container) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  const TARGET_ASPECT = 9 / 16; // Portrait aspect (width / height) = 0.5625
  const MIN_ASPECT = 9 / 21;    // 세로로 긴 화면 허용 (21:9 세로) = 0.4286

  // 터치 디바이스 감지
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function resize() {
    // Fallback to viewport if the container hasn't been laid out yet (prevent zero-sized canvas)
    const containerWidth = container.clientWidth || window.innerWidth || 1;
    const containerHeight = container.clientHeight || window.innerHeight || 1;
    const containerAspect = containerWidth / Math.max(1, containerHeight);

    let surfaceWidth = containerWidth;
    let surfaceHeight = containerHeight;

    // 모바일(터치 디바이스)에서는 전체 화면 사용 (세로로 긴 화면 대응)
    if (isTouchDevice) {
      // 화면 비율이 MIN_ASPECT보다 좁으면 (아주 세로로 긴 화면)
      // 전체 화면을 그대로 사용
      if (containerAspect >= MIN_ASPECT) {
        surfaceWidth = containerWidth;
        surfaceHeight = containerHeight;
      } else {
        // 극단적으로 좁은 화면은 최소 비율 적용
        surfaceWidth = containerWidth;
        surfaceHeight = containerWidth / MIN_ASPECT;
      }
    } else {
      // PC에서는 기존 로직 유지 (16:9 비율)
      if (containerAspect > TARGET_ASPECT) {
        surfaceHeight = containerHeight;
        surfaceWidth = surfaceHeight * TARGET_ASPECT;
      } else {
        surfaceWidth = containerWidth;
        surfaceHeight = surfaceWidth / TARGET_ASPECT;
      }
    }

    // Center the surface inside the container
    surface.style.width = `${surfaceWidth}px`;
    surface.style.height = `${surfaceHeight}px`;
    surface.style.left = `${(containerWidth - surfaceWidth) / 2}px`;
    surface.style.top = `${(containerHeight - surfaceHeight) / 2}px`;

    // Cap devicePixelRatio to reduce iOS Retina overdraw (target ~1.5–2.0)
    const rawDpr = window.devicePixelRatio || 1;
    const cappedDpr = Math.min(rawDpr, 2);

    canvas.width = Math.floor(surfaceWidth * cappedDpr);
    canvas.height = Math.floor(surfaceHeight * cappedDpr);
    canvas.style.width = `${surfaceWidth}px`;
    canvas.style.height = `${surfaceHeight}px`;

    // Normalize drawing space so game logic can stay in CSS pixels
    ctx.setTransform(cappedDpr, 0, 0, cappedDpr, 0, 0);

    window.CanvasSize = { width: surfaceWidth, height: surfaceHeight, dpr: cappedDpr, ctx };

    // Notify main.js that the canvas has been resized
    if (window.syncCanvasSize) {
      window.syncCanvasSize();
    }
  }

  window.addEventListener('resize', resize);
  resize();
})();

  
