// core/particles.js
// 파티클은 '대쉬 중'에만 생성/표시되도록 운용합니다.

// Lightweight particle pool to avoid per-frame array churn (notably on iOS)
const MAX_PARTICLES = 180;
var particles = [];

function spawnParticles(x, y, color, count = 8) {
  if (count <= 0) return;
  const available = Math.max(0, MAX_PARTICLES - particles.length);
  const spawnCount = Math.min(count, available);
  for (let i = 0; i < spawnCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = Math.random() * 6 + 2;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 1.0,
      color
    });
  }
}

// game.js의 render() 내부에서 호출 (ctx.save() ~ ctx.restore() 사이)
function renderParticles(ctx) {
  if (!particles.length) return;
  let lastAlpha = -1;
  let lastColor = '';
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.05;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const roundedX = Math.floor(p.x);
    const roundedY = Math.floor(p.y);
    if (p.life !== lastAlpha) {
      ctx.globalAlpha = p.life;
      lastAlpha = p.life;
    }
    if (p.color !== lastColor) {
      ctx.fillStyle = p.color;
      lastColor = p.color;
    }
    ctx.beginPath();
    ctx.arc(roundedX, roundedY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}
