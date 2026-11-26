[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun · rank](https://make.fun/badge/best-flight-game-20261126-0057/MunchkinShqqi/flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun · reward](https://make.fun/badge/best-flight-game-20261126-0057/MunchkinShqqi/flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Sky Courier — Valley Run

A complete, original flight game that runs offline in a desktop browser from
static files. Fly a bush-plane courier through a golden-hour valley: throttle
up, rotate off the home runway, thread the glowing rings, mind your fuel and
your airframe, and bring her down gently on the far runway.

- **Three missions** — Ring Run (8 rings, no clock), Courier Dash (6 rings,
  150-second clock, landing pays for speed), Storm Courier (headwind, gusts,
  thin fuel).
- **Real flight model** — thrust, lift, drag, stall, flaps, gear, wind and
  gusts; scrapes cost damage, hard hits crash, gentle gear-down touchdowns
  land.
- **Cockpit feel** — lit HUD with altitude, speed and heading, attitude ball,
  compass strip, fuel and damage bars, a draggable throttle gauge, and
  synthesised engine, wind and ring-chime audio (WebAudio, no files).
- **Controls** — W/S throttle, A/D pitch, G gear, F flaps, P pause,
  R restart, M mute; mouse picks missions and drags the throttle.

## Run

```sh
python3 -m http.server 8080 --directory game
# open http://localhost:8080
```

Or serve `game/` with any static server and open `game/index.html`. No build
step, no network requests, no assets beyond the files in `game/`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Entered on [make.fun](https://make.fun/?ref=25w4cxmg&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards
