/**
 * Apex Strike 2D - Core Game Engine
 * Features:
 * - Pure Canvas 60fps game loop
 * - Dual virtual touch joysticks (left move, right aim+auto-shoot) + Desktop WASD/Mouse
 * - Web Audio procedural sound synthesizer (100% offline, zero external audio assets)
 * - PeerJS WebRTC peer-to-peer multiplayer (Host/Client sync, lerp interpolation)
 * - Solo vs Bots with configurable AI difficulty
 * - Customizable weapons & arenas
 */

// Force CPU software rasterization on 2D canvas contexts to avoid GPU Mesa rendernode probes
try {
  const _origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attributes) {
    if (type === '2d') {
      attributes = Object.assign({ willReadFrequently: true }, attributes);
    }
    return _origGetContext.call(this, type, attributes);
  };
} catch (_) {}

// ==========================================
// 1. PROCEDURAL SOUND SYNTHESIZER (Web Audio)
// ==========================================
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPistol() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playSmg() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playShotgun() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Noise blast + deep kick
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.18);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  playDmr() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playPlasma() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.18);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playShoot(weaponKey) {
    if (weaponKey === 'smg') this.playSmg();
    else if (weaponKey === 'shotgun') this.playShotgun();
    else if (weaponKey === 'dmr') this.playDmr();
    else if (weaponKey === 'plasma') this.playPlasma();
    else this.playPistol();
  }

  playHit() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playKill() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
    osc2.frequency.setValueAtTime(783.99, now + 0.15); // G5

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now + 0.1);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  playExplosion() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.linearRampToValueAtTime(50, now + 0.45);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  playRespawn() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(750, now + 0.25);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

// ==========================================
// 2. WEAPONS DATABASE
// ==========================================
const WEAPONS = {
  pistol: {
    id: 'pistol',
    name: 'P-9 TACTICAL',
    icon: '🔫',
    category: 'Sidearm',
    damage: 26,
    speed: 15,
    fireRate: 260, // ms between shots
    spread: 0.03, // radians
    pellets: 1,
    bulletRadius: 3.5,
    range: 850,
    color: '#00e5ff',
    desc: 'High precision semi-automatic tactical pistol with minimal recoil.'
  },
  smg: {
    id: 'smg',
    name: 'CYCLONE SMG',
    icon: '⚡',
    category: 'Rapid Fire',
    damage: 15,
    speed: 16,
    fireRate: 105,
    spread: 0.12,
    pellets: 1,
    bulletRadius: 3,
    range: 750,
    color: '#ffea00',
    desc: 'High fire-rate submachine gun built for aggressive close-quarters clearing.'
  },
  shotgun: {
    id: 'shotgun',
    name: 'BREACHER 12G',
    icon: '💥',
    category: 'Scattershot',
    damage: 16,
    speed: 13,
    fireRate: 720,
    spread: 0.26,
    pellets: 6,
    bulletRadius: 3,
    range: 600,
    color: '#ff5722',
    desc: 'Devastating 6-pellet buckshot spread engineered for lethal point-blank stops.'
  },
  dmr: {
    id: 'dmr',
    name: 'MARKSMAN DMR',
    icon: '🎯',
    category: 'High-Impact',
    damage: 55,
    speed: 22,
    fireRate: 620,
    spread: 0.01,
    pellets: 1,
    bulletRadius: 4,
    range: 1200,
    color: '#76ff03',
    desc: 'Heavy long-range precision rifle delivering high projectile velocity.'
  },
  plasma: {
    id: 'plasma',
    name: 'VORTEX CANNON',
    icon: '🔮',
    category: 'Energy Blaster',
    damage: 42,
    speed: 11,
    fireRate: 420,
    spread: 0.05,
    pellets: 1,
    bulletRadius: 7,
    range: 800,
    color: '#e040fb',
    desc: 'Fires charged plasma projectiles with intense kinetic impact.'
  }
};

// ==========================================
// 3. ARENAS DATABASE
// ==========================================
const ARENAS = {
  compound: {
    id: 'compound',
    name: 'THE COMPOUND',
    desc: 'Tactical warehouse with cargo crates, concrete pillars, and perimeter bunkers.',
    width: 1600,
    height: 1200,
    floorColor: '#0b111e',
    gridColor: 'rgba(0, 229, 255, 0.06)',
    wallColor: '#1d2a44',
    wallGlow: '#00e5ff',
    spawns: [
      { x: 160, y: 160 },
      { x: 1440, y: 160 },
      { x: 160, y: 1040 },
      { x: 1440, y: 1040 },
      { x: 800, y: 220 },
      { x: 800, y: 980 }
    ],
    walls: [
      // Outer boundaries
      { x: 0, y: 0, w: 1600, h: 24 },
      { x: 0, y: 1176, w: 1600, h: 24 },
      { x: 0, y: 0, w: 24, h: 1200 },
      { x: 1576, y: 0, w: 24, h: 1200 },
      // Central bunker cover
      { x: 740, y: 520, w: 120, h: 160 },
      // Crates & Corner Bunkers
      { x: 320, y: 280, w: 160, h: 40 },
      { x: 320, y: 320, w: 40, h: 160 },
      { x: 1120, y: 280, w: 160, h: 40 },
      { x: 1240, y: 320, w: 40, h: 160 },
      { x: 320, y: 880, w: 160, h: 40 },
      { x: 320, y: 720, w: 40, h: 160 },
      { x: 1120, y: 880, w: 160, h: 40 },
      { x: 1240, y: 720, w: 40, h: 160 },
      // Pillars
      { x: 540, y: 600, w: 50, h: 50 },
      { x: 1010, y: 600, w: 50, h: 50 }
    ]
  },
  citadel: {
    id: 'citadel',
    name: 'NEON CITADEL',
    desc: 'Cybernetic combat plaza with energized barriers and dual corridor flanks.',
    width: 1800,
    height: 1300,
    floorColor: '#0a0d16',
    gridColor: 'rgba(255, 0, 85, 0.06)',
    wallColor: '#251528',
    wallGlow: '#ff0055',
    spawns: [
      { x: 200, y: 650 },
      { x: 1600, y: 650 },
      { x: 900, y: 180 },
      { x: 900, y: 1120 },
      { x: 350, y: 250 },
      { x: 1450, y: 1050 }
    ],
    walls: [
      // Outer boundaries
      { x: 0, y: 0, w: 1800, h: 24 },
      { x: 0, y: 1276, w: 1800, h: 24 },
      { x: 0, y: 0, w: 24, h: 1300 },
      { x: 1776, y: 0, w: 24, h: 1300 },
      // Central Octagon Blocks
      { x: 840, y: 460, w: 120, h: 40 },
      { x: 840, y: 800, w: 120, h: 40 },
      { x: 680, y: 580, w: 40, h: 140 },
      { x: 1080, y: 580, w: 40, h: 140 },
      // Flank Corridors
      { x: 380, y: 380, w: 40, h: 540 },
      { x: 1380, y: 380, w: 40, h: 540 },
      // Top/Bottom barriers
      { x: 600, y: 240, w: 180, h: 36 },
      { x: 1020, y: 240, w: 180, h: 36 },
      { x: 600, y: 1020, w: 180, h: 36 },
      { x: 1020, y: 1020, w: 180, h: 36 }
    ]
  },
  wasteland: {
    id: 'wasteland',
    name: 'WASTELAND YARD',
    desc: 'Dense industrial battlefield with asymmetrical scrap containers and alleyways.',
    width: 1700,
    height: 1200,
    floorColor: '#100e0b',
    gridColor: 'rgba(255, 183, 0, 0.06)',
    wallColor: '#2b2318',
    wallGlow: '#ffb700',
    spawns: [
      { x: 180, y: 200 },
      { x: 1520, y: 1000 },
      { x: 180, y: 1000 },
      { x: 1520, y: 200 },
      { x: 850, y: 600 }
    ],
    walls: [
      // Outer boundaries
      { x: 0, y: 0, w: 1700, h: 24 },
      { x: 0, y: 1176, w: 1700, h: 24 },
      { x: 0, y: 0, w: 24, h: 1200 },
      { x: 1676, y: 0, w: 24, h: 1200 },
      // Long zigzag scrap containers
      { x: 420, y: 220, w: 220, h: 50 },
      { x: 420, y: 270, w: 50, h: 260 },
      { x: 1060, y: 930, w: 220, h: 50 },
      { x: 1230, y: 670, w: 50, h: 260 },
      // Center Choke
      { x: 820, y: 380, w: 60, h: 180 },
      { x: 820, y: 640, w: 60, h: 180 },
      // Scattered blocks
      { x: 260, y: 700, w: 140, h: 90 },
      { x: 1300, y: 380, w: 140, h: 90 },
      { x: 590, y: 780, w: 120, h: 120 },
      { x: 990, y: 300, w: 120, h: 120 }
    ]
  }
};

// ==========================================
// 4. COMBATANT (Player & Bot)
// ==========================================
class Combatant {
  constructor(id, name, isLocal = false, isBot = false, color = '#00e5ff') {
    this.id = id;
    this.name = name;
    this.isLocal = isLocal;
    this.isBot = isBot;
    this.color = color;

    this.radius = 18;
    this.x = 200;
    this.y = 200;
    this.vx = 0;
    this.vy = 0;
    this.speed = 4.2;
    this.angle = 0;

    this.hp = 100;
    this.maxHp = 100;
    this.weapon = WEAPONS.pistol;
    this.lastShotTime = 0;

    this.kills = 0;
    this.deaths = 0;
    this.isDead = false;
    this.respawnTimer = 0;
    this.invulnerableTimer = 0; // seconds

    // Bot specific AI state
    this.botDifficulty = 'medium';
    this.botTarget = null;
    this.botDecisionTimer = 0;
    this.botMoveDir = { x: 0, y: 0 };
    this.botStrafeDir = 1;

    // Network lerp properties for remote players
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetAngle = this.angle;
  }

  takeDamage(dmg, killer, game) {
    if (this.isDead || this.invulnerableTimer > 0) return false;

    this.hp = Math.max(0, this.hp - dmg);
    game.sound.playHit();
    game.particles.spawnHitSparks(this.x, this.y, this.color);
    game.floatingTexts.spawn(`-${dmg}`, this.x, this.y - 20, '#ff0055');

    if (this.hp <= 0) {
      this.die(killer, game);
    }
    return true;
  }

  die(killer, game) {
    this.isDead = true;
    this.deaths++;
    this.respawnTimer = 3.0; // 3 seconds
    game.sound.playExplosion();
    game.particles.spawnExplosion(this.x, this.y, this.color);

    if (killer) {
      killer.kills++;
      if (killer.isLocal) {
        game.sound.playKill();
        game.floatingTexts.spawn('+1 KILL', killer.x, killer.y - 30, '#00ff66');
      }
      game.addKillFeedItem(killer.name, this.name, killer.weapon.name);
      game.checkScoreTarget(killer);
    }

    if (this.isLocal) {
      game.showRespawnOverlay(3);
    }
  }

  respawn(game) {
    const arena = game.currentArena;
    const safeSpawn = game.findSafeSpawn();
    this.x = safeSpawn.x;
    this.y = safeSpawn.y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.hp = this.maxHp;
    this.isDead = false;
    this.invulnerableTimer = 2.5; // 2.5 seconds of shield
    game.sound.playRespawn();
    game.particles.spawnShieldPulse(this.x, this.y);

    if (this.isLocal) {
      game.hideRespawnOverlay();
    }
  }

  update(dt, game) {
    if (this.isDead) {
      this.respawnTimer -= dt;
      if (this.isLocal) {
        game.updateRespawnCountdown(Math.ceil(this.respawnTimer));
      }
      if (this.respawnTimer <= 0) {
        this.respawn(game);
      }
      return;
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }

    // Remote multiplayer player smoothing
    if (!this.isLocal && !this.isBot) {
      this.x += (this.targetX - this.x) * 0.25;
      this.y += (this.targetY - this.y) * 0.25;
      // Angle lerp
      let diff = this.targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * 0.25;
      return;
    }

    // Bot AI update
    if (this.isBot) {
      this.updateBotAI(dt, game);
    }

    // Movement & Collision with Arena Walls
    if (this.vx !== 0 || this.vy !== 0) {
      const newX = this.x + this.vx * dt * 60;
      const newY = this.y + this.vy * dt * 60;

      // Sliding circle-box collision resolution
      this.moveWithCollision(newX, newY, game.currentArena.walls);
    }
  }

  moveWithCollision(targetX, targetY, walls) {
    // Try X movement first
    let testX = targetX;
    let collidesX = false;
    for (const w of walls) {
      if (circleRectOverlap(testX, this.y, this.radius, w.x, w.y, w.w, w.h)) {
        collidesX = true;
        break;
      }
    }
    if (!collidesX) {
      this.x = testX;
    }

    // Try Y movement
    let testY = targetY;
    let collidesY = false;
    for (const w of walls) {
      if (circleRectOverlap(this.x, testY, this.radius, w.x, w.y, w.w, w.h)) {
        collidesY = true;
        break;
      }
    }
    if (!collidesY) {
      this.y = testY;
    }
  }

  shoot(game) {
    if (this.isDead) return;
    const now = performance.now();
    if (now - this.lastShotTime < this.weapon.fireRate) return;

    this.lastShotTime = now;
    game.sound.playShoot(this.weapon.id);

    // Muzzle tip position based on weapon angle
    const muzzleDist = this.radius + 16;
    const muzzleX = this.x + Math.cos(this.angle) * muzzleDist;
    const muzzleY = this.y + Math.sin(this.angle) * muzzleDist;

    game.particles.spawnMuzzleFlash(muzzleX, muzzleY, this.angle, this.weapon.color);

    if (this.isLocal && game.settings.screenShake) {
      game.triggerScreenShake(this.weapon.id === 'shotgun' ? 5 : 2.5);
    }

    // Bullet Spawning (Single or Pellets)
    for (let i = 0; i < this.weapon.pellets; i++) {
      const spreadAngle = (Math.random() - 0.5) * this.weapon.spread;
      const finalAngle = this.angle + spreadAngle;

      const bullet = new Bullet(
        muzzleX,
        muzzleY,
        finalAngle,
        this.weapon.speed,
        this.weapon.damage,
        this.weapon.range,
        this.weapon.bulletRadius,
        this.weapon.color,
        this.id,
        this.weapon.id === 'plasma'
      );
      game.bullets.push(bullet);

      // If multiplayer client or host, sync shot event
      if (game.network.isConnected) {
        game.network.broadcastShot({
          x: muzzleX,
          y: muzzleY,
          angle: finalAngle,
          weaponId: this.weapon.id,
          shooterId: this.id
        });
      }
    }
  }

  updateBotAI(dt, game) {
    this.botDecisionTimer -= dt;

    // Pick target: local player or nearest alive combatant
    if (!this.botTarget || this.botTarget.isDead || this.botDecisionTimer <= 0) {
      this.botDecisionTimer = 0.5 + Math.random() * 0.5;

      const candidates = game.combatants.filter(c => c !== this && !c.isDead);
      if (candidates.length > 0) {
        // Bias toward local player
        if (Math.random() < 0.6 && !game.player.isDead) {
          this.botTarget = game.player;
        } else {
          this.botTarget = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }

    if (!this.botTarget) {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    const dx = this.botTarget.x - this.x;
    const dy = this.botTarget.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Aim toward target with accuracy variance based on difficulty
    let targetAngle = Math.atan2(dy, dx);
    const inaccuracy = this.botDifficulty === 'easy' ? 0.35 : (this.botDifficulty === 'medium' ? 0.18 : 0.06);
    targetAngle += (Math.random() - 0.5) * inaccuracy;

    // Smooth turn
    let diff = targetAngle - this.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.angle += diff * (this.botDifficulty === 'easy' ? 0.08 : 0.18);

    // Movement behavior
    const idealDist = this.weapon.id === 'shotgun' ? 140 : 350;
    let moveX = 0;
    let moveY = 0;

    if (dist > idealDist + 60) {
      // Approach
      moveX += Math.cos(targetAngle);
      moveY += Math.sin(targetAngle);
    } else if (dist < idealDist - 60) {
      // Back off
      moveX -= Math.cos(targetAngle);
      moveY -= Math.sin(targetAngle);
    }

    // Tactical strafing
    if (Math.random() < 0.04) {
      this.botStrafeDir *= -1;
    }
    const strafeAngle = targetAngle + (Math.PI / 2) * this.botStrafeDir;
    moveX += Math.cos(strafeAngle) * 0.7;
    moveY += Math.sin(strafeAngle) * 0.7;

    const moveMag = Math.hypot(moveX, moveY);
    const botSpeed = this.speed * (this.botDifficulty === 'easy' ? 0.75 : 0.95);
    if (moveMag > 0.01) {
      this.vx = (moveX / moveMag) * botSpeed;
      this.vy = (moveY / moveMag) * botSpeed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // Shoot if within line of sight & range
    if (dist < this.weapon.range * 0.85) {
      const shootChance = this.botDifficulty === 'easy' ? 0.4 : (this.botDifficulty === 'medium' ? 0.75 : 0.95);
      if (Math.random() < shootChance) {
        this.shoot(game);
      }
    }
  }

  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Invulnerability shield bubble
    if (this.invulnerableTimer > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00e5ff';
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Callsign overhead
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.isLocal ? '#00e5ff' : '#ffffff';
    ctx.fillText(this.name, 0, -this.radius - 14);

    // Mini overhead HP bar for non-local players
    if (!this.isLocal) {
      const barW = 34;
      const barH = 4;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(-barW / 2, -this.radius - 10, barW, barH);
      const hpPct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = hpPct > 0.35 ? '#00e5ff' : '#ff0055';
      ctx.fillRect(-barW / 2, -this.radius - 10, barW * hpPct, barH);
    }

    // Rotate for top-down soldier rendering
    ctx.rotate(this.angle);

    // Weapon barrel extending forward
    ctx.fillStyle = '#1e2430';
    ctx.strokeStyle = '#3a4454';
    ctx.lineWidth = 1;

    if (this.weapon.id === 'shotgun') {
      ctx.fillRect(8, -4, 18, 8);
      ctx.strokeRect(8, -4, 18, 8);
    } else if (this.weapon.id === 'dmr') {
      ctx.fillRect(8, -2.5, 26, 5);
      ctx.strokeRect(8, -2.5, 26, 5);
    } else if (this.weapon.id === 'smg') {
      ctx.fillRect(8, -3, 14, 6);
      ctx.strokeRect(8, -3, 14, 6);
    } else if (this.weapon.id === 'plasma') {
      ctx.fillStyle = '#4a148c';
      ctx.fillRect(8, -5, 16, 10);
      ctx.fillStyle = '#e040fb';
      ctx.beginPath();
      ctx.arc(22, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Pistol
      ctx.fillRect(8, -2, 12, 4);
      ctx.strokeRect(8, -2, 12, 4);
    }

    // Hands holding weapon
    ctx.fillStyle = '#2c3545';
    ctx.beginPath();
    ctx.arc(12, -7, 4.5, 0, Math.PI * 2);
    ctx.arc(12, 7, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Soldier Body / Armor
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#161c28';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.color;
    ctx.stroke();

    // Helmet with tactical visor
    ctx.beginPath();
    ctx.arc(-2, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#222b3d';
    ctx.fill();

    // Glowing visor slit
    ctx.beginPath();
    ctx.arc(4, 0, 5, -Math.PI / 3, Math.PI / 3);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.color;
    ctx.stroke();

    // Aim Laser Sight for Local Player
    if (this.isLocal) {
      ctx.beginPath();
      ctx.moveTo(this.radius + 15, 0);
      ctx.lineTo(this.radius + 320, 0);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
}

// ==========================================
// 5. BULLET & PROJECTILES
// ==========================================
class Bullet {
  constructor(x, y, angle, speed, damage, maxRange, radius, color, shooterId, isPlasma = false) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.maxRange = maxRange;
    this.traveled = 0;
    this.radius = radius;
    this.color = color;
    this.shooterId = shooterId;
    this.isPlasma = isPlasma;
    this.despawned = false;
  }

  update(dt, game) {
    if (this.despawned) return;

    const stepX = this.vx * dt * 60;
    const stepY = this.vy * dt * 60;
    this.x += stepX;
    this.y += stepY;
    this.traveled += Math.hypot(stepX, stepY);

    if (this.traveled >= this.maxRange) {
      this.despawned = true;
      return;
    }

    // Collision with Arena Walls
    for (const w of game.currentArena.walls) {
      if (circleRectOverlap(this.x, this.y, this.radius, w.x, w.y, w.w, w.h)) {
        this.despawned = true;
        game.particles.spawnWallSparks(this.x, this.y, this.color);
        return;
      }
    }

    // Collision with Combatants
    for (const c of game.combatants) {
      if (c.id === this.shooterId || c.isDead) continue;

      const dist = Math.hypot(c.x - this.x, c.y - this.y);
      if (dist < c.radius + this.radius) {
        this.despawned = true;
        const shooter = game.combatants.find(p => p.id === this.shooterId);
        c.takeDamage(this.damage, shooter, game);
        return;
      }
    }
  }

  draw(ctx) {
    if (this.despawned) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.isPlasma ? 12 : 6;
    ctx.fill();
    ctx.restore();
  }
}

// ==========================================
// 6. VISUAL FX & PARTICLE ENGINE
// ==========================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawnMuzzleFlash(x, y, angle, color) {
    for (let i = 0; i < 6; i++) {
      const speed = 2 + Math.random() * 4;
      const spread = angle + (Math.random() - 0.5) * 0.7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed,
        life: 0.15 + Math.random() * 0.1,
        maxLife: 0.25,
        size: 3 + Math.random() * 2,
        color: '#ffffff'
      });
    }
  }

  spawnHitSparks(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        size: 2.5 + Math.random() * 2,
        color: color || '#ff0055'
      });
    }
  }

  spawnWallSparks(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.18 + Math.random() * 0.15,
        maxLife: 0.35,
        size: 2,
        color: color || '#ffb700'
      });
    }
  }

  spawnExplosion(x, y, color) {
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 4 + Math.random() * 4,
        color: Math.random() > 0.5 ? color : '#ffea00'
      });
    }
  }

  spawnShieldPulse(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: 3,
        color: '#00e5ff'
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Floating Damage Numbers
class FloatingTextSystem {
  constructor() {
    this.texts = [];
  }

  spawn(text, x, y, color = '#ff0055') {
    this.texts.push({
      text,
      x: x + (Math.random() - 0.5) * 16,
      y,
      vy: -1.8,
      life: 0.8,
      maxLife: 0.8,
      color
    });
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y += t.vy * dt * 60;
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}

// Helper: Circle-Rect collision
function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

// ==========================================
// 7. INPUT & DUAL VIRTUAL JOYSTICK MANAGER
// ==========================================
class InputManager {
  constructor(game) {
    this.game = game;

    // Movement vector: -1 to 1
    this.moveVector = { x: 0, y: 0 };
    // Aim angle & shooting state
    this.aimAngle = 0;
    this.isShooting = false;

    // Keyboard keys
    this.keys = {};

    // Touch Joystick State
    this.leftTouchId = null;
    this.rightTouchId = null;

    this.leftJoystick = {
      baseEl: document.getElementById('joystick-left-base'),
      stickEl: document.getElementById('joystick-left-stick'),
      zoneEl: document.getElementById('joystick-left-zone'),
      centerX: 0,
      centerY: 0,
      maxRadius: 46
    };

    this.rightJoystick = {
      baseEl: document.getElementById('joystick-right-base'),
      stickEl: document.getElementById('joystick-right-stick'),
      zoneEl: document.getElementById('joystick-right-zone'),
      centerX: 0,
      centerY: 0,
      maxRadius: 46
    };

    this.setupKeyboard();
    this.setupMouse();
    this.setupTouchJoysticks();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      this.updateKeyboardMovement();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.updateKeyboardMovement();
    });
  }

  updateKeyboardMovement() {
    let mx = 0;
    let my = 0;
    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) my += 1;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;

    // Only override touch movement if keys are actually pressed
    if (mx !== 0 || my !== 0 || (this.leftTouchId === null)) {
      const mag = Math.hypot(mx, my);
      if (mag > 0) {
        this.moveVector.x = mx / mag;
        this.moveVector.y = my / mag;
      } else if (this.leftTouchId === null) {
        this.moveVector.x = 0;
        this.moveVector.y = 0;
      }
    }
  }

  setupMouse() {
    const canvas = document.getElementById('game-canvas');

    window.addEventListener('mousemove', (e) => {
      if (!this.game.isPlaying || this.rightTouchId !== null) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Aim angle relative to local player screen position
      const screenPlayerX = this.game.player.x - this.game.camera.x;
      const screenPlayerY = this.game.player.y - this.game.camera.y;

      this.aimAngle = Math.atan2(mouseY - screenPlayerY, mouseX - screenPlayerX);
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.game.isPlaying) return;
      if (e.target.closest('#in-game-hud button') || e.target.closest('.modal-card')) return;
      if (e.button === 0) { // Left click
        this.isShooting = true;
        this.game.sound.init();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isShooting = false;
      }
    });
  }

  setupTouchJoysticks() {
    const leftZone = this.leftJoystick.zoneEl;
    const rightZone = this.rightJoystick.zoneEl;

    // Touch Start
    const onTouchStart = (e) => {
      this.game.sound.init();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const clientX = touch.clientX;
        const clientY = touch.clientY;

        // Check if in Left Zone
        const leftRect = leftZone.getBoundingClientRect();
        if (
          clientX >= leftRect.left && clientX <= leftRect.right &&
          clientY >= leftRect.top && clientY <= leftRect.bottom &&
          this.leftTouchId === null
        ) {
          this.leftTouchId = touch.identifier;
          this.leftJoystick.centerX = leftRect.left + leftRect.width / 2;
          this.leftJoystick.centerY = leftRect.top + leftRect.height / 2;
          this.handleLeftStickMove(clientX, clientY);
          continue;
        }

        // Check if in Right Zone (Aim & Auto-Shoot)
        const rightRect = rightZone.getBoundingClientRect();
        if (
          clientX >= rightRect.left && clientX <= rightRect.right &&
          clientY >= rightRect.top && clientY <= rightRect.bottom &&
          this.rightTouchId === null
        ) {
          this.rightTouchId = touch.identifier;
          this.rightJoystick.centerX = rightRect.left + rightRect.width / 2;
          this.rightJoystick.centerY = rightRect.top + rightRect.height / 2;
          this.handleRightStickMove(clientX, clientY);
          this.isShooting = true;
          continue;
        }
      }
    };

    // Touch Move
    const onTouchMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.leftTouchId) {
          this.handleLeftStickMove(touch.clientX, touch.clientY);
        } else if (touch.identifier === this.rightTouchId) {
          this.handleRightStickMove(touch.clientX, touch.clientY);
          this.isShooting = true;
        }
      }
    };

    // Touch End / Cancel
    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.leftTouchId) {
          this.leftTouchId = null;
          this.moveVector.x = 0;
          this.moveVector.y = 0;
          this.leftJoystick.stickEl.style.transform = 'translate(0px, 0px)';
          this.updateKeyboardMovement();
        } else if (touch.identifier === this.rightTouchId) {
          this.rightTouchId = null;
          this.isShooting = false;
          this.rightJoystick.stickEl.style.transform = 'translate(0px, 0px)';
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  handleLeftStickMove(clientX, clientY) {
    const dx = clientX - this.leftJoystick.centerX;
    const dy = clientY - this.leftJoystick.centerY;
    const dist = Math.hypot(dx, dy);
    const maxR = this.leftJoystick.maxRadius;

    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    this.leftJoystick.stickEl.style.transform = `translate(${stickX}px, ${stickY}px)`;

    // Deadzone
    if (dist > 8) {
      const mag = (clampedDist / maxR) * this.game.settings.sensitivity;
      this.moveVector.x = Math.cos(angle) * mag;
      this.moveVector.y = Math.sin(angle) * mag;
    } else {
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    }
  }

  handleRightStickMove(clientX, clientY) {
    const dx = clientX - this.rightJoystick.centerX;
    const dy = clientY - this.rightJoystick.centerY;
    const dist = Math.hypot(dx, dy);
    const maxR = this.rightJoystick.maxRadius;

    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const stickX = Math.cos(angle) * clampedDist;
    const stickY = Math.sin(angle) * clampedDist;

    this.rightJoystick.stickEl.style.transform = `translate(${stickX}px, ${stickY}px)`;

    if (dist > 8) {
      this.aimAngle = angle;
      this.isShooting = true;
    }
  }
}

// ==========================================
// 8. PEERJS WEBRTC MULTIPLAYER MANAGER
// ==========================================
class NetworkManager {
  constructor(game) {
    this.game = game;
    this.peer = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.isHost = false;
    this.isConnected = false;
    this.roomCode = null;
    this.syncInterval = null;
  }

  initPeer(onOpen) {
    if (this.peer && !this.peer.destroyed) {
      this.destroy();
    }

    // Generate room code prefix
    const randomCode = 'APEX-' + Math.floor(1000 + Math.random() * 9000);
    this.peer = new Peer(randomCode, {
      debug: 1
    });

    this.peer.on('open', (id) => {
      this.roomCode = id;
      this.isConnected = true;
      this.game.player.id = id;
      if (onOpen) onOpen(id);
    });

    this.peer.on('connection', (conn) => {
      this.handleIncomingConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS error:', err);
      this.game.showToast(`Network: ${err.type || 'Connection issue'}`);
      if (err.type === 'peer-unavailable') {
        const joinMsg = document.getElementById('join-status-msg');
        if (joinMsg) joinMsg.textContent = 'Room code not found or host offline.';
      }
    });
  }

  createRoom() {
    this.isHost = true;
    this.game.isClientMultiplayer = false;
    this.game.updateArenaLockUI();

    this.initPeer((id) => {
      document.getElementById('display-room-code').textContent = id;
      document.getElementById('host-room-info').classList.remove('hidden');
      document.getElementById('btn-start-multi').disabled = false;
      this.game.updateHostLobbySummary();
      this.updateLobbyDisplay();
      this.game.updateDebugTag();
      this.game.showToast('Room created! Share the code to invite allies.');
    });
  }

  joinRoom(targetRoomCode) {
    this.isHost = false;
    this.game.isClientMultiplayer = true;
    this.game.hasMatchConfig = false;
    this.game.updateArenaLockUI();

    if (this.peer && !this.peer.destroyed) {
      this.destroy();
    }

    // Create random client peer id
    this.peer = new Peer(null, { debug: 1 });

    const statusMsg = document.getElementById('join-status-msg');
    if (statusMsg) statusMsg.textContent = 'Contacting host...';
    this.game.showWaitingForHostOverlay(`Contacting host at room ${targetRoomCode}...`);

    this.peer.on('open', () => {
      this.game.player.id = this.peer.id;
      const conn = this.peer.connect(targetRoomCode, { reliable: true });

      conn.on('open', () => {
        if (statusMsg) statusMsg.textContent = 'Connected! Waiting for host match configuration...';
        this.game.updateWaitingOverlayStatus('Connected to host! Awaiting match configuration & start signal...');
        this.isConnected = true;
        this.connections.set(conn.peer, conn);

        // Send Join handshake with player info
        conn.send({
          type: 'join',
          name: this.game.player.name,
          weaponId: this.game.player.weapon.id,
          color: this.game.player.color
        });

        // NOTE: The joining client does NOT initialize or render the game world
        // until match_config & start_match are received from the host!
      });

      conn.on('data', (data) => {
        this.handleNetworkMessage(data, conn.peer);
      });

      conn.on('close', () => {
        this.game.showToast('Disconnected from host.');
        this.game.hideWaitingForHostOverlay();
        this.game.exitToMenu();
      });
    });

    this.peer.on('error', (err) => {
      console.warn('PeerJS error:', err);
      if (statusMsg) statusMsg.textContent = `Failed to join: ${err.message || err.type}`;
      this.game.hideWaitingForHostOverlay();
      this.game.showToast(`Join failed: ${err.type || 'Host offline'}`);
    });
  }

  handleIncomingConnection(conn) {
    if (this.connections.size >= 7) {
      conn.close(); // max 8 players
      return;
    }

    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.updateLobbyDisplay();

      // Immediately send authoritative match configuration to the joining client
      conn.send({
        type: 'match_config',
        arenaId: this.game.currentArena.id,
        scoreTarget: this.game.multiScoreTarget,
        timeLimit: this.game.multiTimeLimit,
        hostName: this.game.player.name,
        isMatchActive: this.game.isPlaying
      });
    });

    conn.on('data', (data) => {
      this.handleNetworkMessage(data, conn.peer);
    });

    conn.on('close', () => {
      this.handlePeerDisconnect(conn.peer);
    });
  }

  handleNetworkMessage(data, senderPeerId) {
    if (!data) return;

    if (data.type === 'join') {
      // Host adds remote combatant
      const existing = this.game.combatants.find(c => c.id === senderPeerId);
      if (!existing) {
        const remotePlayer = new Combatant(senderPeerId, data.name || 'Soldier', false, false, data.color || '#ff0055');
        remotePlayer.weapon = WEAPONS[data.weaponId] || WEAPONS.pistol;
        this.game.combatants.push(remotePlayer);
        this.game.showToast(`${remotePlayer.name} joined combat.`);
        this.updateLobbyDisplay();
      }

      // Re-send match_config to ensure client has loaded the host's arena and settings
      if (this.isHost) {
        const clientConn = this.connections.get(senderPeerId);
        if (clientConn && clientConn.open) {
          clientConn.send({
            type: 'match_config',
            arenaId: this.game.currentArena.id,
            scoreTarget: this.game.multiScoreTarget,
            timeLimit: this.game.multiTimeLimit,
            hostName: this.game.player.name,
            isMatchActive: this.game.isPlaying
          });
        }
      }
    } else if (data.type === 'match_config' && !this.isHost) {
      // Client receives authoritative match configuration from host
      this.game.applyHostMatchConfig(data);
      if (data.isMatchActive && !this.game.isPlaying) {
        this.game.hideWaitingForHostOverlay();
        this.game.startMatch('multiplayer');
      }
    } else if (data.type === 'start_match' && !this.isHost) {
      // Host clicked START MATCH
      if (data.arenaId) {
        this.game.applyHostMatchConfig(data);
      }
      this.game.hideWaitingForHostOverlay();
      if (!this.game.isPlaying) {
        this.game.startMatch('multiplayer');
      }
    } else if (data.type === 'match_ended') {
      // Host declared match over (target reached or time expired)
      let winner = this.game.combatants.find(c => c.id === data.winnerId);
      if (!winner) {
        winner = {
          id: data.winnerId,
          name: data.winnerName || 'Host',
          isLocal: data.winnerId === this.game.player.id,
          kills: data.winnerKills || 0,
          deaths: 0
        };
      }
      this.game.endMatch(winner);
    } else if (data.type === 'sync_state' && !this.isHost) {
      // Client receives authoritative world state from host
      if (data.combatants) {
        for (const remoteData of data.combatants) {
          if (remoteData.id === this.game.player.id) {
            // Local player health and score updates from host
            this.game.player.hp = remoteData.hp;
            this.game.player.kills = remoteData.kills;
            this.game.player.deaths = remoteData.deaths;
            if (remoteData.isDead && !this.game.player.isDead) {
              this.game.player.die(null, this.game);
            }
          } else {
            let remote = this.game.combatants.find(c => c.id === remoteData.id);
            if (!remote) {
              remote = new Combatant(remoteData.id, remoteData.name, false, false, remoteData.color);
              this.game.combatants.push(remote);
            }
            remote.targetX = remoteData.x;
            remote.targetY = remoteData.y;
            remote.targetAngle = remoteData.angle;
            remote.hp = remoteData.hp;
            remote.kills = remoteData.kills;
            remote.deaths = remoteData.deaths;
            remote.isDead = remoteData.isDead;
          }

          // Check if anyone reached scoreTarget on client
          if (this.game.scoreTarget > 0 && remoteData.kills >= this.game.scoreTarget && this.game.isPlaying) {
            const targetWinner = this.game.combatants.find(c => c.id === remoteData.id) || this.game.player;
            this.game.endMatch(targetWinner);
          }
        }
      }
    } else if (data.type === 'client_input') {
      // Host receives client movements
      const remote = this.game.combatants.find(c => c.id === senderPeerId);
      if (remote) {
        remote.targetX = data.x;
        remote.targetY = data.y;
        remote.targetAngle = data.angle;
      }
    } else if (data.type === 'shot') {
      // Remote player fired a shot
      if (data.shooterId !== this.game.player.id) {
        const shooter = this.game.combatants.find(c => c.id === data.shooterId);
        const weapon = WEAPONS[data.weaponId] || WEAPONS.pistol;
        const bullet = new Bullet(
          data.x,
          data.y,
          data.angle,
          weapon.speed,
          weapon.damage,
          weapon.range,
          weapon.bulletRadius,
          weapon.color,
          data.shooterId,
          weapon.id === 'plasma'
        );
        this.game.bullets.push(bullet);
        this.game.sound.playShoot(weapon.id);
        this.game.particles.spawnMuzzleFlash(data.x, data.y, data.angle, weapon.color);
      }
    }
  }

  broadcastShot(shotData) {
    const msg = { type: 'shot', ...shotData };
    this.broadcast(msg);
  }

  broadcast(msg) {
    for (const [_, conn] of this.connections) {
      if (conn.open) {
        conn.send(msg);
      }
    }
  }

  startSyncLoop() {
    this.stopSyncLoop();
    // 15 times/sec state sync
    this.syncInterval = setInterval(() => {
      if (!this.game.isPlaying) return;

      if (this.isHost) {
        // Broadcast all combatants state
        const state = {
          type: 'sync_state',
          combatants: this.game.combatants.map(c => ({
            id: c.id,
            name: c.name,
            x: Math.round(c.x),
            y: Math.round(c.y),
            angle: parseFloat(c.angle.toFixed(2)),
            hp: c.hp,
            kills: c.kills,
            deaths: c.deaths,
            isDead: c.isDead,
            color: c.color
          }))
        };
        this.broadcast(state);
      } else {
        // Send local input to host
        this.broadcast({
          type: 'client_input',
          x: Math.round(this.game.player.x),
          y: Math.round(this.game.player.y),
          angle: parseFloat(this.game.player.angle.toFixed(2))
        });
      }
    }, 66); // ~15Hz
  }

  stopSyncLoop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  handlePeerDisconnect(peerId) {
    this.connections.delete(peerId);
    const idx = this.game.combatants.findIndex(c => c.id === peerId);
    if (idx !== -1) {
      const removed = this.game.combatants.splice(idx, 1)[0];
      this.game.showToast(`${removed.name} left the match.`);
    }
    this.updateLobbyDisplay();
  }

  updateLobbyDisplay() {
    const countEl = document.getElementById('lobby-player-count');
    const listEl = document.getElementById('host-lobby-list');
    if (!countEl || !listEl) return;

    const total = 1 + this.connections.size;
    countEl.textContent = `Players in lobby: ${total}/8`;

    listEl.innerHTML = '';
    // Add Host
    const hostItem = document.createElement('div');
    hostItem.className = 'lobby-player-item';
    hostItem.innerHTML = `<span>👑 ${this.game.player.name} (Host)</span><span>READY</span>`;
    listEl.appendChild(hostItem);

    // Add Connected Peers
    for (const [peerId, _] of this.connections) {
      const combatant = this.game.combatants.find(c => c.id === peerId);
      const item = document.createElement('div');
      item.className = 'lobby-player-item';
      item.innerHTML = `<span>⚔️ ${combatant ? combatant.name : 'Allied Soldier'}</span><span>CONNECTED</span>`;
      listEl.appendChild(item);
    }
  }

  destroy() {
    this.stopSyncLoop();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections.clear();
    this.isConnected = false;
    this.isHost = false;
  }
}

// ==========================================
// 9. MAIN GAME ENGINE
// ==========================================
class ApexGame {
  constructor() {
    this.sound = new SoundSynth();
    this.particles = new ParticleSystem();
    this.floatingTexts = new FloatingTextSystem();
    this.network = new NetworkManager(this);

    this.settings = {
      sfx: true,
      screenShake: true,
      sensitivity: 1.0,
      playerColor: '#00e5ff'
    };

    this.currentWeapon = WEAPONS.pistol;
    this.currentArena = ARENAS.compound;
    this.scoreTarget = 10;
    this.multiScoreTarget = 10;
    this.multiTimeLimit = 300;
    this.matchTimeRemaining = 300;
    this.isClientMultiplayer = false;
    this.hasMatchConfig = false;
    this.botCount = 2;
    this.botDifficulty = 'medium';

    this.player = new Combatant('local_player', 'VIPER-7', true, false, this.settings.playerColor);
    this.combatants = [this.player];
    this.bullets = [];

    this.careerStats = this.loadCareerStats();

    this.camera = { x: 0, y: 0 };
    this.shakeMagnitude = 0;

    this.isPlaying = false;
    this.isPaused = false;
    this.matchMode = 'solo';

    // Canvas references
    this.gameCanvas = document.getElementById('game-canvas');
    this.gameCtx = this.gameCanvas.getContext('2d');
    this.previewCanvas = document.getElementById('character-preview-canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');

    this.previewAnimTime = 0;
    this.lastFrameTime = performance.now();

    this.input = new InputManager(this);

    this.initUI();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start preview animation loop
    this.startPreviewLoop();
  }

  resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;
  }

  initUI() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tabKey = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`panel-${tabKey}`);
        if (panel) panel.classList.add('active');
      });
    });

    // Callsign input
    const nameInput = document.getElementById('player-name-input');
    nameInput.addEventListener('input', (e) => {
      this.player.name = e.target.value.trim() || 'SOLDIER';
    });

    // Randomize name
    document.getElementById('btn-random-name').addEventListener('click', () => {
      this.sound.playClick();
      const prefixes = ['VIPER', 'GHOST', 'SHADOW', 'TITAN', 'REAPER', 'RAZOR', 'VALKYRIE', 'STORM'];
      const num = Math.floor(1 + Math.random() * 99);
      const generated = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${num}`;
      nameInput.value = generated;
      this.player.name = generated;
    });

    // Solo Mode Pill Selectors
    this.setupPillSelector('bot-count-selector', (val) => {
      this.botCount = parseInt(val, 10);
    });
    this.setupPillSelector('bot-diff-selector', (val) => {
      this.botDifficulty = val;
    });
    this.setupPillSelector('score-target-selector', (val) => {
      this.scoreTarget = parseInt(val, 10);
      document.getElementById('hud-target-score').textContent = `${this.scoreTarget} KILLS`;
    });

    // Start Solo Button
    document.getElementById('btn-start-solo').addEventListener('click', () => {
      this.sound.playClick();
      this.startMatch('solo');
    });

    // Multiplayer Subtabs & Buttons
    const multiSubBtns = document.querySelectorAll('.subtab-btn');
    multiSubBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        multiSubBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sub = btn.dataset.sub;
        document.querySelectorAll('.subpanel').forEach(p => p.classList.remove('active'));
        document.getElementById(`subpanel-${sub}`).classList.add('active');

        this.isClientMultiplayer = (sub === 'join');
        this.updateArenaLockUI();
        this.updateDebugTag();
      });
    });

    // Host Arena Selector (Host chooses arena before room creation)
    this.setupHostArenaSelector();

    // Host Kill Target Selector (5, 10, 15, or 0 for 5 min limit)
    this.setupPillSelector('multi-target-selector', (val) => {
      this.multiScoreTarget = parseInt(val, 10);
      this.updateHostLobbySummary();
      this.updateDebugTag();
    });

    document.getElementById('btn-create-room').addEventListener('click', () => {
      this.sound.playClick();
      this.network.createRoom();
    });

    document.getElementById('btn-copy-code').addEventListener('click', () => {
      this.sound.playClick();
      if (this.network.roomCode) {
        navigator.clipboard.writeText(this.network.roomCode)
          .then(() => this.showToast('Room code copied to clipboard!'))
          .catch(() => this.showToast(`Code: ${this.network.roomCode}`));
      }
    });

    document.getElementById('btn-start-multi').addEventListener('click', () => {
      this.sound.playClick();
      this.network.broadcast({
        type: 'start_match',
        arenaId: this.currentArena.id,
        scoreTarget: this.multiScoreTarget,
        timeLimit: this.multiTimeLimit
      });
      this.startMatch('multiplayer');
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
      this.sound.playClick();
      const code = document.getElementById('input-room-code').value.trim().toUpperCase();
      if (code.length < 4) {
        document.getElementById('join-status-msg').textContent = 'Please enter a valid room code.';
        return;
      }
      this.network.joinRoom(code);
    });

    // Cancel Waiting for Host button
    const cancelWaitBtn = document.getElementById('btn-cancel-waiting');
    if (cancelWaitBtn) {
      cancelWaitBtn.addEventListener('click', () => {
        this.sound.playClick();
        this.network.destroy();
        this.hideWaitingForHostOverlay();
        this.exitToMenu();
      });
    }

    // Populate Weapons Arsenal
    this.renderWeaponsGrid();

    // Populate Arenas
    this.renderArenasGrid();

    // Settings
    const sfxCheckbox = document.getElementById('setting-sfx');
    sfxCheckbox.addEventListener('change', (e) => {
      this.settings.sfx = e.target.checked;
      this.sound.enabled = e.target.checked;
      document.getElementById('sound-icon').textContent = e.target.checked ? '🔊' : '🔇';
    });

    const shakeCheckbox = document.getElementById('setting-shake');
    shakeCheckbox.addEventListener('change', (e) => {
      this.settings.screenShake = e.target.checked;
    });

    const sensSlider = document.getElementById('setting-sensitivity');
    sensSlider.addEventListener('input', (e) => {
      this.settings.sensitivity = parseFloat(e.target.value);
    });

    // Player Color picker
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        this.sound.playClick();
        colorSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.settings.playerColor = swatch.dataset.color;
        this.player.color = this.settings.playerColor;
      });
    });

    // Sound toggle in header
    document.getElementById('btn-sound-toggle').addEventListener('click', () => {
      this.sound.init();
      this.settings.sfx = !this.settings.sfx;
      this.sound.enabled = this.settings.sfx;
      sfxCheckbox.checked = this.settings.sfx;
      document.getElementById('sound-icon').textContent = this.settings.sfx ? '🔊' : '🔇';
    });

    // Fullscreen toggle
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Pause button in HUD
    document.getElementById('btn-pause-game').addEventListener('click', () => {
      this.sound.playClick();
      this.pauseGame();
    });

    document.getElementById('btn-resume-game').addEventListener('click', () => {
      this.sound.playClick();
      this.resumeGame();
    });

    document.getElementById('btn-pause-sound').addEventListener('click', () => {
      this.settings.sfx = !this.settings.sfx;
      this.sound.enabled = this.settings.sfx;
      document.getElementById('sound-icon').textContent = this.settings.sfx ? '🔊' : '🔇';
      this.showToast(`Sound: ${this.settings.sfx ? 'ON' : 'OFF'}`);
    });

    document.getElementById('btn-quit-match').addEventListener('click', () => {
      this.sound.playClick();
      this.exitToMenu();
    });

    // Reset career stats button
    const resetCareerBtn = document.getElementById('btn-reset-career');
    if (resetCareerBtn) {
      resetCareerBtn.addEventListener('click', () => {
        this.sound.playClick();
        if (confirm('Reset your lifetime combat records?')) {
          this.resetCareerStats();
        }
      });
    }

    this.updateCareerStatsUI();
    this.updateHostLobbySummary();
    this.updateArenaLockUI();
    this.updateTargetHUD();
    this.updateDebugTag();

    // Summary buttons
    document.getElementById('btn-summary-rematch').addEventListener('click', () => {
      this.sound.playClick();
      document.getElementById('match-summary-modal').classList.add('hidden');
      if (this.matchMode === 'multiplayer') {
        if (this.network.isHost) {
          this.network.broadcast({
            type: 'start_match',
            arenaId: this.currentArena.id,
            scoreTarget: this.multiScoreTarget,
            timeLimit: this.multiTimeLimit
          });
          this.startMatch('multiplayer');
        } else {
          this.showWaitingForHostOverlay('Rematch requested. Waiting for host to launch combat theater...');
        }
      } else {
        this.startMatch('solo');
      }
    });

    document.getElementById('btn-summary-menu').addEventListener('click', () => {
      this.sound.playClick();
      document.getElementById('match-summary-modal').classList.add('hidden');
      this.exitToMenu();
    });
  }

  loadCareerStats() {
    try {
      const data = localStorage.getItem('apex_career_stats');
      if (data) {
        return JSON.parse(data);
      }
    } catch (_) {}
    return { kills: 0, deaths: 0, wins: 0, losses: 0 };
  }

  saveCareerStats() {
    try {
      localStorage.setItem('apex_career_stats', JSON.stringify(this.careerStats));
    } catch (_) {}
    this.updateCareerStatsUI();
  }

  recordMatchResult(isVictory, kills, deaths) {
    this.careerStats.kills = (this.careerStats.kills || 0) + kills;
    this.careerStats.deaths = (this.careerStats.deaths || 0) + deaths;
    if (isVictory) {
      this.careerStats.wins = (this.careerStats.wins || 0) + 1;
    } else {
      this.careerStats.losses = (this.careerStats.losses || 0) + 1;
    }
    this.saveCareerStats();
  }

  updateCareerStatsUI() {
    const kEl = document.getElementById('stat-kills');
    const dEl = document.getElementById('stat-deaths');
    const kdEl = document.getElementById('stat-kd');
    const wEl = document.getElementById('stat-wins');
    const lEl = document.getElementById('stat-losses');
    const wlEl = document.getElementById('stat-wl');

    const kills = this.careerStats?.kills || 0;
    const deaths = this.careerStats?.deaths || 0;
    const wins = this.careerStats?.wins || 0;
    const losses = this.careerStats?.losses || 0;

    const kd = deaths === 0 ? kills.toFixed(2) : (kills / deaths).toFixed(2);
    const wl = losses === 0 ? wins.toFixed(2) : (wins / losses).toFixed(2);

    if (kEl) kEl.textContent = kills;
    if (dEl) dEl.textContent = deaths;
    if (kdEl) kdEl.textContent = kd;
    if (wEl) wEl.textContent = wins;
    if (lEl) lEl.textContent = losses;
    if (wlEl) wlEl.textContent = wl;
  }

  resetCareerStats() {
    this.careerStats = { kills: 0, deaths: 0, wins: 0, losses: 0 };
    this.saveCareerStats();
    this.showToast('Career stats reset.');
  }

  setupPillSelector(containerId, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const btns = container.querySelectorAll('.pill-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange(btn.dataset.val);
      });
    });
  }

  renderWeaponsGrid() {
    const container = document.getElementById('weapons-container');
    container.innerHTML = '';

    for (const [key, w] of Object.entries(WEAPONS)) {
      const card = document.createElement('div');
      card.className = `weapon-card ${w.id === this.currentWeapon.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="weapon-header">
          <div class="weapon-icon-box">${w.icon}</div>
          <div class="weapon-title">
            <h4>${w.name}</h4>
            <span>${w.category}</span>
          </div>
        </div>
        <p style="font-size:0.75rem; color:#8899b3; margin-bottom:8px;">${w.desc}</p>
        <div class="weapon-stats">
          <div class="stat-row">
            <span>DAMAGE</span>
            <div class="stat-track"><div class="stat-bar" style="width: ${(w.damage / 60) * 100}%"></div></div>
          </div>
          <div class="stat-row">
            <span>RATE</span>
            <div class="stat-track"><div class="stat-bar" style="width: ${(800 / w.fireRate) * 12}%"></div></div>
          </div>
          <div class="stat-row">
            <span>ACCURACY</span>
            <div class="stat-track"><div class="stat-bar" style="width: ${(1 - w.spread * 3) * 100}%"></div></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.sound.playClick();
        document.querySelectorAll('.weapon-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentWeapon = w;
        this.player.weapon = w;
        document.getElementById('badge-weapon').textContent = w.name;
      });

      container.appendChild(card);
    }
  }

  renderArenasGrid() {
    const container = document.getElementById('arenas-container');
    container.innerHTML = '';

    for (const [key, a] of Object.entries(ARENAS)) {
      const isSelected = a.id === this.currentArena.id;
      const card = document.createElement('div');
      card.className = `arena-card ${isSelected ? 'active' : ''} ${this.isClientMultiplayer ? 'locked' : ''}`;
      card.innerHTML = `
        <div class="arena-thumb-container">
          <canvas class="arena-canvas-preview" width="260" height="110" id="thumb-${a.id}"></canvas>
        </div>
        <div class="arena-info">
          <h4>${a.name} ${this.isClientMultiplayer ? '🔒' : ''}</h4>
          <p>${a.desc}</p>
        </div>
      `;

      card.addEventListener('click', () => {
        if (this.isClientMultiplayer) {
          this.showToast(`Arena is determined by Room Host (${this.currentArena.name})`);
          return;
        }
        this.sound.playClick();
        document.querySelectorAll('.arena-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.currentArena = a;
        document.getElementById('badge-arena').textContent = a.name;

        // Also sync host-arena-selector if present
        const hostBtns = document.querySelectorAll('#host-arena-selector button');
        hostBtns.forEach(b => {
          if (b.dataset.arena === a.id) b.classList.add('active');
          else b.classList.remove('active');
        });
        this.updateHostLobbySummary();
        this.updateDebugTag();
      });

      container.appendChild(card);
      // Draw arena thumbnail
      setTimeout(() => this.drawArenaThumbnail(`thumb-${a.id}`, a), 50);
    }
  }

  setupHostArenaSelector() {
    const selector = document.getElementById('host-arena-selector');
    if (!selector) return;
    const buttons = selector.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.sound.playClick();
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const arenaKey = btn.dataset.arena;
        if (ARENAS[arenaKey]) {
          this.currentArena = ARENAS[arenaKey];
          document.getElementById('badge-arena').textContent = this.currentArena.name;
          this.updateHostLobbySummary();
          this.renderArenasGrid();
          this.updateDebugTag();
        }
      });
    });
  }

  updateHostLobbySummary() {
    const arenaEl = document.getElementById('host-summary-arena');
    const targetEl = document.getElementById('host-summary-target');
    if (arenaEl) arenaEl.textContent = this.currentArena.name;
    if (targetEl) {
      targetEl.textContent = this.multiScoreTarget === 0 ? '5 MIN LIMIT' : `${this.multiScoreTarget} KILLS`;
    }
  }

  updateArenaLockUI() {
    const banner = document.getElementById('arena-lock-banner');
    const lockName = document.getElementById('arena-lock-name');
    if (banner) {
      if (this.isClientMultiplayer) {
        banner.classList.remove('hidden');
        if (lockName) lockName.textContent = this.currentArena.name;
      } else {
        banner.classList.add('hidden');
      }
    }
    const cards = document.querySelectorAll('.arena-card');
    cards.forEach(card => {
      if (this.isClientMultiplayer) {
        card.classList.add('locked');
      } else {
        card.classList.remove('locked');
      }
    });
  }

  showWaitingForHostOverlay(desc) {
    const overlay = document.getElementById('waiting-host-overlay');
    const descEl = document.getElementById('waiting-host-desc');
    const arenaVal = document.getElementById('waiting-arena-val');
    const targetVal = document.getElementById('waiting-target-val');
    if (descEl && desc) descEl.textContent = desc;
    if (arenaVal) arenaVal.textContent = this.hasMatchConfig ? this.currentArena.name : 'INHERITING FROM HOST...';
    if (targetVal) {
      targetVal.textContent = this.hasMatchConfig ? (this.scoreTarget === 0 ? '5 MIN TIME LIMIT' : `${this.scoreTarget} KILLS`) : 'AWAITING HOST...';
    }
    if (overlay) overlay.classList.remove('hidden');
  }

  hideWaitingForHostOverlay() {
    const overlay = document.getElementById('waiting-host-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  updateWaitingOverlayStatus(status) {
    const subStatus = document.getElementById('waiting-host-substatus');
    if (subStatus) subStatus.textContent = status;
  }

  applyHostMatchConfig(data) {
    this.hasMatchConfig = true;
    if (data.arenaId && ARENAS[data.arenaId]) {
      this.currentArena = ARENAS[data.arenaId];
      document.getElementById('badge-arena').textContent = this.currentArena.name;
      this.renderArenasGrid();
    }
    if (data.scoreTarget !== undefined) {
      this.scoreTarget = data.scoreTarget;
      this.multiScoreTarget = data.scoreTarget;
    }
    if (data.timeLimit !== undefined) {
      this.multiTimeLimit = data.timeLimit;
      this.matchTimeRemaining = data.timeLimit;
    }

    this.updateArenaLockUI();
    this.updateTargetHUD();
    this.updateDebugTag();

    const targetDesc = this.scoreTarget === 0 ? 'No Limit (5 Min)' : `First to ${this.scoreTarget} Kills`;
    const waitArenaEl = document.getElementById('waiting-arena-val');
    const waitTargetEl = document.getElementById('waiting-target-val');
    const waitStatusEl = document.getElementById('waiting-host-substatus');
    if (waitArenaEl) waitArenaEl.textContent = this.currentArena.name;
    if (waitTargetEl) waitTargetEl.textContent = targetDesc;
    if (waitStatusEl) waitStatusEl.textContent = `Configured: ${this.currentArena.name} (${targetDesc}). Waiting for Host to deploy match...`;
  }

  updateTargetHUD() {
    const targetScoreEl = document.getElementById('hud-target-score');
    const targetLabelEl = document.querySelector('.hud-target-label');
    const badgeEl = document.getElementById('hud-target-badge');

    if (this.scoreTarget === 0) {
      const mins = Math.floor(this.matchTimeRemaining / 60);
      const secs = Math.floor(this.matchTimeRemaining % 60).toString().padStart(2, '0');
      if (targetLabelEl) targetLabelEl.textContent = 'TIME:';
      if (targetScoreEl) targetScoreEl.textContent = `${mins}:${secs}`;
      if (badgeEl) badgeEl.textContent = '5 Min Limit';
    } else {
      if (targetLabelEl) targetLabelEl.textContent = 'FIRST TO:';
      if (targetScoreEl) targetScoreEl.textContent = `${this.scoreTarget} KILLS`;
      if (badgeEl) badgeEl.textContent = `First to ${this.scoreTarget}`;
    }
  }

  updateDebugTag() {
    const role = this.network.isHost ? 'HOST' : (this.network.isConnected ? 'CLIENT' : 'SOLO');
    const targetStr = this.scoreTarget === 0 ? '5 MIN LIMIT' : `${this.scoreTarget} KILLS`;
    const text = `[ARENA: ${this.currentArena.id} | TARGET: ${targetStr} | ROLE: ${role}]`;
    const el = document.getElementById('debug-arena-tag');
    if (el) el.textContent = text;
    console.log(`[MULTIPLAYER SYNC] ${text} | Loaded Arena: "${this.currentArena.name}"`);
  }

  drawArenaThumbnail(canvasId, arena) {
    const cvs = document.getElementById(canvasId);
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const scaleX = cvs.width / arena.width;
    const scaleY = cvs.height / arena.height;

    ctx.fillStyle = arena.floorColor;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // Draw walls
    ctx.fillStyle = arena.wallColor;
    ctx.strokeStyle = arena.wallGlow;
    ctx.lineWidth = 1;

    for (const w of arena.walls) {
      ctx.fillRect(w.x * scaleX, w.y * scaleY, w.w * scaleX, w.h * scaleY);
      ctx.strokeRect(w.x * scaleX, w.y * scaleY, w.w * scaleX, w.h * scaleY);
    }
  }

  // ==========================================
  // HOME / PROFILE CHARACTER PREVIEW
  // ==========================================
  startPreviewLoop() {
    const render = () => {
      this.previewAnimTime += 0.03;
      this.drawCharacterPreview();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  drawCharacterPreview() {
    const ctx = this.previewCtx;
    const cvs = this.previewCanvas;
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    const cx = cvs.width / 2;
    const cy = cvs.height / 2;
    const breathing = Math.sin(this.previewAnimTime) * 1.5;
    const aimAngle = Math.sin(this.previewAnimTime * 0.7) * 0.12;

    ctx.save();
    ctx.translate(cx, cy);

    // Glowing laser sight in preview
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.lineTo(130, 0);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotate soldier
    ctx.rotate(aimAngle);

    // Gun
    ctx.fillStyle = '#1c2331';
    ctx.strokeStyle = '#435169';
    ctx.lineWidth = 1.5;
    if (this.currentWeapon.id === 'shotgun') {
      ctx.fillRect(14, -6, 32, 12);
      ctx.strokeRect(14, -6, 32, 12);
    } else if (this.currentWeapon.id === 'dmr') {
      ctx.fillRect(14, -4, 44, 8);
      ctx.strokeRect(14, -4, 44, 8);
    } else if (this.currentWeapon.id === 'plasma') {
      ctx.fillStyle = '#4a148c';
      ctx.fillRect(14, -7, 28, 14);
      ctx.fillStyle = '#e040fb';
      ctx.beginPath();
      ctx.arc(38, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(14, -4, 22, 8);
      ctx.strokeRect(14, -4, 22, 8);
    }

    // Hands
    ctx.fillStyle = '#2c3545';
    ctx.beginPath();
    ctx.arc(20, -11, 7, 0, Math.PI * 2);
    ctx.arc(20, 11, 7, 0, Math.PI * 2);
    ctx.fill();

    // Main Body with breathing scale
    const bodyR = 28 + breathing;
    ctx.beginPath();
    ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
    ctx.fillStyle = '#121824';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = this.settings.playerColor;
    ctx.stroke();

    // Tactical helmet
    ctx.beginPath();
    ctx.arc(-3, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#1f2738';
    ctx.fill();

    // Neon Visor
    ctx.beginPath();
    ctx.arc(6, 0, 8, -Math.PI / 3, Math.PI / 3);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = this.settings.playerColor;
    ctx.shadowColor = this.settings.playerColor;
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================
  // MATCH LIFECYCLE
  // ==========================================
  startMatch(mode) {
    this.sound.init();
    this.matchMode = mode;
    this.isPlaying = true;
    this.isPaused = false;
    this.matchTimeRemaining = this.multiTimeLimit || 300;

    if (mode === 'multiplayer') {
      this.scoreTarget = this.multiScoreTarget;
    }

    // Reset local player
    this.player.kills = 0;
    this.player.deaths = 0;
    this.player.hp = this.player.maxHp;
    this.player.isDead = false;
    this.player.weapon = this.currentWeapon;
    this.player.color = this.settings.playerColor;

    const safeSpawn = this.findSafeSpawn();
    this.player.x = safeSpawn.x;
    this.player.y = safeSpawn.y;

    this.combatants = [this.player];
    this.bullets = [];

    // Setup Bots if Solo Mode
    if (mode === 'solo') {
      const botNames = ['OMEGA-1', 'TITAN-X', 'PHANTOM', 'CYBORG-9', 'BLITZ', 'VIPER-AI'];
      const botColors = ['#ff0055', '#ffb700', '#b026ff', '#00ff66', '#ff5722', '#00e5ff'];
      const weaponKeys = Object.keys(WEAPONS);

      for (let i = 0; i < this.botCount; i++) {
        const name = botNames[i % botNames.length];
        const color = botColors[i % botColors.length];
        const bot = new Combatant(`bot_${i}`, name, false, true, color);
        bot.botDifficulty = this.botDifficulty;
        // Assign random or scaled weapon
        const randWeapon = WEAPONS[weaponKeys[i % weaponKeys.length]];
        bot.weapon = randWeapon;

        const bSpawn = this.currentArena.spawns[(i + 1) % this.currentArena.spawns.length];
        bot.x = bSpawn.x;
        bot.y = bSpawn.y;
        this.combatants.push(bot);
      }
    } else if (mode === 'multiplayer' && this.network.isHost) {
      // Host adds connected peers into the match
      let spawnIndex = 1;
      for (const [peerId, _] of this.network.connections) {
        let remotePlayer = this.combatants.find(c => c.id === peerId);
        if (!remotePlayer) {
          remotePlayer = new Combatant(peerId, 'Allied Soldier', false, false, '#ff0055');
          const bSpawn = this.currentArena.spawns[spawnIndex % this.currentArena.spawns.length];
          remotePlayer.x = bSpawn.x;
          remotePlayer.y = bSpawn.y;
          this.combatants.push(remotePlayer);
          spawnIndex++;
        }
      }
    }

    // Switch screen to in-game
    document.getElementById('menu-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    document.getElementById('match-summary-modal').classList.add('hidden');
    document.getElementById('pause-modal').classList.add('hidden');
    this.hideWaitingForHostOverlay();

    this.updateHUD();
    this.updateTargetHUD();
    this.updateDebugTag();
    this.hideRespawnOverlay();

    if (this.network.isConnected) {
      this.network.startSyncLoop();
    }

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  findSafeSpawn() {
    const spawns = this.currentArena.spawns;
    // Choose spawn furthest from active enemies
    let bestSpawn = spawns[0];
    let maxDist = -1;

    for (const sp of spawns) {
      let minDistToEnemy = Infinity;
      for (const c of this.combatants) {
        if (!c.isDead) {
          const d = Math.hypot(c.x - sp.x, c.y - sp.y);
          if (d < minDistToEnemy) minDistToEnemy = d;
        }
      }
      if (minDistToEnemy > maxDist) {
        maxDist = minDistToEnemy;
        bestSpawn = sp;
      }
    }
    return bestSpawn;
  }

  gameLoop(currentTime) {
    if (!this.isPlaying) return;

    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.draw();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    // Local player input handling
    this.player.vx = this.input.moveVector.x * this.player.speed;
    this.player.vy = this.input.moveVector.y * this.player.speed;
    this.player.angle = this.input.aimAngle;

    if (this.input.isShooting) {
      this.player.shoot(this);
    }

    // Update all combatants
    for (const c of this.combatants) {
      c.update(dt, this);
    }

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt, this);
      if (b.despawned) {
        this.bullets.splice(i, 1);
      }
    }

    // Update visual FX
    this.particles.update(dt);
    this.floatingTexts.update(dt);

    // Update Camera tracking on local player
    const targetCamX = this.player.x - this.gameCanvas.width / 2;
    const targetCamY = this.player.y - this.gameCanvas.height / 2;
    this.camera.x += (targetCamX - this.camera.x) * 0.15;
    this.camera.y += (targetCamY - this.camera.y) * 0.15;

    // Decay Screen Shake
    if (this.shakeMagnitude > 0) {
      this.shakeMagnitude = Math.max(0, this.shakeMagnitude - dt * 20);
    }

    // Time-based match limit check (No Limit / 5 Min mode)
    if (this.scoreTarget === 0 && this.isPlaying) {
      this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - dt);
      this.updateTargetHUD();
      if (this.matchTimeRemaining <= 0) {
        // Time expired! Determine winner with most kills
        let winner = this.player;
        let maxKills = this.player.kills;
        for (const c of this.combatants) {
          if (c.kills > maxKills) {
            maxKills = c.kills;
            winner = c;
          }
        }
        if (this.network.isConnected && this.network.isHost) {
          this.network.broadcast({
            type: 'match_ended',
            winnerId: winner.id,
            winnerName: winner.name,
            winnerKills: winner.kills
          });
        }
        this.endMatch(winner);
        return;
      }
    }

    this.updateHUD();
  }

  draw() {
    const ctx = this.gameCtx;
    ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);

    ctx.save();

    // Camera offset + screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeMagnitude > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeMagnitude * 2;
      shakeY = (Math.random() - 0.5) * this.shakeMagnitude * 2;
    }
    ctx.translate(-Math.round(this.camera.x) + shakeX, -Math.round(this.camera.y) + shakeY);

    // Draw Arena Floor & Grid
    this.drawArenaWorld(ctx);

    // Draw Bullets
    for (const b of this.bullets) {
      b.draw(ctx);
    }

    // Draw Combatants (local player drawn last so on top)
    for (const c of this.combatants) {
      if (!c.isLocal) c.draw(ctx);
    }
    this.player.draw(ctx);

    // Draw Particles & FX
    this.particles.draw(ctx);
    this.floatingTexts.draw(ctx);

    ctx.restore();

    // Draw Circular Minimap in corner of HUD
    this.drawMinimap();
  }

  drawMinimap() {
    const cvs = document.getElementById('minimap-canvas');
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2;

    ctx.clearRect(0, 0, w, h);

    // Save and clip to circular bounds
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
    ctx.clip();

    // Dark radar background
    ctx.fillStyle = 'rgba(10, 16, 28, 0.9)';
    ctx.fillRect(0, 0, w, h);

    // Radar concentric rings
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
    ctx.arc(cx, cy, r * 0.70, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair axes
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Radar sweep line
    const sweepAngle = (performance.now() * 0.002) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
    ctx.stroke();

    // Scaling to fit arena into minimap
    const arena = this.currentArena;
    const scale = (w * 0.82) / Math.max(arena.width, arena.height);
    const offX = (w - arena.width * scale) / 2;
    const offY = (h - arena.height * scale) / 2;

    // Draw Walls / Key Obstacles
    ctx.fillStyle = '#1e2d44';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 0.8;
    for (const wall of arena.walls) {
      const wx = offX + wall.x * scale;
      const wy = offY + wall.y * scale;
      const ww = wall.w * scale;
      const wh = wall.h * scale;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeRect(wx, wy, ww, wh);
    }

    // Draw Other Combatants (Enemies/Bots/Teammates)
    for (const c of this.combatants) {
      if (c.isDead || c.isLocal) continue;
      const px = offX + c.x * scale;
      const py = offY + c.y * scale;
      ctx.fillStyle = c.color || '#ff0055';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Local Player
    if (!this.player.isDead) {
      const px = offX + this.player.x * scale;
      const py = offY + this.player.y * scale;

      // Heading direction line
      const dirLen = 7;
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(this.player.angle) * dirLen, py + Math.sin(this.player.angle) * dirLen);
      ctx.stroke();

      // Player blip
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawArenaWorld(ctx) {
    const arena = this.currentArena;

    // Floor
    ctx.fillStyle = arena.floorColor;
    ctx.fillRect(0, 0, arena.width, arena.height);

    // Grid lines
    ctx.strokeStyle = arena.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridSize = 60;
    for (let x = 0; x <= arena.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, arena.height);
    }
    for (let y = 0; y <= arena.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(arena.width, y);
    }
    ctx.stroke();

    // Walls
    for (const w of arena.walls) {
      ctx.fillStyle = arena.wallColor;
      ctx.fillRect(w.x, w.y, w.w, w.h);

      // Neon Top/Side Bevel Glow
      ctx.strokeStyle = arena.wallGlow;
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x, w.y, w.w, w.h);
    }
  }

  triggerScreenShake(magnitude) {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
  }

  updateHUD() {
    // Health bar update
    const hpPct = Math.max(0, this.player.hp / this.player.maxHp);
    const hpBar = document.getElementById('hud-hp-fill');
    const hpNumeric = document.getElementById('hud-hp-numeric');
    if (hpBar) {
      hpBar.style.width = `${hpPct * 100}%`;
      if (hpPct < 0.3) {
        hpBar.classList.add('critical');
      } else {
        hpBar.classList.remove('critical');
      }
    }
    if (hpNumeric) {
      hpNumeric.textContent = `${Math.ceil(this.player.hp)} HP`;
    }

    // K/D Counter
    document.getElementById('hud-local-kd').textContent = `${this.player.kills}K / ${this.player.deaths}D`;

    // Rival / Top Opponent
    const opponents = this.combatants.filter(c => c !== this.player);
    if (opponents.length > 0) {
      const topRival = opponents.reduce((prev, curr) => (curr.kills > prev.kills ? curr : prev), opponents[0]);
      document.getElementById('hud-rival-label').textContent = topRival.name.slice(0, 8);
      document.getElementById('hud-rival-kd').textContent = `${topRival.kills}K / ${topRival.deaths}D`;
    } else {
      document.getElementById('hud-rival-label').textContent = 'RIVAL';
      document.getElementById('hud-rival-kd').textContent = '0K / 0D';
    }
  }

  addKillFeedItem(killerName, victimName, weaponName) {
    const feed = document.getElementById('kill-feed');
    if (!feed) return;
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<strong>${killerName}</strong> ➔ <span>${victimName}</span> [${weaponName}]`;
    feed.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 4000);
  }

  showRespawnOverlay(seconds) {
    const overlay = document.getElementById('respawn-overlay');
    const cd = document.getElementById('respawn-countdown');
    if (overlay && cd) {
      cd.textContent = seconds;
      overlay.classList.remove('hidden');
    }
  }

  updateRespawnCountdown(seconds) {
    const cd = document.getElementById('respawn-countdown');
    if (cd) cd.textContent = Math.max(1, seconds);
  }

  hideRespawnOverlay() {
    const overlay = document.getElementById('respawn-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  checkScoreTarget(combatant) {
    if (this.scoreTarget > 0 && combatant.kills >= this.scoreTarget) {
      if (this.network.isConnected && this.network.isHost) {
        this.network.broadcast({
          type: 'match_ended',
          winnerId: combatant.id,
          winnerName: combatant.name,
          winnerKills: combatant.kills
        });
      }
      this.endMatch(combatant);
    }
  }

  endMatch(winner) {
    this.isPlaying = false;
    this.network.stopSyncLoop();

    // If host, ensure all clients receive the final match-ended packet
    if (this.network.isConnected && this.network.isHost) {
      this.network.broadcast({
        type: 'match_ended',
        winnerId: winner.id,
        winnerName: winner.name,
        winnerKills: winner.kills
      });
    }

    const isVictory = winner === this.player;
    this.recordMatchResult(isVictory, this.player.kills, this.player.deaths);

    const titleEl = document.getElementById('summary-title');
    const subEl = document.getElementById('summary-subtitle');

    if (isVictory) {
      titleEl.textContent = 'VICTORY';
      titleEl.className = 'victory-text';
      subEl.textContent = `Combat objective reached by ${winner.name}!`;
    } else {
      titleEl.textContent = 'DEFEAT';
      titleEl.className = 'defeat-text';
      subEl.textContent = `Match concluded. ${winner.name} achieved victory.`;
    }

    // Populate scoreboard
    const tbody = document.getElementById('scoreboard-body');
    tbody.innerHTML = '';

    const sorted = [...this.combatants].sort((a, b) => b.kills - a.kills);
    sorted.forEach((c, index) => {
      const tr = document.createElement('tr');
      if (c.isLocal) tr.className = 'highlight-local';
      const kd = c.deaths === 0 ? c.kills : (c.kills / c.deaths).toFixed(1);
      tr.innerHTML = `
        <td>#${index + 1}</td>
        <td>${c.name} ${c.isLocal ? '(YOU)' : ''}</td>
        <td>${c.kills}</td>
        <td>${c.deaths}</td>
        <td>${kd}</td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('match-summary-modal').classList.remove('hidden');
  }

  pauseGame() {
    this.isPaused = true;
    document.getElementById('pause-modal').classList.remove('hidden');
  }

  resumeGame() {
    this.isPaused = false;
    document.getElementById('pause-modal').classList.add('hidden');
  }

  exitToMenu() {
    this.isPlaying = false;
    this.isPaused = false;
    this.network.stopSyncLoop();
    this.hideWaitingForHostOverlay();
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('menu-screen').classList.add('active');
    document.getElementById('pause-modal').classList.add('hidden');
    document.getElementById('match-summary-modal').classList.add('hidden');
    this.updateArenaLockUI();
    this.updateDebugTag();
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }
}

// ==========================================
// 10. BOOTSTRAP APPLICATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  window.apexGame = new ApexGame();
});
