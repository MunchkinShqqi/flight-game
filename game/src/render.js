// Sky Courier — Valley Run: everything the eye sees.
// One job: draw the sky, the valley, the aircraft, the rings and the HUD.
// The flight model never draws; this file never moves the plane.

import { GAME, PALETTE } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.particles = [];
    this.time = 0;
  }

  // Smooth camera: plane sits left-of-centre, looking down the course.
  follow(plane, dt) {
    const targetX = Math.max(0, plane.x - 380);
    const targetY = Math.max(0, Math.min(340, plane.y - 400));
    this.camX += (targetX - this.camX) * Math.min(1, dt * 3.2);
    this.camY += (targetY - this.camY) * Math.min(1, dt * 2.4);
  }

  snapTo(plane) {
    this.camX = Math.max(0, plane.x - 380);
    this.camY = Math.max(0, Math.min(340, plane.y - 400));
  }

  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random() * 0.7) * (speed || 160);
      this.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 4,
      });
    }
  }

  puff(x, y) {
    this.particles.push({
      x, y, vx: -14 - Math.random() * 20, vy: -6 - Math.random() * 10,
      life: 0.7, max: 0.7, color: 'rgba(230, 225, 210, 0.5)', size: 3 + Math.random() * 3,
    });
  }

  stepParticles(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 12 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(world, plane, game) {
    const ctx = this.ctx;
    const W = GAME.canvasWidth;
    const H = GAME.canvasHeight;
    this.time += 1 / 60;
    this.drawSky(ctx, W, H);
    this.drawFarRidge(ctx, W, H);
    this.drawClouds(ctx, world);
    this.drawTerrain(ctx, world, W, H);
    this.drawRunways(ctx, world);
    this.drawTown(ctx, world);
    this.drawRings(ctx, world);
    this.drawParticles(ctx);
    this.drawPlane(ctx, plane, game);
    this.drawHud(ctx, world, plane, game);
    if (game.state === 'title') this.drawTitle(ctx, game, W, H);
    if (game.state === 'paused') this.drawPaused(ctx, W, H);
    if (game.state === 'over') this.drawEnd(ctx, plane, game, W, H);
  }

  drawSky(ctx, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.45, PALETTE.skyMid);
    g.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Low sun, stage right of the course.
    const sx = W - 240 - this.camX * 0.04;
    const sy = 150 - this.camY * 0.02;
    const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 190);
    glow.addColorStop(0, PALETTE.sunGlow);
    glow.addColorStop(1, 'rgba(255, 201, 92, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - 200, sy - 200, 400, 400);
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(sx, sy, 44, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFarRidge(ctx, W, H) {
    // A hazy distant range: a thin silhouette that fades out downward.
    const g = ctx.createLinearGradient(0, 330, 0, H);
    g.addColorStop(0, '#6b5b8f');
    g.addColorStop(1, 'rgba(107, 91, 143, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    const off = this.camX * 0.25;
    for (let x = 0; x <= W; x += 16) {
      const wx = x + off;
      const y = 430 + Math.sin(wx * 0.004) * 22 + Math.sin(wx * 0.0013 + 2) * 30 - this.camY * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  drawClouds(ctx, world) {
    for (const c of world.clouds) {
      const sx = c.x - this.camX * c.depth;
      const sy = c.y - this.camY * 0.3;
      if (sx < -160 || sx > GAME.canvasWidth + 160) continue;
      ctx.fillStyle = 'rgba(255, 244, 230, 0.85)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 52 * c.s, 17 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(sx - 34 * c.s, sy + 6 * c.s, 30 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + 36 * c.s, sy + 7 * c.s, 32 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTerrain(ctx, world, W, H) {
    // Rolling ground from the world height function.
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const wx = x + this.camX;
      ctx.lineTo(x, world.groundY(wx) - this.camY);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 420, 0, H);
    g.addColorStop(0, PALETTE.ground);
    g.addColorStop(1, PALETTE.groundDark);
    ctx.fillStyle = g;
    ctx.fill();
    // Hill shading: a darker band just under the crest.
    ctx.strokeStyle = 'rgba(20, 40, 24, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const wx = x + this.camX;
      const y = world.groundY(wx) - this.camY;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Pines along the valley floor, placed by a hash of world x.
    for (let wx = Math.floor(this.camX / 170) * 170; wx < this.camX + W + 170; wx += 170) {
      const h = Math.abs(Math.sin(wx * 12.9898) * 43758.5453) % 1;
      if (h < 0.45 || world.isRunway(wx)) continue;
      const sx = wx - this.camX;
      const gy = world.groundY(wx) - this.camY;
      const s = 10 + h * 14;
      ctx.fillStyle = '#2c4a2a';
      ctx.beginPath();
      ctx.moveTo(sx, gy - s * 2);
      ctx.lineTo(sx - s * 0.55, gy);
      ctx.lineTo(sx + s * 0.55, gy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a3220';
      ctx.fillRect(sx - 2, gy - 4, 4, 5);
    }
    // River: a blue ribbon where the course crosses it.
    const rx0 = world.riverX - 150 - this.camX;
    const rx1 = world.riverX + 150 - this.camX;
    if (rx1 > 0 && rx0 < W) {
      ctx.fillStyle = '#3f7fb8';
      ctx.beginPath();
      ctx.moveTo(Math.max(0, rx0), H);
      ctx.lineTo(Math.min(W, rx1), H);
      ctx.lineTo(Math.min(W, rx1), world.groundY(world.riverX + 150) - this.camY + 4);
      ctx.lineTo(Math.max(0, rx0), world.groundY(world.riverX - 150) - this.camY + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, rx0), world.groundY(world.riverX) - this.camY + 12);
      ctx.lineTo(Math.min(W, rx1), world.groundY(world.riverX) - this.camY + 12);
      ctx.stroke();
    }
  }

  drawRunways(ctx, world) {
    for (const r of [world.runwayA, world.runwayB]) {
      const x0 = r.x0 - this.camX;
      const x1 = r.x1 - this.camX;
      const y = r.y - this.camY;
      if (x1 < 0 || x0 > GAME.canvasWidth) continue;
      ctx.fillStyle = PALETTE.runway;
      ctx.fillRect(x0, y, x1 - x0, 12);
      // Centreline dashes.
      ctx.fillStyle = PALETTE.runwayLine;
      for (let x = x0 + 14; x < x1 - 20; x += 44) {
        ctx.fillRect(x, y + 5, 24, 3);
      }
      // Threshold bars and edge lights.
      ctx.fillStyle = '#fff';
      ctx.fillRect(x0 + 6, y + 1, 10, 10);
      ctx.fillRect(x1 - 16, y + 1, 10, 10);
      ctx.fillStyle = PALETTE.hudGreen;
      ctx.fillRect(x0 + 2, y - 4, 4, 4);
      ctx.fillRect(x1 - 6, y - 4, 4, 4);
    }
    // Windsock beside the home runway.
    const wx = world.runwayA.x1 + 40 - this.camX;
    const wy = world.runwayA.y - this.camY;
    if (wx > 0 && wx < GAME.canvasWidth) {
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx, wy - 52);
      ctx.stroke();
      ctx.fillStyle = '#ff7b3d';
      ctx.beginPath();
      ctx.moveTo(wx, wy - 52);
      ctx.lineTo(wx + 34, wy - 46);
      ctx.lineTo(wx, wy - 40);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawTown(ctx, world) {
    for (const b of world.town) {
      const x = b.x - this.camX;
      const gy = world.groundY(b.x) - this.camY;
      if (x < -60 || x > GAME.canvasWidth + 60) continue;
      ctx.fillStyle = '#4b3a5e';
      ctx.fillRect(x, gy - b.h, b.w, b.h);
      ctx.fillStyle = '#2e2340';
      ctx.beginPath();
      ctx.moveTo(x, gy - b.h);
      ctx.lineTo(x + b.w / 2, gy - b.h - 12);
      ctx.lineTo(x + b.w, gy - b.h);
      ctx.closePath();
      ctx.fill();
      if (b.lit) {
        ctx.fillStyle = '#ffd97a';
        ctx.fillRect(x + 6, gy - b.h + 8, 7, 9);
        ctx.fillRect(x + b.w - 13, gy - b.h + 8, 7, 9);
      }
    }
  }

  drawRings(ctx, world) {
    world.rings.forEach((ring, i) => {
      const x = ring.x - this.camX;
      const y = ring.y - this.camY;
      if (x < -90 || x > GAME.canvasWidth + 90) return;
      const next = i === world.rings.filter((r) => r.passed).length;
      const pulse = 1 + Math.sin(this.time * 3 + i) * 0.05;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.lineWidth = ring.passed ? 4 : 7;
      ctx.strokeStyle = ring.passed ? 'rgba(125, 255, 138, 0.85)' : next ? PALETTE.ring : 'rgba(255, 210, 62, 0.45)';
      ctx.shadowColor = ring.passed ? '#7dff8a' : PALETTE.ring;
      ctx.shadowBlur = next ? 18 : 6;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = ring.passed ? 'rgba(125,255,138,0.5)' : 'rgba(255,243,176,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, ring.inner, 0, Math.PI * 2);
      ctx.stroke();
      if (next) {
        ctx.fillStyle = PALETTE.ringInner;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RING ${i + 1}`, 0, -ring.r - 10);
      }
      ctx.restore();
    });
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - this.camX, p.y - this.camY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawPlane(ctx, plane, game) {
    const x = plane.x - this.camX;
    const y = plane.y - this.camY;
    if (x < -120 || x > GAME.canvasWidth + 120) return;
    ctx.save();
    ctx.translate(x, y);
    // Canvas rotates clockwise for positive angles; pitch is nose-up, so
    // the drawing rotates the other way. The aircraft is drawn 1.35x so it
    // reads as built, not a speck, at chase distance.
    ctx.rotate(-plane.pitch);
    ctx.scale(1.35, 1.35);
    // Exhaust puffs while the throttle is up.
    if (plane.throttle > 0.15 && Math.random() < 0.5) {
      this.puff(plane.x - 26, plane.y + 2);
    }
    // Prop blur.
    ctx.fillStyle = 'rgba(240, 240, 230, 0.28)';
    ctx.beginPath();
    ctx.ellipse(30, 0, 4, 20 + Math.sin(this.time * 40) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fuselage.
    ctx.fillStyle = PALETTE.planeBody;
    ctx.beginPath();
    ctx.moveTo(-30, 2);
    ctx.quadraticCurveTo(-26, -8, -6, -9);
    ctx.lineTo(16, -7);
    ctx.quadraticCurveTo(30, -4, 30, 0);
    ctx.quadraticCurveTo(30, 4, 16, 6);
    ctx.lineTo(-6, 8);
    ctx.quadraticCurveTo(-26, 8, -30, 2);
    ctx.closePath();
    ctx.fill();
    // Trim stripe.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.fillRect(-14, -2, 34, 3);
    // Cockpit glass, lit.
    ctx.fillStyle = PALETTE.planeGlass;
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.lineTo(16, -7);
    ctx.lineTo(14, -2);
    ctx.lineTo(2, -3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(8, -7, 3, 3);
    // Wing (side view: the near wing sweeps back-down).
    ctx.fillStyle = '#d8d2bd';
    ctx.beginPath();
    ctx.moveTo(-2, 4);
    ctx.lineTo(-16, 22);
    ctx.lineTo(-8, 22);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();
    // Tail.
    ctx.fillStyle = PALETTE.planeTrim;
    ctx.beginPath();
    ctx.moveTo(-28, -4);
    ctx.lineTo(-38, -20);
    ctx.lineTo(-30, -20);
    ctx.lineTo(-20, -6);
    ctx.closePath();
    ctx.fill();
    // Landing gear.
    if (plane.gearDown) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 7);
      ctx.lineTo(-14, 15);
      ctx.moveTo(12, 7);
      ctx.lineTo(12, 15);
      ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(-14, 16, 3.5, 0, Math.PI * 2);
      ctx.arc(12, 16, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nav lights, blinking.
    const blink = Math.sin(this.time * 6) > 0;
    ctx.fillStyle = blink ? '#ff4040' : '#7a2020';
    ctx.beginPath();
    ctx.arc(-30, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#37ff7a';
    ctx.beginPath();
    ctx.arc(30, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crash smoke stays in world space.
    if (plane.crashed) {
      ctx.fillStyle = 'rgba(40, 40, 40, 0.55)';
      ctx.beginPath();
      ctx.arc(x, y - 26, 26, 0, Math.PI * 2);
      ctx.arc(x + 18, y - 34, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- HUD: instruments lit, always on screen ----
  panel(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.hudPanel;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 246, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawHud(ctx, world, plane, game) {
    const W = GAME.canvasWidth;
    const H = GAME.canvasHeight;
    if (game.state === 'title') return;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Flight instruments, top-left.
    this.panel(ctx, 14, 12, 300, 86);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`ALT ${String(plane.altitudeFt).padStart(5, '0')} FT`, 26, 42);
    ctx.fillText(`SPD ${String(plane.speedKt).padStart(3, '0')} KT`, 26, 74);
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`HDG ${String(plane.headingDeg).padStart(3, '0')}°`, 196, 42);
    // Compass strip under the heading.
    ctx.fillStyle = 'rgba(234,246,255,0.35)';
    ctx.fillRect(196, 52, 104, 2);
    const marks = ['N', '045', 'E', '135', 'S', '225', 'W', '315'];
    ctx.font = '11px monospace';
    ctx.fillStyle = PALETTE.hudText;
    marks.forEach((m, i) => {
      const deg = i * 45;
      let d = ((deg - plane.headingDeg + 540) % 360) - 180;
      const cx = 248 + d * 0.55;
      if (cx > 196 && cx < 300) ctx.fillText(m, cx - 8, 84);
    });

    // Attitude ball, top-centre-left.
    const ax = 350;
    const ay = 55;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#3a6ea8';
    ctx.fillRect(ax - 34, ay - 34, 68, 68);
    ctx.fillStyle = '#7a5230';
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-plane.pitch);
    ctx.fillRect(-40, 0, 80, 40);
    ctx.restore();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax - 34, ay);
    ctx.lineTo(ax + 34, ay);
    ctx.stroke();
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.beginPath();
    ctx.moveTo(ax - 8, ay + 2);
    ctx.lineTo(ax, ay - 5);
    ctx.lineTo(ax + 8, ay + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(234,246,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, Math.PI * 2);
    ctx.stroke();

    // Throttle gauge, right edge (draggable with the mouse).
    const tx = W - 46;
    this.panel(ctx, tx - 8, 100, 40, 244);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(plane.throttle * 100)}%`, tx + 8, 118);
    ctx.fillStyle = 'rgba(234,246,255,0.15)';
    ctx.fillRect(tx, 126, 16, 186);
    const th = 126 + (1 - plane.throttle) * 186;
    const tg = ctx.createLinearGradient(0, 126, 0, 312);
    tg.addColorStop(0, PALETTE.hudRed);
    tg.addColorStop(0.5, PALETTE.hudAmber);
    tg.addColorStop(1, PALETTE.hudGreen);
    ctx.fillStyle = tg;
    ctx.fillRect(tx, th, 16, 312 - th);
    ctx.fillStyle = '#fff';
    ctx.fillRect(tx - 4, th - 3, 24, 6);
    ctx.fillText('THR', tx + 8, 336);
    ctx.textAlign = 'left';

    // Fuel and damage, top-right.
    this.panel(ctx, W - 250, 12, 236, 86);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 15px monospace';
    ctx.fillText('FUEL', W - 238, 36);
    ctx.fillText('DMG', W - 238, 68);
    this.bar(ctx, W - 186, 24, 158, 14, plane.fuel / 100, plane.fuel < 25 ? PALETTE.hudRed : PALETTE.hudGreen);
    this.bar(ctx, W - 186, 56, 158, 14, plane.damage / 100, PALETTE.hudRed);
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.fillText(`GEAR ${plane.gearDown ? 'DOWN' : 'UP'}`, W - 238, 90);
    ctx.fillStyle = plane.flaps ? PALETTE.hudGreen : 'rgba(234,246,255,0.5)';
    ctx.fillText(`FLAPS ${plane.flaps ? 'ON' : 'OFF'}`, W - 138, 90);

    // Score strip, bottom-left.
    this.panel(ctx, 14, GAME.canvasHeight - 52, 430, 38);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`SCORE ${plane.score}`, 26, GAME.canvasHeight - 27);
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.fillText(`RINGS ${plane.ringsHit}/${world.rings.length}`, 190, GAME.canvasHeight - 27);
    ctx.fillStyle = PALETTE.hudText;
    const t = game.mission.timeLimit > 0 ? `TIME ${Math.max(0, Math.ceil(game.mission.timeLimit - plane.time))}s` : `TIME ${Math.floor(plane.time)}s`;
    ctx.fillText(t, 330, GAME.canvasHeight - 27);

    // Mission + wind, bottom-right.
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.font = '13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${game.mission.name}  ·  WIND ${Math.round(Math.abs(game.wind))} KT HEAD`, W - 16, GAME.canvasHeight - 62);
    ctx.fillStyle = 'rgba(234,246,255,0.55)';
    ctx.fillText('W/S throttle · A/D pitch · G gear · F flaps · P pause · R restart · M mute', W - 16, GAME.canvasHeight - 20);
    ctx.textAlign = 'left';

    // Next-ring pointer when the next ring is off-screen.
    const ring = world.rings[plane.nextRing];
    if (ring && game.state === 'flying') {
      const sx = ring.x - this.camX;
      if (sx > W - 60 || sx < 60) {
        const px = sx > W - 60 ? W - 70 : 70;
        const py = Math.max(130, Math.min(H - 90, ring.y - this.camY));
        ctx.fillStyle = PALETTE.ring;
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(sx > W - 60 ? 'NEXT RING ▶' : '◀ NEXT RING', px, py);
        ctx.textAlign = 'left';
      }
    }
  }

  bar(ctx, x, y, w, h, frac, color) {
    ctx.fillStyle = 'rgba(234,246,255,0.15)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  }

  drawTitle(ctx, game, W, H) {
    ctx.fillStyle = 'rgba(8, 12, 28, 0.45)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(GAME.title, W / 2, 150);
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText(GAME.subtitle, W / 2, 190);
    ctx.fillStyle = 'rgba(234,246,255,0.9)';
    ctx.font = '17px monospace';
    ctx.fillText('Fly the valley. Thread the rings. Bring her home.', W / 2, 226);

    // Mission cards.
    game.missions.forEach((m, i) => {
      const x = W / 2 - 460 + i * 320;
      const y = 268;
      ctx.fillStyle = i === game.selectedMission ? 'rgba(255, 183, 3, 0.92)' : PALETTE.hudPanel;
      ctx.beginPath();
      ctx.roundRect(x, y, 300, 130, 12);
      ctx.fill();
      ctx.fillStyle = i === game.selectedMission ? '#1a1206' : PALETTE.hudText;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(m.name, W / 2 - 310 + i * 320, y + 36);
      ctx.font = '14px monospace';
      const words = m.tagline.split(' ');
      let line = '';
      let ly = y + 64;
      for (const w of words) {
        if ((line + ' ' + w).trim().length > 26) {
          ctx.fillText(line.trim(), W / 2 - 310 + i * 320, ly);
          line = w;
          ly += 20;
        } else line += ' ' + w;
      }
      ctx.fillText(line.trim(), W / 2 - 310 + i * 320, ly);
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`[${i + 1}]  ${m.rings} RINGS · ${m.fuel} FUEL`, W / 2 - 310 + i * 320, y + 112);
    });

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CLICK A MISSION OR PRESS 1 / 2 / 3 — THEN ENTER TO FLY', W / 2, 450);
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.font = '15px monospace';
    ctx.fillText('W/S throttle · A/D pitch · G gear · F flaps · P pause · R restart · M sound', W / 2, 486);
    ctx.fillText('Drag the THR gauge with the mouse. Land on the far runway, gear down, gently.', W / 2, 512);
    ctx.textAlign = 'left';
  }

  drawPaused(ctx, W, H) {
    ctx.fillStyle = 'rgba(8, 12, 28, 0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText('PAUSED', W / 2, H / 2 - 10);
    ctx.font = '17px monospace';
    ctx.fillStyle = 'rgba(234,246,255,0.9)';
    ctx.fillText('P to resume · R to restart · ESC for the title screen', W / 2, H / 2 + 30);
    ctx.textAlign = 'left';
  }

  drawEnd(ctx, plane, game, W, H) {
    ctx.fillStyle = 'rgba(8, 12, 28, 0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    const won = plane.landed && plane.allRingsDone;
    const early = plane.landed && !plane.allRingsDone;
    ctx.fillStyle = won ? PALETTE.hudGreen : plane.landed ? PALETTE.hudAmber : PALETTE.hudRed;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText(won ? 'MISSION COMPLETE' : early ? 'LANDED EARLY' : 'CRASHED', W / 2, 210);
    ctx.fillStyle = '#fff';
    ctx.font = '18px monospace';
    if (plane.crashed) ctx.fillText(plane.crashReason, W / 2, 248);
    else if (early) ctx.fillText(`${plane.ringsHit} of ${game.world.rings.length} rings — the valley keeps the rest.`, W / 2, 248);
    else ctx.fillText('All rings threaded, wheels down on the far runway.', W / 2, 248);
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`SCORE ${plane.score}   ·   RINGS ${plane.ringsHit}/${game.world.rings.length} (${plane.ringsCenter} centred)`, W / 2, 300);
    ctx.fillText(`TIME ${Math.floor(plane.time)}s   ·   FUEL LEFT ${Math.round(plane.fuel)}   ·   DAMAGE ${Math.round(plane.damage)}%`, W / 2, 336);
    ctx.font = '17px monospace';
    ctx.fillStyle = 'rgba(234,246,255,0.9)';
    ctx.fillText('R to fly again · ESC for the title screen · 1/2/3 to switch mission', W / 2, 392);
    ctx.textAlign = 'left';
  }
}
