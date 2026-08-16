# Catch Davel production game

This is the production workspace for the raw-WebGL2 game. It is intentionally separate from the disposable Phase -1 spike.

## Run locally

From the repository root:

```powershell
npm run game:dev
```

Open the URL printed by Vite. Click the canvas to capture the mouse, use WASD or the arrow keys to move, aim with the mouse, hold the left button to attack, use the right button for the sword's charged attack, and press Escape to release the pointer. Choose Story, Standard, or Hard in the pre-run settings; the choice applies to the next mission and clears only an incompatible checkpoint. Press `U` before starting a run to spend durable Quantum Coins at the upgrade workbench, and press `M` to open the pausing twenty-nine-level campaign map. Level 1 intentionally starts with only the pulse gun; Level 11 begins Chapter 2 and unlocks the sword and dash. Levels 12–20 build to the three-phase Ringmaster Davel finale. Level 21 opens Chapter 3 and unlocks bombs; Levels 22–24 add Green Steam, Firemouth Fiesta, and the authoritative Valve Velocity clock. Level 25 culminates in two visually distinct crimson elites that attack together. Level 26 turns bombs into a route choice with one required center seal and two optional destructible shortcuts. Level 27 raises three permanently closing magenta drain gates behind the player's escape route. Level 28 chains three individually persistent keys through two state-driven locks and one final keyed door. Level 29 remixes staggered flame shutters, opposing poison currents, and a faster fever-haze pulse. Add `?arsenal=training` to the URL for the isolated all-weapons training loadout, or `?encounter=boss-training` for the three-phase Final Invoice boss; training modes never write campaign progress.

On a touch device, use the virtual stick to move, drag across the game view to aim, use **FIRE**, tap **ALT** for the selected weapon's alternate action, and tap the weapon label to cycle unlocked weapons. The accessibility panel can scale, fade, raise, swap, and dead-zone the controls and switch FIRE between hold and toggle behavior. Touch and desktop input both produce the same deterministic command stream.

After the final Davel falls, a localized maze-stabilized route card hands the player to the green exit and then yields to the persistent camera-relative objective compass.

Every Chapter 1 mission also has three title/mechanic-linked wall-top landmarks, giving the workshop sectors distinct silhouettes without adding collision. The exit begins as a red barred lock and becomes an emissive green portal with floor approach strips and a tall route beacon after the objective clears; reduced-motion mode keeps its signal static.

The first-person pulse gun, sword, bomb, and laser share snapshot-derived walk/sprint sway and step bob. The motion composes with attack recoil, follows the camera-motion accessibility scale, and is completely static at zero motion.

In close combat, a three-point amber body chevron marks an attack telegraph and two cyan side brackets mark recovery. These shape-coded raw-WebGL2 signals supplement the Davels' pose, face, color, captions, and sound without changing their authoritative attack timing.

After a nearby non-boss Davel is damaged, a compact depth-tested 3D bar shows its exact remaining-health width; full-health and distant robots stay uncluttered. The bar faces the player but remains below maze-wall height, so it cannot expose a robot through occlusion.

Audio is project-original procedural Web Audio. The same settings panel controls master, music, and effects gain plus independent weapons, robots, environment, interface, and voice buses; setting any bus to zero persists its mute. Positioned cues pan and attenuate from the listener, walls and closed gates apply bounded low-pass obstruction, eligible remote impacts gain a distance-faded report layer, and transported events use small event-ID-derived gain/pitch variation instead of runtime randomness. Procedural music intensity follows snapshot-derived exploration, combat, wave, objective-clear, and terminal pacing. Wide, Balanced, and Night dynamic-range presets retune the protected output compressor without changing gameplay events.

Open `/tooling.html` on the same Vite origin for the internal content workbench. It validates editable level JSON with the production schema, previews the committed runtime maze/interactions, visualizes the encounter graph and dance beats, summarizes waves/budgets, and produces canonical review JSON without writing source files. Its replay inspector accepts pasted/uploaded replay JSON, strictly parses and fully re-simulates it, compares all dependency hashes, and renders checksum and compressed-command timelines.

Validation commands:

```powershell
npm run game:format:check
npm run game:lint
npm run game:build
npm run game:test
npm run game:test:worker
npm run game:test:runtime
npm run game:qa:campaign
npm run game:qa:balance
npm run game:tauri:test
npm run game:tauri:build:binary
```

Content contract commands:

```powershell
npm run game:content:schema
npm run game:content:export
npm run game:content:submission
```

The build rejects stale generated content. Export first runs the same strict submission gate as `game:content:submission`: the authored `LevelDefinition` must pass unknown-field, stable-ID, cross-reference, objective-cycle, key/lock, encounter, agent-policy, bounded-budget, and runtime-preset validation; all 87 visible playable-campaign keys must exist in both English and Arabic; and all 290 referenced presentation asset IDs must have unambiguous provenance. Canonical per-level JSON, the materialized campaign runtime manifest, and the generated Draft 2020-12 schema live under `src/content`; the designer workflow is documented in `docs/content/CONTENT_WORKBENCH.md`.

Tauri v2 packages the same offline Vite output for desktop/mobile. Packaged sessions replace IndexedDB with a fixed-path, read-back-verified app-data profile and previous-file recovery copy, without exposing general filesystem access to the webview. Windows MSI/NSIS and ARM64/x86_64 Android debug build instructions and current evidence are documented in `docs/packaging/TAURI_V2.md`.

Open the campaign map and use **EXPORT SAVE** or **IMPORT SAVE** to move a human-readable, integrity-checked profile between browser and packaged builds. Import is bounded to 4 MiB, strictly rejects corrupt/newer/unknown-field profiles, asks before replacing local progress, writes through the same recovery repository, and verifies the result before reloading.

## LLM/browser-agent control

Vite development sessions expose the frozen agent API for local evaluation. Production builds expose it only when built with `VITE_AGENT_API=1`; the normal production artifact has no mutation-capable API.

The same Worker-owned `GameSimulation` used by the human controller is available through `window.CatchDavelAgent` in an enabled build:

```js
const api = window.CatchDavelAgent;
await api.reset({ levelId: 'level-001', seed: 'example', difficulty: 'standard', mode: 'agent' });
const map = api.level();
const before = api.observe();
const after = await api.step({
  action: { forward: 1, strafe: 0, turn: -0.02, look: 0, sprint: true, fire: false, weapon: 'pulse' },
  ticks: 12,
});
const replay = await api.saveReplay();
await api.reset({ seed: 'another-run' });
await api.loadReplay(replay); // validates dependencies and every recorded checksum
await api.releaseControl(); // starts a clean human session from durable profile state
```

Calling `act` or `step` transfers control to the agent. Simulation time advances only for queued action ticks and pauses between requests, so model latency cannot change authoritative results. `releaseControl` returns to real-time human input once the queue is empty. Agent sessions are marked in replays and never write campaign coins, medals, attempts, or other human profile progress.

The version-17 observation includes the authoritative playable campaign level/difficulty identity and choreography, tick/seed, player pose, current/maximum resources and player-upgrade levels, selected/unlocked weapons, snapshotted weapon upgrades, pulse burst/spread state, dash unlock/readiness/cooldown, bomb/sword/laser resources, live thrown bombs and laser focus state, stable robot IDs, names, dances, archetypes/ranks, boss phase, telegraph/recovery state, tempo buffs, relative positions, range, bearing, vertical aiming error, heading, health, line of sight, typed hostile projectiles, resource/coin pickups, typed hazards/gates with time-to-toggle, encounter-wave timing, door/key/checkpoint/exit and objective state, remaining count, terminal state, and the complete defense target position, health, strike timing, and stable threat IDs. Level 18's route swap uses those existing public key and hazard fields: its state-driven gates report zero timer ticks and their exact active collision state. Level metadata supplies the matching level ID, grid rows, cell size, world origin, and coordinate conventions. API v4 inputs—including boolean `sprint` and `dash` actions—are bounded and normalized before they enter simulation schema v20. Agents can select any authored playable ID and difficulty with `reset({ mode: 'agent', levelId: 'level-020', difficulty: 'hard' })`, request the isolated full arsenal with `loadout: 'training'`, or request the boss-training encounter; agent resets deliberately use zero upgrades. `getVersion`, `getActionSchema`, `getMetrics`, replay save/load, and the legacy compact `replayLog` are also available.

`BaselineCampaignAgent` is the public-observation reference policy. The browser verifier drives it only through `window.CatchDavelAgent`; its frozen Standard run collects the key, opens the door, activates the checkpoint, deactivates all six Davels, and reaches the exit at tick 4,519—below the 6,000-tick hard budget.

`npm run game:qa:campaign` executes the same public-observation policy against all twenty-nine playable levels, enforces each level's declared tick/stuck/illegal-action gates, repeats every run for determinism, and prints a canonical machine-readable report. The checked-in `qa/frozen-checksum-manifest.json` freezes Levels 1, 3, 5, 6, 8, and 10 with exact final ticks, checksums, seeds, and all replay dependency hashes; drift blocks the command rather than silently rewriting its reference.

Difficulty QA statically checks reachability, objective resources, health/reward budgets, telegraph floors, wave delays, attack tokens, and default assists for all 87 playable level/mode pairs. Declared Story and Hard live-agent spot checks on Levels 1, 9, and 10 also freeze exact deterministic checksums and enforce their individual tick/stuck/action budgets.

`npm run game:qa:balance` reconciles every authored wave archetype/rank with the stable runtime robot IDs, objective target count, and peak budget. It reports per-wave health, pressure, guaranteed kill rewards, optional cache rewards, cumulative purchasing power, and upgrade affordability. The current twenty-nine-level first-clear totals are 1,232 guaranteed combat coins plus 524 optional cache coins against a 222-coin complete weapon/player upgrade catalog, affordable from guaranteed income by Level 9.

## Persistence and replay guarantees

- Complete v1 snapshots under simulation schema v20 include authoritative campaign-level/difficulty/grid, choreography, pickups, hazards/gates, waves, player/weapons, bounded player-resource caps/upgrades, sprint semantics and pulse-burst state, bombs, laser focus, robots/bosses, defense targets, XPBD, combat, projectiles, economy, terminal state, and full run metrics; presentation events are deliberately excluded.
- Canonical key-sorted JSON and 64-bit deterministic checksums are used for state drift detection and accidental profile-corruption detection.
- Replays include schema/level/balance/policy dependency hashes, a complete initial snapshot, contiguous compressed command runs, and checksums at the initial tick, every 60 ticks, and the final tick.
- Browser profiles use IndexedDB with alternating records. A newly written record is read back and validated before the active pointer changes, leaving the previous known-good record available for recovery.
- JSON profile imports reject unknown fields, corruption, and newer unsupported schema versions instead of silently resetting progress.

## Current slice

- ten bright, bounded 15×15 Chapter 1 maze configurations with distinct deterministic loops/shortcuts and reachable exits;
- authoritative repair/energy/key pickups, a key-gated collision door, checkpoint capture/recovery, objective-gated exit, and launch-to-results victory flow;
- first-person collision, pointer-lock mouse aim, deterministic walk/strafe/sprint movement, gun, crosshair, and HUD; remappable Shift, gamepad left-stick press, mobile RUN hold/toggle, replay v4, and LLM API v4 all submit the same sprint command;
- eleven procedural sphere/capsule Davel definitions with different scale, proportions, palettes, faces, routes, ranks, seeded decisions, dance styles, and distinct silhouette accessories, plus deterministic mass-weighted personal-space steering that prevents squad members from stacking into a follower line;
- canonical playable data and browser/Worker/LLM selection for `level-001` through `level-029`, including the Chapter 1 elite/boss milestones, the complete Chapter 2 sword/dash/carnival progression, and Chapter 3's bomb tutorial, Green Steam rhythm, Firemouth Fiesta, Valve Velocity timer course, synchronized Crimson Pair, destructible ballroom routes, rising Magenta Drain escape, Three-Key Tango sequence, and Fever Tunnels remix;
- a scalable campaign identity boundary that keeps the reserved `level-001`–`level-100` envelope separate from the ordered, fully validated playable registry; reusable runtime and LLM code cannot import a chapter implementation directly;
- a pausing twenty-nine-level campaign map with sequential locks, durable completion, best-tick records, replayable clears, and automatic reveal after victory;
- authoritative fixed-step Verlet/XPBD articulated bodies with two substeps and eight link/motor iterations per substep;
- four authoritative weapons: pulse hitscan with exact recovered shots, deterministic bounded rapid-fire spread, and a tick-correlated 3D ejected energy cell; fast/charged sword with projectile deflection; arcing, bouncing, wall-occluded pulse bombs with an event-positioned 3D pressure ring and radial sparks; and a continuous heat/focus laser. Campaign Level 1 remains pulse-only while the full set is available in isolated training;
- a pre-run Quantum Coin workbench with three levels each of pulse damage/efficiency, sword cooling, bomb capacity, and laser cooling; costs and effects are deterministic, purchases clear incompatible checkpoints, and all state is replayed;
- deterministic gold branch caches on Levels 2–9 plus larger secret caches on Levels 4, 7, and 9, all visible to humans/agents and banked into the Quantum Coin economy only at deterministic checkpoints or victory;
- deterministic Davel fire-spit projectiles with maze collision, player damage/defeat feedback, agent-visible trajectories, two-segment emissive 3D travel wakes, and bounded spatial near-miss whooshes derived only from presented snapshots;
- explicit Wobble Scout melee, Blue Slider flanking bolts, Yellow Spinner beat bolts, Red Firemouth telegraphed fireballs, and elite Cyan DJ tempo buffs, with anticipation/recovery states visible to humans and agents;
- The Final Invoice boss training encounter: 420 health, oversized crown/silhouette, stable ID, three health-gated phases, readable telegraphs, deterministic one/two/three-fireball spreads, and a localized snapshot-derived phase/health card;
- deterministic simulation/agent contracts covered by automated tests.
- authoritative Story/Standard/Hard profiles with bounded health, damage, movement, projectile, telegraph, wave-delay, resource, boss-phase, attack-token, AI, and human angular-assist values; selection and player upgrades persist in profile v13 and cross snapshots, replays, Worker transport, HUD, and LLM observations;
- one-command playable-campaign QA with all-level completion gates and a strict six-level frozen checksum manifest spanning tutorial, economy, elite, conveyor, timed-gate, and boss content;
- canonical snapshots/checksums, verified replay playback, and IndexedDB profile recovery.
- Worker-owned 60 Hz authority with bounded snapshot/event transport; the main thread handles only input, HUD/audio feedback, persistence, and raw-WebGL2 presentation.
- OffscreenCanvas render Worker with one frame in flight and latest-frame coalescing; unsupported browsers retain the same renderer through the main-thread WebGL2 fallback.

Physical-device evidence is outside the active implementation goal. It may be collected later as optional platform certification evidence.
