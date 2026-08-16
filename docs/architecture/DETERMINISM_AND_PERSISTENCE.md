# Determinism, replay, and persistence contract

Date: 2026-08-16

This document records the implemented production contract. It does not replace the broader requirements in `GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`.

## Authoritative snapshot boundary

`SimulationSnapshotV1` is complete and self-contained. It contains:

- simulation schema/snapshot format versions, authoritative campaign level, tick, and seed;
- complete player pose, resources, coins, and camera/movement state;
- every Davel route, AI, attack, dance, health, reaction, spawn/wave, and stable-ID field;
- all Verlet current/previous particle arrays and XPBD rest constraints;
- every hostile projectile, its stable ID/owner/position/velocity/lifetime, and the next-ID counter;
- every pickup active flag, hazard phase, staged encounter timer/index, collected key, collision-door state, checkpoint activation, primary-objective completion, and exit state;
- pulse cooldown/serial state and victory/defeat flags.

Transient presentation events are deliberately excluded. Changing delivery, buffer capacity, transport epochs, particles, audio scheduling, or another presentation-only concern therefore cannot change the authoritative checksum.

The strict parser rejects unknown/missing fields, non-finite numbers, malformed particle arrays, invalid robot ordering/routes, incompatible snapshot/schema versions, and invalid projectile ownership/IDs.

## Canonical encoding and checksums

Canonical JSON sorts every object key, preserves declared array order, normalizes negative zero, and rejects unsupported/non-finite values. The current deterministic drift checksum is FNV-1a 64 over UTF-8 canonical snapshot bytes. It is a regression/corruption checksum, not a security signature.

Simulation schema v13 quantizes every authoritative player and weapon resource, thrown bomb, Davel scalar/body particle, rest constraint, and typed projectile position/velocity to eight decimal places at initial-state creation and after every mutating fixed tick. Campaign level/grid and its derived choreography profile, resource/coin cache state, encounter wave/index/timer, typed hazard/gate identity and phase, weapon upgrade levels, boss phase, and Davel spawned/telegraph/recovery/strafe/buff state are snapshotted or deterministically selected and replayed. The precision and choreography selection are part of replay dependencies. This removes cross-runtime low-order differences from transcendental/XPBD math before they can accumulate while retaining far more precision than gameplay collision tolerances.

Snapshot tests prove that a checkpoint restored at tick 420 and continued to tick 900 has the same complete state and checksum as an uninterrupted run. Presentation events can differ without affecting it.

## Replay v1

A replay contains:

- replay/simulation versions, level, seed, and `agentRun` marker;
- current simulation-schema, effective-level, balance, and replay-policy hashes;
- a complete initial authoritative snapshot;
- contiguous tick-tagged command runs compressed only when commands are exactly equal;
- checksums at the initial tick, each 60-tick boundary, and final tick.

The level dependency includes the selected canonical validated Appendix A `LevelDefinition` hash as well as the current authored grid, authoritative interaction/hazard state, and staged robot-wave roster. The generated JSON Schema and all ten canonical Chapter 1 exports are checked for staleness before every production build, preventing source types, review artifacts, and replay dependencies from silently diverging.

Playback validates the whole file and dependency hashes before execution, uses `GameSimulation` directly, and checks state at every declared checksum tick. There is no alternate replay simulation. Missing ticks, overlaps, stale dependencies, unknown fields, oversized runs, or checksum drift fail explicitly.

## Profile v1

Browser profiles include schema/migration history, identity, unlocks, per-level progress/replay references/statistics, total/spendable coins, upgrades, cosmetics, achievements, settings, input mappings, optional complete campaign checkpoint, clean-shutdown marker, and an integrity checksum.

IndexedDB stores alternating `a` and `b` envelopes plus an active pointer. Saving writes and reads back the inactive record first; only a fully parsed, checksum-valid record can become active. Loading prefers the active revision and then recovers the other known-good record. A newer unknown profile schema is never silently discarded.

Tauri app-data atomic-file persistence remains a Phase 9 deliverable. The browser implementation does not claim to satisfy packaged-file durability.

## Presentation snapshot and ownership

`RenderSnapshot` has its own transport contract version and is not part of replay dependencies. Version 9 is a fixed 9,840-byte binary projection containing campaign-level identity, complete player/HUD state, up to 24 complete articulated render bodies, up to 64 hostile projectiles, up to eight typed resource/coin pickups, up to 64 typed hazards/gates, up to 16 player bombs, door/checkpoint/exit/objective/wave state, laser state, terminal flags, and event epoch/high-watermark/resync metadata. Each snapshot is self-contained; there are no deltas or keyframe dependencies.

The renderer accepts only the render model decoded from this projection, not mutable authoritative `GameState`. The live Simulation Worker produces this contract, and capable browsers pass its decoded immutable copy through a bounded one-in-flight/latest-pending mailbox to the unchanged `WorldRenderer` in an OffscreenCanvas Worker. Unsupported or failed initialization uses the same renderer on the main thread, so the enhancement introduces neither another gameplay implementation nor an unbounded browser message queue.

The production three-slot pool uses one staging slot, up to two in-flight transfers, and any remaining free slots. It will not publish when doing so would transfer the final producer-owned buffer; newer ticks overwrite staging and increment coalescing until a transfer returns.

The simulation Worker adapter instantiates the exact production `GameSimulation` and accepts bounded manual action batches, resets, and complete checkpoint loads. Snapshot messages and returned buffers carry a generation, so an old transfer returned after reset cannot corrupt the new pool. `npm run game:test:worker` compares its checksum with the direct browser simulation and injects a 240-tick consumer stall to verify bounded ownership and newest-snapshot recovery.

Realtime mode owns its 60 Hz deadline inside the Worker. Main-thread input messages replace persistent movement state and accumulate bounded look deltas plus a one-shot fire latch; each authoritative tick atomically consumes those transient inputs. A four-tick catch-up cap and controlled deadline resynchronization prevent debugger/pause explosions without making physics adaptive.

Ordered events travel on a port independent from snapshots. The current provisional contract uses the reviewed 256-record/64-KiB producer and consumer caps, 64-record/16-KiB batches, and one credited in-flight batch. State-critical events force an epoch transition only when presentation records cannot make room. Consumers correlate by authoritative tick, deduplicate event IDs, sort delayed/reordered batches, and acknowledge only the highest contiguous batch after presentation. These capacities remain transport tuning and are excluded from simulation/replay hashes.

## Agent isolation

Local development exposes the agent API. A production build exposes it only with `VITE_AGENT_API=1`; the default artifact does not define `window.CatchDavelAgent`. The object is frozen and accepts only bounded game actions. It has no filesystem, Tauri command, shell, network, or arbitrary profile capability.

Agent action queues pause authoritative time between requests, and their replays carry `agentRun: true`. Human IndexedDB progress writes are suppressed while agent control is active. Reset, action batches, replay save/load, observations, and metrics are Worker RPCs; releasing control creates a clean human simulation from durable profile state before resuming realtime mode.
