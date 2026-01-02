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
    this._baseMaxSpeed = null;  // ?ㅽ뀒?댁? 諛곗닔 ?곸슜 ??湲곕낯媛????
    this.dashForce = 1200;
    this.dashDuration = 0.15;
    this.isDashing = false;
    this.dashTimer = 0;
    this.canDash = true;
    this.cooldownTimer = 0;
    this.cooldownMax = 1.0;
    // [CHARGING SYSTEM] 李⑥쭠 愿???띿꽦
    this.isCharging = false;
    this.chargeStartTime = 0;
    this.minDashForce = 800;
    this.maxDashForce = 1600;
    this.maxChargeTime = 0.8;
    this.chargeSlowdown = 0.3; // 李⑥쭠 以??대룞?띾룄 媛먯냼??
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
    this.boostInvincibleTimer = 0;      // 遺?ㅽ듃 醫낅즺 ??臾댁쟻 ?쒓컙
    this.boostInvincibleDuration = 1.0; // 遺?ㅽ듃 醫낅즺 ??臾댁쟻 吏???쒓컙 (QA ?ㅼ젙)
    this.baseMagnetRange = 100;
    this.coinMult = 1.0;
    this.boundsWidth = 0;
    this.friction = 0.90; // 留덉같 怨꾩닔 (0.80 ~ 0.99)
    this.stopFriction = 0.92; // ?뺤? ??留덉같 怨꾩닔
    this.turnAccelMult = 2.0; // [異붽?] 珥덇린媛??ㅼ젙
    this.hasRevive = false; // 蹂대Ъ: 遺??
    this.history = [];
    this.lastInputDir = { x: 0, y: -1 };
    this.lastInputTime = 0;
    this.dashBufferTimer = 0;
    this.dashBufferWindow = 0.22;
    this.dashBufferForce = 0;
    this.dashBufferDir = null;
    this._lastDashParticleTs = 0;

    // [JFB v2] ??ㅽ듃 ?꾨젅??遺?ㅽ꽣 (Reflex Mode)
    this.survivalBoosterStartTime = 0;     // 遺?ㅽ꽣 沅뚰븳 遺???쒖젏 ??꾩뒪?ы봽
    this.survivalBoostDistPerfect = 2000;  // PERFECT ?먯젙 遺?ㅽ듃 嫄곕━
    this.jfbDelayMin = 0.0;                // Wait Phase 理쒖냼 ?쒕젅??(珥?
    this.jfbDelayMax = 0.5;                // Wait Phase 理쒕? ?쒕젅??(珥?
    this.jfbWindow = 0.2;                  // Active Window 吏???쒓컙 (珥?
    this.jfbRandomDelay = 0;               // ?꾩옱 ?앹꽦???쒕뜡 ?쒕젅??
    this.jfbActiveStartTime = 0;           // Active Phase ?쒖옉 ??꾩뒪?ы봽
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
    this.lastInputDir = { x: 0, y: -1 };
    this.lastInputTime = 0;
    this.dashBufferTimer = 0;
    this.dashBufferWindow = 0.22;
    this.dashBufferForce = 0;
    this.dashBufferDir = null;
    this._lastDashParticleTs = 0;
    this._baseMaxSpeed = null;  // ?ㅽ뀒?댁? 諛곗닔 由ъ뀑
  }

  update(dt, options = {}) {
    const input = options.input || window.Input || {};
    const joystick = input.joystick || {};
    const keys = input.keys || {};
    const qaConfig = options.qaConfig;
    const effective = options.effective;  // ?ㅽ뀒?댁?蹂??ㅼ젙
    const boundsWidth = options.canvasWidth || this.boundsWidth;
    const dashState = input.dashState;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    if (dashState?.holdActive && dashState.holdPending) {
      const heldMs = now - dashState.holdStartTime;
      if (heldMs >= dashState.tapWindowMs) {
        dashState.holdPending = false;
        if (this.canDash && !this.isCharging) {
          const started = this.startCharging();
          if (started !== false) dashState.holdQueued = false;
        } else {
          dashState.holdQueued = true;
        }
      }
    }

    if (dashState?.holdQueued && dashState.holdActive && this.canDash && !this.isCharging) {
      const started = this.startCharging();
      if (started !== false) dashState.holdQueued = false;
    }

    // ?쒗넗由ъ뼹 ?대룞 媛먯?
    if (window.runtime?.tutorialMode && (joystick.vectorX !== 0 || joystick.vectorY !== 0 || keys.a || keys.d || keys.w || keys.s)) {
      window.GameModules.Tutorial?.dispatchEvent?.('move');
    }

    // Per-Stage 媛??곸슜 (effective?먯꽌 媛?몄샂)
    if (effective) {
      if (effective.baseAccel !== undefined) this.accel = effective.baseAccel;
      if (effective.friction !== undefined) this.friction = effective.friction;
      if (effective.stopFriction !== undefined) this.stopFriction = effective.stopFriction;
      if (effective.turnAccelMult !== undefined) this.turnAccelMult = effective.turnAccelMult;
      // ???(Per-Stage)
      if (effective.minDashForce !== undefined) this.minDashForce = effective.minDashForce;
      if (effective.maxDashForce !== undefined) this.maxDashForce = effective.maxDashForce;
      if (effective.maxChargeTime !== undefined) this.maxChargeTime = effective.maxChargeTime;
      if (effective.dashCooldown !== undefined) this.cooldownMax = effective.dashCooldown;
      if (effective.chargeSlowdown !== undefined) this.chargeSlowdown = effective.chargeSlowdown;
      // ?ㅽ뀒?댁?蹂??띾룄 諛곗닔 ?곸슜 (?낃렇?덉씠??蹂대꼫???좎?)
      if (effective.baseSpeedMult !== undefined) {
        if (this._baseMaxSpeed === null) {
          this._baseMaxSpeed = this.maxSpeed; // applyLoadoutStats?먯꽌 ?ㅼ젙??媛?罹≪쿂
        }
        this.maxSpeed = this._baseMaxSpeed * effective.baseSpeedMult;
      }
    }

    // Global 媛??곸슜 (qaConfig?먯꽌 媛?몄샂)
    if (qaConfig) {
      // [JFB v2] - GLOBAL
      if (qaConfig.jfbDelayMin !== undefined) this.jfbDelayMin = qaConfig.jfbDelayMin;
      if (qaConfig.jfbDelayMax !== undefined) this.jfbDelayMax = qaConfig.jfbDelayMax;
      if (qaConfig.jfbWindow !== undefined) this.jfbWindow = qaConfig.jfbWindow;
      // 遺?ㅽ듃 臾댁쟻 - GLOBAL
      if (qaConfig.boostInvincibleDuration !== undefined) this.boostInvincibleDuration = qaConfig.boostInvincibleDuration;
    }

    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.boostInvincibleTimer > 0) this.boostInvincibleTimer -= dt;
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    // survivalBoosterStartTime? ??꾩뒪?ы봽 湲곕컲?대?濡?dt 媛먯냼 遺덊븘??

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
        // 遺?ㅽ듃 醫낅즺 ??臾댁쟻 ?쒓컙 遺??
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

        const inputMag = Math.sqrt(ax * ax + ay * ay);
        if (inputMag > 0.05) {
          this.lastInputDir = { x: ax / inputMag, y: ay / inputMag };
          this.lastInputTime = now;
        }

        // [CHARGING SYSTEM] 李⑥쭠 以묒씪 ??媛?띾룄 媛먯냼 (臾닿굅?뚯????④낵)
        let accelMult = 1.0;
        if (this.isCharging) {
          const progress = this.getChargeProgress();
          // 李⑥쭠 吏꾪뻾瑜좎뿉 ?곕씪 ?먯젏 ??臾닿굅?뚯쭚
          accelMult = this.chargeSlowdown + (1.0 - this.chargeSlowdown) * (1.0 - progress);
        }

        // === [蹂寃??쒖옉] 諛⑺뼢 ?꾪솚 媛?띾룄 濡쒖쭅 ===
        let accelX = this.accel;
        let accelY = this.accel;

        // X異? ?낅젰 諛⑺뼢(ax)怨??꾩옱 ?띾룄(vx) 諛⑺뼢??諛섎?????媛?띾룄 利앺룺
        if (ax !== 0 && Math.sign(ax) !== Math.sign(this.vx) && Math.abs(this.vx) > 10) {
            accelX *= this.turnAccelMult;
        }
        // Y異? ?낅젰 諛⑺뼢(ay)怨??꾩옱 ?띾룄(vy) 諛⑺뼢??諛섎?????媛?띾룄 利앺룺
        if (ay !== 0 && Math.sign(ay) !== Math.sign(this.vy) && Math.abs(this.vy) > 10) {
            accelY *= this.turnAccelMult;
        }

        // 怨꾩궛??媛?띾룄 ?곸슜 (湲곗〈 this.accel ???accelX, accelY ?ъ슜)
        this.vx += ax * accelX * accelMult * dt;
        this.vy += ay * accelY * accelMult * dt;
        // === [蹂寃??? ===

        // [蹂寃? ?낅젰 ?щ????곕씪 ?ㅻⅨ 留덉같???곸슜
        // ax, ay媛 0?대㈃(?낅젰 ?놁쓬) stopFriction ?ъ슜, ?꾨땲硫?friction ?ъ슜
        let currentFriction = (ax === 0 && ay === 0) ? this.stopFriction : this.friction;

        // [CHARGING SYSTEM] 李⑥쭠 以묒씪 ??留덉같 泥섎━ (湲곗〈 濡쒖쭅 ?좎??섎릺 base留?援먯껜)
        let fricBase = currentFriction;
        if (this.isCharging) {
          const progress = this.getChargeProgress();
          fricBase = currentFriction * (1.0 - progress * (1.0 - this.chargeSlowdown) * 0.3);
        }
        
        // ?꾨젅??蹂댁젙 留덉같???곸슜
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

    if (this.dashBufferTimer > 0) {
      this.dashBufferTimer -= dt;
      if (this.dashBufferTimer < 0) this.dashBufferTimer = 0;
      if (this.dashBufferTimer > 0 && this.canDash && !this.isCharging && !this.isBoosting && !this.isDead && !this.isDying && !dashState?.holdActive) {
        const force = this.dashBufferForce || this.minDashForce;
        const dir = this.dashBufferDir;
        this.dashBufferTimer = 0;
        this.dashBufferForce = 0;
        this.dashBufferDir = null;
        this._executeDash(force, dir);
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const width = boundsWidth || 0;
    if (width > 0) {
      // config?먯꽌 媛?媛?몄삤湲?(?놁쑝硫?湲곕낯媛?25)
      const paddingCap = qaConfig?.wallPaddingCap ?? 25;

      // 諛섏?由꾩씠 ?꾨Т由?而ㅼ졇?? 踰??쒗븳? paddingCap???섏? ?딅룄濡??ㅼ젙 (Min)
      // ?대? ?듯빐 嫄곕?????罹먮┃?곌? ?붾㈃ 諛뽰쑝濡??쇰? ?섍??붾씪???대룞 ??쓣 ?뺣낫??
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

  // [JFB v2] ?앹〈 蹂댁긽 遺?ㅽ꽣 沅뚰븳 遺??(Reflex Mode)
  grantSurvivalBooster() {
    // ?쒕뜡 ?쒕젅???앹꽦 (Min ~ Max ?ъ씠)
    this.jfbRandomDelay = this.jfbDelayMin + Math.random() * (this.jfbDelayMax - this.jfbDelayMin);
    this.survivalBoosterStartTime = performance.now();
    this.jfbActiveStartTime = 0; // Active ?쒖옉 ??
    this.canDash = true;
    this.cooldownTimer = 0;
    this.isCharging = false;
  }

  // [JFB v2] ?꾩옱 遺?ㅽ꽣 ?곹깭 ?뺤씤 (Reflex Mode)
  // 諛섑솚: 'wait' | 'active' | 'expired' | null
  getSurvivalBoosterState() {
    if (this.survivalBoosterStartTime === 0) return null;

    const now = performance.now();
    const elapsed = (now - this.survivalBoosterStartTime) / 1000;

    // Phase 1: Wait Phase (0 ~ randomDelay)
    if (elapsed < this.jfbRandomDelay) {
      return 'wait';
    }

    // Active Phase ?쒖옉 ?쒖젏 湲곕줉 (理쒖큹 1??
    if (this.jfbActiveStartTime === 0) {
      this.jfbActiveStartTime = now;
      // Active ?쒖옉 ???좏샇???ъ깮
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

  // [JFB v2] Active Phase ?⑥? ?쒓컙 (UI??
  getSurvivalBoosterRemaining() {
    const state = this.getSurvivalBoosterState();
    if (state !== 'active') return 0;

    const activeElapsed = (performance.now() - this.jfbActiveStartTime) / 1000;
    return Math.max(0, this.jfbWindow - activeElapsed);
  }

  // [JFB v2] Wait Phase ?⑥? ?쒓컙 (UI??
  getWaitRemaining() {
    if (this.survivalBoosterStartTime === 0) return 0;
    const elapsed = (performance.now() - this.survivalBoosterStartTime) / 1000;
    return Math.max(0, this.jfbRandomDelay - elapsed);
  }

  // [JFB v2] 利됱떆 遺?ㅽ듃 諛쒕룞
  triggerBoost(distance) {
    const boostDist = distance ?? this.survivalBoostDistPerfect;
    this.isBoosting = true;
    this.boostTargetY = this.y - boostDist;
    this.survivalBoosterStartTime = 0;  // ?ъ슜 ??由ъ뀑
    this.jfbActiveStartTime = 0;

    // PERFECT ?④낵??+ 吏덉＜ ?ъ슫??
    window.Sound?.sfx('boost_perfect');
    window.Sound?.sfx('boost_rush');

    return 'perfect';
  }

  // [CHARGING SYSTEM] 李⑥쭠 ?쒖옉 (踰꾪듉 ?꾨쫫)
  startCharging() {
    if (this.isDead || this.isBoosting || this.isDying) return false;

    // [JFB v2] ??ㅽ듃 ?꾨젅???먯젙 (Reflex Mode)
    const boosterState = this.getSurvivalBoosterState();
    if (boosterState === 'wait') {
      // 遺?뺤텧諛?(False Start) - 遺?ㅽ꽣 沅뚰븳 諛뺥깉 ???쇰컲 ??щ줈 吏꾪뻾
      this.survivalBoosterStartTime = 0;
      this.jfbActiveStartTime = 0;
      window.Sound?.sfx('jfb_fail');
      // ?쇰컲 ???濡쒖쭅?쇰줈 吏꾪뻾 (荑⑤떎??泥댄겕 ??
      if (!this.canDash) return 'false_start';
      this.isCharging = true;
      this.chargeStartTime = performance.now();
      return 'false_start';
    } else if (boosterState === 'active') {
      // PERFECT! Active Window ???곗튂
      this.triggerBoost(this.survivalBoostDistPerfect);
      return 'perfect';
    }
    // expired ?먮뒗 null??寃쎌슦 ?쇰컲 ???濡쒖쭅?쇰줈 吏꾪뻾

    // 荑⑤떎??以묒씠硫?李⑥쭠 遺덇?
    if (!this.canDash) return false;

    this.isCharging = true;
    this.chargeStartTime = performance.now();
    return true;
  }

  queueDash(force, dir, bufferWindow) {
    if (this.isDead || this.isBoosting || this.isDying) return false;
    const windowSec = bufferWindow ?? this.dashBufferWindow;
    if (!windowSec || windowSec <= 0) return false;

    this.dashBufferTimer = windowSec;
    this.dashBufferForce = force ?? this.minDashForce;
    if (dir && (dir.x || dir.y)) {
      this.dashBufferDir = { x: dir.x, y: dir.y };
    } else {
      this.dashBufferDir = null;
    }
    return true;
  }

  // [CHARGING SYSTEM] 李⑥쭠 ?댁젣 諛????諛쒕룞 (踰꾪듉 ??
  releaseDash(dirOverride) {
    if (!this.isCharging) return;

    const holdDuration = (performance.now() - this.chargeStartTime) / 1000; // 珥??⑥쐞
    this.isCharging = false;

    // 荑⑤떎??以묒씠硫?諛쒕룞 ????
    if (!this.canDash || this.isDead || this.isBoosting || this.isDying) return;

    // 李⑥쭠 ?쒓컙???곕Ⅸ ??怨꾩궛 (?좏삎 蹂닿컙)
    const chargeRatio = Math.min(holdDuration / this.maxChargeTime, 1.0);
    const force = this.minDashForce + (this.maxDashForce - this.minDashForce) * chargeRatio;

    this._executeDash(force, dirOverride);

    // ?쒗넗由ъ뼹 ???媛먯?
    window.GameModules.Tutorial?.dispatchEvent?.('dash');
  }

  // [INTERNAL] ?ㅼ젣 ????ㅽ뻾 (媛蹂 ??
  _executeDash(force, dirOverride) {
    let dx = 0;
    let dy = 0;
    const hasOverride = dirOverride && (dirOverride.x || dirOverride.y);
    if (hasOverride) {
      dx = dirOverride.x;
      dy = dirOverride.y;
    } else {
      dx = this.vx;
      dy = this.vy;
      const speedSq = dx * dx + dy * dy;
      if (speedSq < 100) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (this.lastInputTime && (now - this.lastInputTime) <= 200) {
          dx = this.lastInputDir.x;
          dy = this.lastInputDir.y;
        }
      }
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        dy = -1;
      }
    }
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

  // [LEGACY] 湲곗〈 dash() ?명솚??- 理쒖냼 ?섏쑝濡?利됱떆 諛쒕룞
  dash(dirOverride) {
    if (this.isDead || this.isBoosting || this.isDying || !this.canDash) return;
    this._executeDash(this.minDashForce, dirOverride);
  }

  // [CHARGING SYSTEM] ?꾩옱 李⑥쭠 吏꾪뻾瑜?諛섑솚 (0.0 ~ 1.0)
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

  // 遺?ㅽ듃 愿??臾댁쟻 ?곹깭 泥댄겕 (遺?ㅽ듃 以??먮뒗 遺?ㅽ듃 醫낅즺 ??踰꾪띁)
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

    // 1. 諛곕━??遺?ㅽ꽣 ?댄럺??(罹먮┃???? 李⑥쭠 寃뚯씠吏蹂대떎 諛붽묑)
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

    // 2. 罹먮┃??洹몃━湲?(SVG vs 湲곕낯 ??
    // [FIX] 鍮?SVG/濡쒕뱶 ?ㅽ뙣?????媛뺥솕???대갚 濡쒖쭅
    const useSprite = !!(spriteImg &&
      spriteImg.complete &&
      spriteImg.naturalWidth > 0 &&
      spriteImg.naturalHeight > 0 &&
      !spriteImg.error);

    if (useSprite) {
      // [SVG 紐⑤뱶] 諛곌꼍 ???뚮몢由??놁씠 ?대?吏留?洹몃?濡?洹몃┝
      ctx.drawImage(spriteImg, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      // [湲곕낯 紐⑤뱶] ?됯퉼 ??洹몃━湲?(?대갚)
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

    // 3. 李⑥쭠 ?쒓컖 ?④낵 (罹먮┃??二쇱쐞 湲濡쒖슦 + ?ш린 ?꾩뒪)
    if (this.isCharging) {
      const progress = this.getChargeProgress();

      // 李⑥쭠 湲濡쒖슦 ?④낵 (吏꾪뻾瑜좎뿉 ?곕씪 媛뺥빐吏?
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

      // 李⑥쭠 吏꾪뻾瑜?留?(?먰삎 ?꾨줈洹몃젅??諛?
      ctx.strokeStyle = progress >= 1 ? '#00ff00' : '#ffcc00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

    }

    // 4. ???荑⑦????쒖떆 (罹먮┃????
    if (!this.canDash && !this.isCharging) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, (this.cooldownTimer / this.cooldownMax) * Math.PI * 2);
      ctx.stroke();
    }

    // 5. ????붿긽 ?④낵 ?쒓굅 (?뚰떚??鍮꾪솢?깊솕)
  }
}

window.Player = Player;

