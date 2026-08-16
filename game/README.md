# Catch Davel production game

This is the production workspace for the raw-WebGL2 game. It is intentionally separate from the disposable Phase -1 spike.

## Run locally

From the repository root:

```powershell
npm run game:dev
```

Open the URL printed by Vite. Click the canvas to capture the mouse, use WASD or the arrow keys to move, aim with the mouse, click to fire the pulse gun, and press Escape to release the pointer.

Validation commands:

```powershell
npm run game:build
npm run game:test
```

## LLM/browser-agent control

The same `GameSimulation` used by the human controller is available through `window.CatchDavelAgent`:

```js
const map = window.CatchDavelAgent.level();
const before = window.CatchDavelAgent.observe();
const after = await window.CatchDavelAgent.act(
  { forward: 1, strafe: 0, turn: -0.02, look: 0, fire: false },
  12,
);
const replay = window.CatchDavelAgent.replayLog();
window.CatchDavelAgent.releaseControl();
```

Calling `act` transfers control to the agent. Simulation time advances only for queued action ticks and pauses between requests, so model latency cannot change authoritative results. `releaseControl` returns to real-time human input once the queue is empty.

The version-1 observation includes the tick/seed, player pose and resources, stable robot IDs, names, dances, relative positions, range, bearing, heading, health, line of sight, remaining count, and victory state. Inputs are bounded and normalized before they enter the fixed-step simulation; the normalized commands are retained in the replay log.

## Current slice

- bright, bounded 15×15 maze with a reachable exit;
- first-person collision, pointer-lock mouse aim, keyboard movement, gun, crosshair, and HUD;
- six procedural sphere/capsule Davels with different scale, proportions, palettes, faces, routes, seeded decisions, and dance styles;
- pulse hitscan with wall occlusion, energy/cooldown, damage, hit flash, knockback, defeat, coins, and victory;
- deterministic simulation/agent contracts covered by automated tests.

Physical-device evidence is not an implementation prerequisite. It remains required before a release claims support for the corresponding platform.
