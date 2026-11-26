// Sky Courier — Valley Run: the game itself.
// One job: own the loop and the states — title, flying, paused, over —
// wire input, physics, world, sound and renderer together, and keep score.

import { GAME, MISSIONS } from './config.js';
import { World } from './world.js';
import { Plane } from './physics.js';
import { Renderer } from './render.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.sound = new SoundEngine();
    this.input = new Input(canvas);
    this.input.onFirstGesture = () => this.sound.unlock();
    this.missions = MISSIONS;
    this.selectedMission = 0;
    this.state = 'title';
    this.wind = 0;
    this.timeScale = 1;
    this.autopilot = null; // ?shot= mode: deterministic demo flights
    this.startMission(0);
    this.state = 'title';
    // Shot mode (for real screenshots of the running game): ?shot=takeoff|rings|landing
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) this.setupShot(shot);
    window.__sky = this; // debug handle for playtests
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  get mission() {
    return this.missions[this.selectedMission];
  }

  startMission(index) {
    this.selectedMission = index;
    this.world = new World(this.missions[index]);
    this.plane = new Plane(this.world);
    this.renderer.snapTo(this.plane);
    this.renderer.particles = [];
    this.wind = this.world.windAt(0);
    this.state = 'flying';
  }

  setupShot(shot) {
    // Deterministic staged flights so screenshots show the real game.
    if (shot === 'takeoff') {
      this.startMission(0);
      this.autopilot = { mode: 'takeoff', t: 0 };
    } else if (shot === 'rings') {
      this.startMission(0);
      const ring = this.world.rings[3];
      // Park the plane just short of ring 4, level with it, so the ring
      // sits ahead in frame.
      this.plane.x = ring.x - 520;
      this.plane.y = ring.y;
      this.plane.vx = 200;
      this.plane.vy = 0;
      this.plane.throttle = 0.72;
      this.plane.hasBeenAirborne = true;
      this.plane.nextRing = 3;
      this.plane.ringsHit = 3;
      this.plane.score = 1500;
      this.renderer.snapTo(this.plane);
      this.autopilot = { mode: 'rings', t: 0 };
    } else if (shot === 'landing') {
      this.startMission(0);
      this.plane.x = this.world.runwayB.x0 - 700;
      this.plane.y = this.world.groundY(this.world.runwayB.x0 - 700) - 170;
      this.plane.vx = 200;
      this.plane.vy = 10;
      this.plane.throttle = 0.6;
      this.plane.hasBeenAirborne = true;
      this.plane.nextRing = this.world.rings.length;
      this.plane.ringsHit = this.world.rings.length;
      this.plane.score = 5200;
      this.renderer.snapTo(this.plane);
      this.autopilot = { mode: 'landing', t: 0 };
    }
  }

  runAutopilot(dt) {
    const p = this.plane;
    const ap = this.autopilot;
    if (!ap) return;
    ap.t += dt;
    if (ap.mode === 'takeoff') {
      p.throttle = Math.min(1, p.throttle + dt * 0.8);
      if (p.speed > 130) p.pitch = Math.min(0.32, p.pitch + dt * 0.5);
      if (ap.t > 9) this.autopilot = null;
    } else if (ap.mode === 'rings') {
      const ring = this.world.rings[p.nextRing];
      if (ring) {
        // Steer toward the ring: it sits above us, nose up (positive pitch).
        const dy = ring.y - p.y;
        p.pitch = Math.max(-0.4, Math.min(0.4, -dy * 0.0016));
        p.throttle = 0.72;
      }
      if (ap.t > 3.2) this.autopilot = null;
    } else if (ap.mode === 'landing') {
      // Terrain-follow at 120 px above the ground until past the threshold,
      // then flare. Pitch is nose-up positive, so a plane below the target
      // (larger y) pitches up.
      const gy = this.world.groundY(p.x);
      if (p.x < this.world.runwayB.x0 - 60) {
        p.pitch = Math.max(-0.15, Math.min(0.15, (p.y - (gy - 120)) * 0.002));
        p.throttle = 0.6;
      } else {
        p.pitch = 0.12;
        p.throttle = 0.35;
      }
      if (ap.t > 6) this.autopilot = null;
    }
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000) * this.timeScale;
    this.last = now;
    this.update(dt);
    this.renderer.draw(this.world, this.plane, this);
    this.input.endFrame();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const input = this.input;
    const plane = this.plane;

    // Global keys, every state.
    if (input.wasPressed('m')) this.sound.setMuted(!this.sound.muted);

    if (this.state === 'title') {
      if (input.wasPressed('1', '2', '3')) {
        const i = Number(input.pressed.has('1') ? '1' : input.pressed.has('2') ? '2' : '3') - 1;
        this.selectedMission = i;
        this.sound.blip(660, 0.08, 'sine', 0.1);
      }
      if (input.mouse.clicked) {
        const mx = input.mouse.x;
        const my = input.mouse.y;
        this.missions.forEach((m, i) => {
          const x = GAME.canvasWidth / 2 - 460 + i * 320;
          if (mx >= x && mx <= x + 300 && my >= 268 && my <= 398) {
            this.selectedMission = i;
            this.sound.blip(660, 0.08, 'sine', 0.1);
          }
        });
      }
      if (input.wasPressed('enter', ' ')) {
        this.sound.unlock();
        this.startMission(this.selectedMission);
      }
      this.world.update(dt);
      return;
    }

    if (this.state === 'paused') {
      if (input.wasPressed('p', 'escape')) this.state = 'flying';
      if (input.wasPressed('r')) this.startMission(this.selectedMission);
      return;
    }

    if (this.state === 'over') {
      if (input.wasPressed('r')) this.startMission(this.selectedMission);
      if (input.wasPressed('escape')) {
        this.state = 'title';
        this.startMission(this.selectedMission);
        this.state = 'title';
      }
      if (input.wasPressed('1', '2', '3')) {
        const i = Number(input.pressed.has('1') ? '1' : input.pressed.has('2') ? '2' : '3') - 1;
        this.startMission(i);
      }
      return;
    }

    // Flying.
    if (input.wasPressed('p')) {
      this.state = 'paused';
      return;
    }
    if (input.wasPressed('escape')) {
      this.state = 'title';
      return;
    }
    if (input.wasPressed('r')) {
      this.startMission(this.selectedMission);
      return;
    }
    if (input.wasPressed('g')) {
      plane.gearDown = !plane.gearDown;
      this.sound.blip(plane.gearDown ? 520 : 380, 0.1, 'square', 0.12);
    }
    if (input.wasPressed('f')) {
      plane.flaps = !plane.flaps;
      this.sound.blip(plane.flaps ? 700 : 440, 0.1, 'square', 0.12);
    }

    // Mouse drag on the throttle gauge (right edge, x 1226..1266, y 100..344).
    const mx = input.mouse.x;
    const my = input.mouse.y;
    if (input.mouse.clicked && mx >= 1218 && mx <= 1274 && my >= 100 && my <= 344) {
      input.throttleDrag = true;
    }
    if (input.throttleDrag && input.mouse.down) {
      plane.throttle = Math.max(0, Math.min(1, 1 - (my - 126) / 186));
    }

    this.runAutopilot(dt);
    this.wind = this.world.windAt(plane.time);
    this.world.update(dt);
    plane.step(dt, input, this.wind);
    this.renderer.follow(plane, dt);
    this.renderer.stepParticles(dt);
    this.sound.update(plane.throttle, plane.speed, plane.airborne);

    // Time limit (Courier Dash).
    if (this.mission.timeLimit > 0 && plane.time > this.mission.timeLimit && !plane.landed) {
      plane.crash('Out of time — the courier window closed.');
    }

    // Events: rings, scrapes, landings, crashes.
    for (const e of plane.events) {
      if (e.type === 'ring') {
        this.sound.ring(e.center);
        const ring = this.world.rings[e.index - 1];
        if (ring) this.renderer.burst(ring.x, ring.y, e.center ? '#7dff8a' : '#ffd23e', 26, 200);
      } else if (e.type === 'scrape') {
        this.sound.scrape();
        this.renderer.burst(plane.x, plane.y + 14, '#ff9a3d', 14, 120);
      } else if (e.type === 'land') {
        this.sound.thud();
        this.sound.fanfare();
        this.state = 'over';
        if (this.mission.timeLimit > 0 && plane.allRingsDone) {
          plane.score += Math.max(0, Math.round((this.mission.timeLimit - plane.time) * 8));
        }
      } else if (e.type === 'crash') {
        this.sound.thud();
        this.renderer.burst(plane.x, plane.y, '#ff5d5d', 40, 260);
        this.renderer.burst(plane.x, plane.y, '#ffb703', 30, 200);
        this.state = 'over';
      } else if (e.type === 'fuel') {
        this.sound.blip(220, 0.4, 'square', 0.15);
      }
    }
    plane.events.length = 0;

    // Out of fuel over the valley floor: a glide that ends where it ends.
    if (plane.fuel <= 0 && plane.speed < 60 && plane.y + GAME.planeRadius >= this.world.groundY(plane.x) - 2) {
      if (!plane.landed && !plane.crashed) plane.crash('Out of fuel, down in the valley.');
    }
  }
}
