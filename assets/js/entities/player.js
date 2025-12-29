class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = 15;
    this.originalRadius = 15;
    this.vx = 0;
    this.vy = 0;
    this.accel = 1500;
    this.maxSpeed = 400;
    this._baseMaxSpeed = null;  // 스테이지 배수 적용 전 기본값 저장
    this.dashForce = 1200;
    this.dashDuration = 0.15;
    this.isDashing = false;
    this.dashTimer = 0;
    this.canDash = true;
    this.cooldownTimer = 0;
    this.cooldownMax = 1.0;
    // [CHARGING SYSTEM] 차징 관련 속성
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.minDashForce = 800;
    this.maxDashForce = 1600;
    this.maxChargeTime = 0.8;
    this.chargeSlowdown = 0.3; // 차징 중 이동속도 감소율
    this.isDead = false;
    this.dist = 0;
    this.sessionScore = 0;
    this.sessionGems = 0;
    this.sessionCoins = 0;
    this.sessionBits = 0;
    this.hasBarrier = false;
    this.isBoosting = false;
    this.boostTargetY = 0;
    this.boostSpeed = 2500;
    this.magnetTimer = 0;
    this.isDying = false;
    this.dyingTimer = 0;
    this.invincibleTimer = 0;
    this.boostInvincibleTimer = 0;      // 부스트 종료 후 무적 시간
    this.boostInvincibleDuration = 1.0; // 부스트 종료 후 무적 지속 시간 (QA 설정)
    this.baseMagnetRange = 100;
    this.coinMult = 1.0;
    this.boundsWidth = 0;
    this.friction = 0.90; // 마찰 계수 (0.80 ~ 0.99)
    this.stopFriction = 0.92; // 정지 시 마찰 계수
    this.turnAccelMult = 2.0; // [추가] 초기값 설정
    this.hasRevive = false; // 보물: 부활
    this.history = [];
    this._lastDashParticleTs = 0;

    // [JFB v2] 저스트 프레임 부스터 (Reflex Mode)
    this.survivalBoosterStartTime = 0;     // 부스터 권한 부여 시점 타임스탬프
    this.survivalBoostDistPerfect = 2000;  // PERFECT 판정 부스트 거리
    this.jfbDelayMin = 0.0;                // Wait Phase 최소 딜레이 (초)
    this.jfbDelayMax = 0.5;                // Wait Phase 최대 딜레이 (초)
    this.jfbWindow = 0.2;                  // Active Window 지속 시간 (초)
    this.jfbRandomDelay = 0;               // 현재 생성된 랜덤 딜레이
    this.jfbActiveStartTime = 0;           // Active Phase 시작 타임스탬프
  }

  setBounds(width) {
    this.boundsWidth = width;
  }

  reset(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.isDead = false;
    this.isDying = false;
    this.dyingTimer = 0;
    this.radius = this.originalRadius;
    this.invincibleTimer = 0;
    this.boostInvincibleTimer = 0;
    this.dist = 0;
    this.sessionScore = 0;
    this.sessionCoins = 0;
    this.sessionGems = 0;
    this.sessionBits = 0;
    this.hasBarrier = false;
    this.isBoosting = false;
    this.boostTargetY = 0;
    this.magnetTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.canDash = true;
    this.cooldownTimer = 0;
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.hasRevive = false;
    this.survivalBoosterStartTime = 0;
    this.jfbRandomDelay = 0;
    this.jfbActiveStartTime = 0;
    this.history = [];
    this._baseMaxSpeed = null;  // 스테이지 배수 리셋
  }

  update(dt, options = {}) {
    const input = options.input || window.Input || {};
    const joystick = input.joystick || {};
    const keys = input.keys || {};
    const qaConfig = options.qaConfig;
    const effective = options.effective;  // 스테이지별 설정
    const boundsWidth = options.canvasWidth || this.boundsWidth;

    // 튜토리얼 이동 감지
    if (window.runtime?.tutorialMode && (joystick.vectorX !== 0 || joystick.vectorY !== 0 || keys.a || keys.d || keys.w || keys.s)) {
      window.GameModules.Tutorial?.onPlayerMove();
    }

    // Per-Stage 값 적용 (effective에서 가져옴)
    if (effective) {
      if (effective.baseAccel !== undefined) this.accel = effective.baseAccel;
      if (effective.friction !== undefined) this.friction = effective.friction;
      if (effective.stopFriction !== undefined) this.stopFriction = effective.stopFriction;
      if (effective.turnAccelMult !== undefined) this.turnAccelMult = effective.turnAccelMult;
      // 대쉬 (Per-Stage)
      if (effective.minDashForce !== undefined) this.minDashForce = effective.minDashForce;
      if (effective.maxDashForce !== undefined) this.maxDashForce = effective.maxDashForce;
      if (effective.maxChargeTime !== undefined) this.maxChargeTime = effective.maxChargeTime;
      if (effective.dashCooldown !== undefined) this.cooldownMax = effective.dashCooldown;
      if (effective.chargeSlowdown !== undefined) this.chargeSlowdown = effective.chargeSlowdown;
      // 스테이지별 속도 배수 적용 (업그레이드 보너스 유지)
      if (effective.baseSpeedMult !== undefined) {
        if (this._baseMaxSpeed === null) {
          this._baseMaxSpeed = this.maxSpeed; // applyLoadoutStats에서 설정된 값 캡처
        }
        this.maxSpeed = this._baseMaxSpeed * effective.baseSpeedMult;
      }
    }

    // Global 값 적용 (qaConfig에서 가져옴)
    if (qaConfig) {
      // [JFB v2] - GLOBAL
      if (qaConfig.jfbDelayMin !== undefined) this.jfbDelayMin = qaConfig.jfbDelayMin;
      if (qaConfig.jfbDelayMax !== undefined) this.jfbDelayMax = qaConfig.jfbDelayMax;
      if (qaConfig.jfbWindow !== undefined) this.jfbWindow = qaConfig.jfbWindow;
      // 부스트 무적 - GLOBAL
      if (qaConfig.boostInvincibleDuration !== undefined) this.boostInvincibleDuration = qaConfig.boostInvincibleDuration;
    }

    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.boostInvincibleTimer > 0) this.boostInvincibleTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    // survivalBoosterStartTime은 타임스탬프 기반이므로 dt 감소 불필요

    if (this.isDying) {
      this.dyingTimer -= dt;
      this.radius *= 0.95;
      if (this.dyingTimer <= 0) this.isDead = true;
      return;
    }

    if (this.isBoosting) {
      this.vy = -this.boostSpeed;
      this.vx = 0;
      if (this.y <= this.boostTargetY) {
        this.isBoosting = false;
        this.vy = -200;
        // 부스트 종료 후 무적 시간 부여
        this.boostInvincibleTimer = this.boostInvincibleDuration;
      }
    } else {
      if (!this.isDashing) {
        let ax = 0, ay = 0;
        if (joystick.active) {
          ax = joystick.vectorX || 0;
          ay = joystick.vectorY || 0;
        } else {
          if (keys.w) ay -= 1;
          if (keys.s) ay += 1;
          if (keys.a) ax -= 1;
          if (keys.d) ax += 1;
        }

        // [CHARGING SYSTEM] 차징 중일 때 가속도 감소 (무거워지는 효과)
        let accelMult = 1.0;
        if (this.isCharging) {
          const progress = this.getChargeProgress();
          // 차징 진행률에 따라 점점 더 무거워짐
          accelMult = this.chargeSlowdown + (1.0 - this.chargeSlowdown) * (1.0 - progress);
        }

        // === [변경 시작] 방향 전환 가속도 로직 ===
        let accelX = this.accel;
        let accelY = this.accel;

        // X축: 입력 방향(ax)과 현재 속도(vx) 방향이 반대일 때 가속도 증폭
        if (ax !== 0 && Math.sign(ax) !== Math.sign(this.vx) && Math.abs(this.vx) > 10) {
            accelX *= this.turnAccelMult;
        }
        // Y축: 입력 방향(ay)과 현재 속도(vy) 방향이 반대일 때 가속도 증폭
        if (ay !== 0 && Math.sign(ay) !== Math.sign(this.vy) && Math.abs(this.vy) > 10) {
            accelY *= this.turnAccelMult;
        }

        // 계산된 가속도 적용 (기존 this.accel 대신 accelX, accelY 사용)
        this.vx += ax * accelX * accelMult * dt;
        this.vy += ay * accelY * accelMult * dt;
        // === [변경 끝] ===

        // [변경] 입력 여부에 따라 다른 마찰력 적용
        // ax, ay가 0이면(입력 없음) stopFriction 사용, 아니면 friction 사용
        let currentFriction = (ax === 0 && ay === 0) ? this.stopFriction : this.friction;

        // [CHARGING SYSTEM] 차징 중일 때 마찰 처리 (기존 로직 유지하되 base만 교체)
        let fricBase = currentFriction;
        if (this.isCharging) {
          const progress = this.getChargeProgress();
          fricBase = currentFriction * (1.0 - progress * (1.0 - this.chargeSlowdown) * 0.3);
        }
        
        // 프레임 보정 마찰력 적용
        const fric = Math.pow(fricBase, dt * 60);
        this.vx *= fric;
        this.vy *= fric;

        const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (spd > this.maxSpeed) {
          this.vx = (this.vx / spd) * this.maxSpeed;
          this.vy = (this.vy / spd) * this.maxSpeed;
        }
      } else {
        this.dashTimer -= dt;
        if (this.dashTimer <= 0) this.isDashing = false;
      }
    }

    if (!this.canDash) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) this.canDash = true;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const width = boundsWidth || 0;
    if (width > 0) {
      // config에서 값 가져오기 (없으면 기본값 25)
      const paddingCap = qaConfig?.wallPaddingCap ?? 25;

      // 반지름이 아무리 커져도, 벽 제한은 paddingCap을 넘지 않도록 설정 (Min)
      // 이를 통해 거대화 시 캐릭터가 화면 밖으로 일부 나가더라도 이동 폭을 확보함
      const wallLimit = Math.min(this.radius, paddingCap);

      if (this.x < wallLimit) {
        this.x = wallLimit;
        this.vx = 0;
      }
      if (this.x > width - wallLimit) {
        this.x = width - wallLimit;
        this.vx = 0;
      }
    }

    // Add current position to history for trail effect
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > (qaConfig.trailLength || 40)) {
      this.history.shift();
    }
  }

  // [JFB v2] 생존 보상 부스터 권한 부여 (Reflex Mode)
  grantSurvivalBooster() {
    // 랜덤 딜레이 생성 (Min ~ Max 사이)
    this.jfbRandomDelay = this.jfbDelayMin + Math.random() * (this.jfbDelayMax - this.jfbDelayMin);
    this.survivalBoosterStartTime = performance.now();
    this.jfbActiveStartTime = 0; // Active 시작 전
    this.canDash = true;
    this.cooldownTimer = 0;
    this.isCharging = false;
  }

  // [JFB v2] 현재 부스터 상태 확인 (Reflex Mode)
  // 반환: 'wait' | 'active' | 'expired' | null
  getSurvivalBoosterState() {
    if (this.survivalBoosterStartTime === 0) return null;

    const now = performance.now();
    const elapsed = (now - this.survivalBoosterStartTime) / 1000;

    // Phase 1: Wait Phase (0 ~ randomDelay)
    if (elapsed < this.jfbRandomDelay) {
      return 'wait';
    }

    // Active Phase 시작 시점 기록 (최초 1회)
    if (this.jfbActiveStartTime === 0) {
      this.jfbActiveStartTime = now;
      // Active 시작 시 신호음 재생
      window.Sound?.sfx('jfb_active');
    }

    // Phase 2: Active Phase (randomDelay ~ randomDelay + window)
    const activeElapsed = (now - this.jfbActiveStartTime) / 1000;
    if (activeElapsed < this.jfbWindow) {
      return 'active';
    }

    // Phase 3: Expired
    return 'expired';
  }

  // [JFB v2] Active Phase 남은 시간 (UI용)
  getSurvivalBoosterRemaining() {
    const state = this.getSurvivalBoosterState();
    if (state !== 'active') return 0;

    const activeElapsed = (performance.now() - this.jfbActiveStartTime) / 1000;
    return Math.max(0, this.jfbWindow - activeElapsed);
  }

  // [JFB v2] Wait Phase 남은 시간 (UI용)
  getWaitRemaining() {
    if (this.survivalBoosterStartTime === 0) return 0;
    const elapsed = (performance.now() - this.survivalBoosterStartTime) / 1000;
    return Math.max(0, this.jfbRandomDelay - elapsed);
  }

  // [JFB v2] 즉시 부스트 발동
  triggerBoost(distance) {
    const boostDist = distance ?? this.survivalBoostDistPerfect;
    this.isBoosting = true;
    this.boostTargetY = this.y - boostDist;
    this.survivalBoosterStartTime = 0;  // 사용 후 리셋
    this.jfbActiveStartTime = 0;

    // PERFECT 효과음 + 질주 사운드
    window.Sound?.sfx('boost_perfect');
    window.Sound?.sfx('boost_rush');

    return 'perfect';
  }

  // [CHARGING SYSTEM] 차징 시작 (버튼 누름)
  startCharging() {
    if (this.isDead || this.isBoosting || this.isDying) return false;

    // [JFB v2] 저스트 프레임 판정 (Reflex Mode)
    const boosterState = this.getSurvivalBoosterState();
    if (boosterState === 'wait') {
      // 부정출발 (False Start) - 부스터 권한 박탈 후 일반 대쉬로 진행
      this.survivalBoosterStartTime = 0;
      this.jfbActiveStartTime = 0;
      window.Sound?.sfx('jfb_fail');
      // 일반 대쉬 로직으로 진행 (쿨다운 체크 후)
      if (!this.canDash) return 'false_start';
      this.isCharging = true;
      this.chargeStartTime = performance.now();
      return 'false_start';
    } else if (boosterState === 'active') {
      // PERFECT! Active Window 내 터치
      this.triggerBoost(this.survivalBoostDistPerfect);
      return 'perfect';
    }
    // expired 또는 null인 경우 일반 대쉬 로직으로 진행

    // 쿨다운 중이면 차징 불가
    if (!this.canDash) return false;

    this.isCharging = true;
    this.chargeStartTime = performance.now();
    return true;
  }

  // [CHARGING SYSTEM] 차징 해제 및 대쉬 발동 (버튼 뗌)
  releaseDash() {
    if (!this.isCharging) return;

    const holdDuration = (performance.now() - this.chargeStartTime) / 1000; // 초 단위
    this.isCharging = false;

    // 쿨다운 중이면 발동 안 함
    if (!this.canDash || this.isDead || this.isBoosting || this.isDying) return;

    // 차징 시간에 따른 힘 계산 (선형 보간)
    const chargeRatio = Math.min(holdDuration / this.maxChargeTime, 1.0);
    const force = this.minDashForce + (this.maxDashForce - this.minDashForce) * chargeRatio;

    this._executeDash(force);

    // 튜토리얼 대쉬 감지
    window.GameModules.Tutorial?.onPlayerDash();
  }

  // [INTERNAL] 실제 대쉬 실행 (가변 힘)
  _executeDash(force) {
    let dx = this.vx;
    let dy = this.vy;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) dy = -1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    this.vx = (dx / len) * force;
    this.vy = (dy / len) * force;
    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.canDash = false;
    this.cooldownTimer = this.cooldownMax;
    window.Sound?.sfx('dash');
  }

  // [LEGACY] 기존 dash() 호환용 - 최소 힘으로 즉시 발동
  dash() {
    if (this.isDead || this.isBoosting || this.isDying || !this.canDash) return;
    this._executeDash(this.minDashForce);
  }

  // [CHARGING SYSTEM] 현재 차징 진행률 반환 (0.0 ~ 1.0)
  getChargeProgress() {
    if (!this.isCharging) return 0;
    const holdDuration = (performance.now() - this.chargeStartTime) / 1000;
    return Math.min(holdDuration / this.maxChargeTime, 1.0);
  }

  die(delay = 1.0) {
    if (this.isDead || this.isDying) return;
    this.isDying = true;
    this.dyingTimer = delay;
  }

  // 부스트 관련 무적 상태 체크 (부스트 중 또는 부스트 종료 후 버퍼)
  isBoostInvincible() {
    return this.isBoosting || this.boostInvincibleTimer > 0;
  }

  draw(ctx, skin, spriteImg, options = {}) {
    if (this.isDead) return;
    const useShadows = options.useShadows !== false;

    // Render trail effect
    this.history.forEach((pos, index) => {
      const opacity = (index / this.history.length) * (qaConfig.trailOpacity || 0.9);
      const radius = (this.radius * (index / this.history.length)); // Shrink
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      if (skin?.trailColor) {
         ctx.fillStyle = `rgba(${parseInt(skin.trailColor.slice(1,3), 16)}, ${parseInt(skin.trailColor.slice(3,5), 16)}, ${parseInt(skin.trailColor.slice(5,7), 16)}, ${opacity})`;
      }
      ctx.fill();
    });

    // 1. 배리어/부스터 이펙트 (캐릭터 뒤, 차징 게이지보다 바깥)
    if (this.hasBarrier) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (this.isBoosting) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + 60);
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
      ctx.lineWidth = this.radius * 1.5;
      ctx.stroke();
    }

    // 2. 캐릭터 그리기 (SVG vs 기본 원)
    // [FIX] 빈 SVG/로드 실패에 대한 강화된 폴백 로직
    const useSprite = !!(spriteImg &&
      spriteImg.complete &&
      spriteImg.naturalWidth > 0 &&
      spriteImg.naturalHeight > 0 &&
      !spriteImg.error);

    if (useSprite) {
      // [SVG 모드] 배경 원/테두리 없이 이미지만 그대로 그림
      ctx.drawImage(spriteImg, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      // [기본 모드] 색깔 원 그리기 (폴백)
      const color = skin?.color || '#fff';
      ctx.fillStyle = color;
      if (useShadows) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
      } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      if (!useShadows) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.stroke();
      }
    }

    // 3. 차징 시각 효과 (캐릭터 주위 글로우 + 크기 펄스)
    if (this.isCharging) {
      const progress = this.getChargeProgress();

      // 차징 글로우 효과 (진행률에 따라 강해짐)
      const glowSize = this.radius + 6 + progress * 10;
      const glowAlpha = 0.3 + progress * 0.5;
      const gradient = ctx.createRadialGradient(
        this.x, this.y, this.radius,
        this.x, this.y, glowSize
      );
      gradient.addColorStop(0, `rgba(255, 200, 50, ${glowAlpha})`);
      gradient.addColorStop(0.5, `rgba(255, 150, 0, ${glowAlpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

      ctx.beginPath();
      ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 차징 진행률 링 (원형 프로그레스 바)
      ctx.strokeStyle = progress >= 1 ? '#00ff00' : '#ffcc00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

    }

    // 4. 대시 쿨타임 표시 (캐릭터 앞)
    if (!this.canDash && !this.isCharging) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, (this.cooldownTimer / this.cooldownMax) * Math.PI * 2);
      ctx.stroke();
    }

    // 5. 대시 잔상 효과 제거 (파티클 비활성화)
  }
}

window.Player = Player;
