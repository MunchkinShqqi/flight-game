// Sky Courier — Valley Run: tuning, missions and palette.
// One job: every number the game balances on lives here, so tuning never
// touches the flight model or the renderer.

export const GAME = {
  title: 'SKY COURIER',
  subtitle: 'VALLEY RUN',
  canvasWidth: 1280,
  canvasHeight: 720,
  // World: 1 px = 1.5 ft of altitude, 1 px/s ~ 0.55 kt of speed.
  ftPerPx: 1.5,
  ktPerPx: 0.55,
  courseLength: 12400,
  gravity: 55, // px/s^2 pulling down
  maxThrust: 95, // px/s^2 at full throttle
  liftK: 0.0009, // lift per (px/s)^2 at cruise
  dragLinear: 0.22, // per second
  dragQuad: 0.00035,
  stallSpeed: 95, // px/s: below this lift fades hard
  rotateSpeed: 115, // px/s: below this the plane cannot lift off
  maxSpeed: 330, // px/s
  fuelBurn: 0.85, // units/s at full throttle
  fuelPerRing: 4,
  ringScore: 500,
  ringCenterBonus: 250,
  landingScore: 1000,
  crashVy: 120, // px/s vertical speed that turns a terrain touch into a crash
  safeLandingVy: 70,
  safeLandingSpeed: 230,
  damagePerScrape: 25,
  planeRadius: 16,
};

export const MISSIONS = [
  {
    id: 'ring-run',
    name: 'RING RUN',
    tagline: 'Thread all 8 rings, then bring her home.',
    rings: 8,
    fuel: 100,
    timeLimit: 0, // no clock
    wind: 6,
    gust: 4,
    seed: 11,
  },
  {
    id: 'courier-dash',
    name: 'COURIER DASH',
    tagline: 'Six rings, one clock. Land fast, land rich.',
    rings: 6,
    fuel: 100,
    timeLimit: 150,
    wind: 10,
    gust: 6,
    seed: 27,
  },
  {
    id: 'storm-courier',
    name: 'STORM COURIER',
    tagline: 'Headwind, gusts, thin fuel. Earn the storm.',
    rings: 8,
    fuel: 80,
    timeLimit: 0,
    wind: 26,
    gust: 16,
    seed: 43,
  },
];

// Golden-hour palette: one warm style for sky, terrain and instruments.
export const PALETTE = {
  skyTop: '#2b3a6e',
  skyMid: '#e2703a',
  skyLow: '#f7b267',
  sun: '#ffd97a',
  sunGlow: 'rgba(255, 201, 92, 0.35)',
  farMountain: '#5a4a7a',
  hill: '#3e5c46',
  ground: '#4a6b3f',
  groundDark: '#33502f',
  runway: '#2e2e38',
  runwayLine: '#f2ead8',
  ring: '#ffd23e',
  ringInner: '#fff3b0',
  hudPanel: 'rgba(10, 16, 34, 0.72)',
  hudText: '#eaf6ff',
  hudAmber: '#ffb703',
  hudGreen: '#7dff8a',
  hudRed: '#ff5d5d',
  planeBody: '#e8e3d3',
  planeTrim: '#c94f32',
  planeGlass: '#9fd8ef',
};
