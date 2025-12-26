(function() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  let canvasWidth, canvasHeight;

  function resize() {
    const container = document.getElementById('game-container');
    canvasWidth = container.offsetWidth; canvasHeight = container.offsetHeight;

    // Cap devicePixelRatio to reduce iOS Retina overdraw (target ~1.5–2.0)
    const rawDpr = window.devicePixelRatio || 1;
    const cappedDpr = Math.min(rawDpr, 2);

    canvas.width = Math.floor(canvasWidth * cappedDpr);
    canvas.height = Math.floor(canvasHeight * cappedDpr);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    // Normalize drawing space so game logic can stay in CSS pixels
    ctx.setTransform(cappedDpr, 0, 0, cappedDpr, 0, 0);

    window.CanvasSize = { width: canvasWidth, height: canvasHeight, dpr: cappedDpr, ctx };

    // Notify main.js that the canvas has been resized
    if (window.syncCanvasSize) {
      window.syncCanvasSize();
    }
  }

  window.addEventListener('resize', resize);
  resize();
})();

  
