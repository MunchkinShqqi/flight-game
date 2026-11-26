// Sky Courier — Valley Run: the valley itself.
// One job: build a deterministic course — terrain, two runways, rings,
// a riverside town and drifting clouds — from a mission seed.

import { GAME } from './config.js';
import { mulberry32, makeNoise1D } from './random.js';

export class World {
  constructor(mission) {
    this.mission = mission;
    this.length = GAME.courseLength;
    this.rand = mulberry32(mission.seed * 7919 + 13);
    this.noise = makeNoise1D(mission.seed * 31 + 7, 256);
    this.hillNoise = makeNoise1D(mission.seed * 17 + 3, 128);

    // Runways: flat pads at the course ends.
    this.runwayA = { x0: 150, x1: 950, y: 640 };
    this.runwayB = { x0: this.length - 950, x1: this.length - 150, y: 640 };
    this.startX = 320;
    this.startY = this.runwayA.y;

    // River crossing mid-course, for a landmark the pilot can read.
    this.riverX = 5200;

    // Rings: spread between the runways, altitudes the plane can reach.
    this.rings = [];
    const n = mission.rings;
    const span0 = 1600;
    const span1 = this.length - 1600;
    for (let i = 0; i < n; i += 1) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = span0 + (span1 - span0) * t + (this.rand() - 0.5) * 260;
      const ground = this.groundY(x);
      const clearance = 150 + this.rand() * 190;
      const y = Math.min(ground - clearance, 300);
      this.rings.push({ x, y, r: 46, inner: 18, passed: false, center: false });
    }

    // Town beside the far runway: lit windows the pilot aims for.
    this.town = [];
    for (let i = 0; i < 9; i += 1) {
      const x = this.runwayB.x0 - 620 + i * 62 + this.rand() * 20;
      this.town.push({
        x,
        w: 34 + this.rand() * 26,
        h: 26 + this.rand() * 42,
        lit: this.rand() > 0.35,
      });
    }

    // Clouds: slow drifters at three depths.
    this.clouds = [];
    for (let i = 0; i < 26; i += 1) {
      this.clouds.push({
        x: this.rand() * this.length,
        y: 40 + this.rand() * 190,
        s: 0.6 + this.rand() * 1.5,
        speed: 3 + this.rand() * 7,
        depth: 0.4 + this.rand() * 0.6,
      });
    }

    // Wind: steady base plus a slow gust wave.
    this.windNoise = makeNoise1D(mission.seed * 53 + 5, 64);
    this.time = 0;
  }

  // Terrain height (canvas y of the ground) at world x.
  groundY(x) {
    if (x >= this.runwayA.x0 && x <= this.runwayA.x1) return this.runwayA.y;
    if (x >= this.runwayB.x0 && x <= this.runwayB.x1) return this.runwayB.y;
    const base = 640;
    const rolling = this.noise(x * 0.0011) * 46;
    const hills = this.hillNoise(x * 0.00032) * 95;
    // Two mountain ridges the pilot must climb over or thread between.
    const m1 = this.ridge(x, 3300, 520, 210);
    const m2 = this.ridge(x, 8600, 640, 260);
    let y = base + rolling + hills - m1 - m2;
    // Riverbed dips where the river crosses.
    const d = Math.abs(x - this.riverX);
    if (d < 160) y += (1 - d / 160) * 26;
    // Flat approach corridor into runway B: no hill may ambush a landing.
    const approach = 900;
    if (x > this.runwayB.x0 - approach && x < this.runwayB.x0) {
      const t = (x - (this.runwayB.x0 - approach)) / approach;
      const s = t * t * (3 - 2 * t); // smoothstep to the runway level
      y += (640 - y) * s;
    }
    return Math.min(y, 668);
  }

  ridge(x, cx, width, height) {
    const d = (x - cx) / width;
    if (d < -1 || d > 1) return 0;
    const s = Math.cos((d * Math.PI) / 2);
    return s * s * height;
  }

  isRunway(x) {
    const inA = x >= this.runwayA.x0 && x <= this.runwayA.x1;
    const inB = x >= this.runwayB.x0 && x <= this.runwayB.x1;
    return inA || inB;
  }

  windAt(t) {
    const gust = this.windNoise(t * 0.11) * this.mission.gust;
    return -(this.mission.wind + gust); // headwind: pushes the plane back
  }

  update(dt) {
    this.time += dt;
    for (const c of this.clouds) {
      c.x += c.speed * dt * c.depth;
      if (c.x > this.length + 200) c.x = -200;
    }
  }
}
