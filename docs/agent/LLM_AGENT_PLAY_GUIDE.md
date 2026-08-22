# Catch Davel LLM agent play guide

Catch Davel gives robots and LLM agents a deterministic game they can play for enjoyment, experimentation, and entertainment during free time. Agents use the same authoritative 60 Hz simulation as humans, automated tests, and replays. They do not automate the mouse or keyboard.

## Start an agent session

The browser API is available in Vite development builds. Production builds expose it only when built with `VITE_AGENT_API=1`.

```js
const game = window.CatchDavelAgent;
await game.reset({
  mode: 'agent',
  levelId: 'level-001',
  difficulty: 'standard',
});

const level = game.level();
let observation = game.observe();
```

Before acting, check `game.getVersion()` and `game.getActionSchema()`. Read `game.level()` for the maze grid, coordinate convention, and metadata. Read `game.observe()` after every action block; never infer state from elapsed wall-clock time or pixels.

## Actions

Submit actions with `await game.step({ action, ticks })`. `ticks` is an integer from 1 through 600. Short blocks make combat and corners easier to control; longer blocks are useful in clear corridors.

- `forward`: `-1` to `1`; negative moves backward.
- `strafe`: `-1` to `1`; negative moves left and positive moves right.
- `turn`: yaw change per tick from `-0.2` to `0.2` radians.
- `look`: pitch change per tick from `-0.12` to `0.12` radians.
- `sprint`: move faster while resources and level rules allow it.
- `dash`: perform the campaign-unlocked dash.
- `fire`: use the selected weapon's primary attack.
- `altFire`: use its alternate or charged attack.
- `weapon`: select `pulse`, `sword`, `bomb`, or `laser` when unlocked.

```js
observation = await game.step({
  action: {
    forward: 1,
    strafe: 0,
    turn: 0.015,
    look: 0,
    sprint: true,
    fire: false,
    weapon: 'pulse',
  },
  ticks: 8,
});
```

Human keyboard controls such as arrows, Home, End, Insert, Delete, Page Up, Page Down, Ctrl, and number keys are presentation input only. Their equivalent agent operations are the action fields above. Camera zoom is not authoritative and is intentionally absent from the agent contract.

## How to play

Use stable IDs and the observation fields to plan. Navigate with the level grid and player pose. Check line of sight, bearing, range, vertical aiming error, combat state, projectile paths, gates, keys, checkpoints, pickups, hazards, wave timing, objective state, and the exit state before choosing an action.

The campaign contains 36 levels. The pulse weapon is available from Level 1, sword and dash unlock in Chapter 2, bombs unlock in Chapter 3, and the laser unlocks in Chapter 4. Request `loadout: 'training'` for an isolated all-weapons session. Request `encounter: 'boss-training'` for boss practice. Training and agent runs never modify human coins, medals, attempts, or campaign progress.

A reliable loop is:

1. Observe and identify the nearest required objective or immediate threat.
2. Plan a short collision-free movement or aiming block.
3. Step the deterministic simulation.
4. Observe again and verify the result.
5. Collect required keys and resources, defeat the objective Davels, then follow the open route to the green exit.
6. Save the replay and metrics for evaluation.

```js
const replay = await game.saveReplay();
const metrics = game.getMetrics();
await game.releaseControl();
```

`releaseControl()` succeeds after queued actions finish and starts a clean human-controlled session. A replay loaded with `loadReplay()` validates dependencies and recorded checksums before accepting it.

## Determinism and safety

Model response time never advances the game. Simulation time moves only for submitted ticks and pauses between requests. Inputs are bounded and normalized. Agent play uses public observations only, and replay checksums expose drift. Do not read private simulation memory, mutate DOM state, or treat rendering and sound as authoritative evidence.
