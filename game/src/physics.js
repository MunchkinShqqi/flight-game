// Sky Courier — Valley Run: the flight model.
// One job: move the aircraft — thrust, lift, drag, gravity, wind, fuel,
// terrain hits, ring passes and landings. No drawing here.

import { GAME } from './config.js';

export class Plane {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = this.world.startX;
    this.y = this.world.startY - GAME.planeRadius - 1;
    this.vx = 0;
    this.vy = 0;
    this.pitch = 0; // radians, positive = nose up
    this.throttle = 0;
    this.fuel = this.world.mission.fuel;
    this.damage = 0;
    this.gearDown = true;
    this.flaps = false;
    this.airborne = false;
    this.hasBeenAirborne = false;
    this.landed = false;
    this.crashed = false;
    this.crashReason = '';
    this.nextRing = 0;
    this.ringsHit = 0;
    this.ringsCenter = 0;
    this.score = 0;
    this.time = 0;
    this.events = []; // {type:'ring'|'scrape'|'crash'|'land'|'fuel', ...}
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  get altitudeFt() {
    const ground = this.world.groundY(this.x);
    return Math.max(0, Math.round((ground - this.y) * GAME.ftPerPx));
  }

  get speedKt() {
    return Math.round(this.speed * GAME.ktPerPx);
  }

  get headingDeg() {
    // Side view, flying east: heading sits near 090, pitch moves it.
    let h = 90 + (this.pitch * 180) / Math.PI;
    if (h < 0) h += 360;
    if (h >= 360) h -= 360;
    return Math.round(h);
  }

  step(dt, input, wind) {
    if (this.crashed || this.landed) return;
    this.time += dt;

    // Throttle: W/Up up, S/Down down, clamped 0..1.
    if (input.held('w', 'arrowup')) this.throttle = Math.min(1, this.throttle + dt * 0.9);
    if (input.held('s', 'arrowdown')) this.throttle = Math.max(0, this.throttle - dt * 0.9);
    // Pitch: D/Right nose up, A/Left nose down.
    const pitchRate = 1.5;
    if (input.held('d', 'arrowright')) this.pitch = Math.min(0.5, this.pitch + pitchRate * dt);
    if (input.held('a', 'arrowleft')) this.pitch = Math.max(-0.45, this.pitch - pitchRate * dt);
    // Gentle auto-level when the pilot lets go.
    if (!input.held('d', 'arrowright') && !input.held('a', 'arrowleft')) {
      this.pitch += (0 - this.pitch) * Math.min(1, dt * 0.55);
    }

    // Fuel: throttle drinks it; empty tanks mean a glide.
    if (this.throttle > 0 && this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - GAME.fuelBurn * this.throttle * dt);
      if (this.fuel === 0) this.events.push({ type: 'fuel' });
    }
    const thrust = this.fuel > 0 ? this.throttle : 0;

    const speed = this.speed;
    const liftFactor = speed < GAME.stallSpeed ? 0.4 : 1;
    const liftK = GAME.liftK * liftFactor * (this.flaps ? 1.35 : 1);
    const lift = liftK * speed * speed;
    const drag = GAME.dragLinear + GAME.dragQuad * speed * (this.flaps ? 1.6 : 1) + (this.gearDown ? 0.06 : 0);

    // Forces along and across the flight path. Canvas y grows downward, so
    // nose-up thrust and lift both push vy negative (up), gravity positive.
    const ax = Math.cos(this.pitch) * thrust * GAME.maxThrust - this.vx * drag + wind;
    const ay = -Math.sin(this.pitch) * thrust * GAME.maxThrust + GAME.gravity - lift - this.vy * drag * 0.4;
    this.vx += ax * dt;
    this.vy += ay * dt;

    // Cap speed so the course stays readable.
    const sp = this.speed;
    if (sp > GAME.maxSpeed) {
      this.vx *= GAME.maxSpeed / sp;
      this.vy *= GAME.maxSpeed / sp;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Stay inside the valley.
    if (this.x < 40) {
      this.x = 40;
      this.vx = Math.max(0, this.vx);
    }
    if (this.x > this.world.length - 40) {
      this.x = this.world.length - 40;
      this.vx = Math.min(0, this.vx);
    }

    const ground = this.world.groundY(this.x);
    const onGround = this.y + GAME.planeRadius >= ground;
    this.airborne = !onGround && this.speed > GAME.rotateSpeed * 0.55;
    if (this.airborne) this.hasBeenAirborne = true;

    // Rings: pass through the next one, in order.
    const ring = this.world.rings[this.nextRing];
    if (ring && !ring.passed) {
      const prevX = this.x - this.vx * dt;
      if (prevX < ring.x && this.x >= ring.x) {
        const dy = Math.abs(this.y - ring.y);
        if (dy < ring.r) {
          const center = dy < ring.inner;
          ring.passed = true;
          ring.center = center;
          this.nextRing += 1;
          this.ringsHit += 1;
          if (center) this.ringsCenter += 1;
          this.score += GAME.ringScore + (center ? GAME.ringCenterBonus : 0);
          this.fuel = Math.min(100, this.fuel + GAME.fuelPerRing);
          this.events.push({ type: 'ring', center, index: this.nextRing });
        }
      }
    }

    // Terrain contact. Only runway B ends a sortie: runway A is home,
    // and a landing only counts after the plane has actually flown.
    if (onGround) {
      const onDest = this.x >= this.world.runwayB.x0 && this.x <= this.world.runwayB.x1;
      const vyAtTouch = this.vy;
      if (onDest && this.hasBeenAirborne && this.gearDown && vyAtTouch < GAME.safeLandingVy && Math.abs(this.vx) < GAME.safeLandingSpeed) {
        this.touchDown();
      } else if (onDest && this.hasBeenAirborne && !this.gearDown && vyAtTouch < GAME.safeLandingVy && this.speed < 200) {
        this.crash('Belly landing — gear was up.');
      } else if (vyAtTouch > GAME.crashVy || this.speed > 260) {
        this.crash('Terrain impact at speed.');
      } else if (vyAtTouch > 25) {
        // A scrape: damage, a bounce, and a lesson.
        this.y = ground - GAME.planeRadius;
        this.vy = -Math.abs(this.vy) * 0.32;
        this.vx *= 0.72;
        this.damage = Math.min(100, this.damage + GAME.damagePerScrape);
        this.score = Math.max(0, this.score - 100);
        this.events.push({ type: 'scrape' });
        if (this.damage >= 100) this.crash('Airframe gave out after the scrapes.');
      } else {
        // Rolling on the ground (takeoff roll or a gentle rollout).
        this.y = ground - GAME.planeRadius;
        if (this.vy > 0) this.vy = 0;
      }
    }

    // Out of the world vertically: the sky has a ceiling.
    if (this.y < 26) {
      this.y = 26;
      this.vy = Math.max(0, this.vy);
    }
  }

  touchDown() {
    this.landed = true;
    this.vy = 0;
    this.y = this.world.groundY(this.x) - GAME.planeRadius;
    const allRings = this.nextRing >= this.world.rings.length;
    this.allRingsDone = allRings;
    this.score += allRings ? GAME.landingScore : 250;
    this.score += Math.round(this.fuel) * 10;
    this.events.push({ type: 'land', allRings });
  }

  crash(reason) {
    this.crashed = true;
    this.crashReason = reason;
    this.events.push({ type: 'crash', reason });
  }
}
