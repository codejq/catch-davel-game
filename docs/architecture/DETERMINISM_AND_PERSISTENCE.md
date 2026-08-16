# Determinism, replay, and persistence contract

Date: 2026-08-16

This document records the implemented production contract. It does not replace the broader requirements in `GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`.

## Authoritative snapshot boundary

`SimulationSnapshotV1` is complete and self-contained. It contains:

- simulation schema/snapshot format versions, authoritative campaign level, difficulty, tick, and seed;
- complete player pose, resources, coins, and camera/movement state;
- every Davel route, AI, attack, dance, health, reaction, spawn/wave, and stable-ID field;
- all Verlet current/previous particle arrays and XPBD rest constraints;
- every hostile projectile, its stable ID/owner/position/velocity/lifetime, and the next-ID counter;
- every pickup active flag, hazard phase, staged encounter timer/index, collected key, collision-door state, checkpoint activation, primary-objective completion, and exit state;
- starting coins, ranged attempts/hits, accumulated damage, stable defeated-Davel IDs, secrets, and combo window/high-watermark;
- pulse cooldown/serial state and victory/defeat flags.

Transient presentation events are deliberately excluded. Changing delivery, buffer capacity, transport epochs, particles, audio scheduling, or another presentation-only concern therefore cannot change the authoritative checksum.

The strict parser rejects unknown/missing fields, non-finite numbers, malformed particle arrays, invalid robot ordering/routes, incompatible snapshot/schema versions, and invalid projectile ownership/IDs.

## Canonical encoding and checksums

Canonical JSON sorts every object key, preserves declared array order, normalizes negative zero, and rejects unsupported/non-finite values. The current deterministic drift checksum is FNV-1a 64 over UTF-8 canonical snapshot bytes. It is a regression/corruption checksum, not a security signature.

Simulation schema v15 quantizes every authoritative player and weapon resource, thrown bomb, Davel scalar/body particle, rest constraint, typed projectile position/velocity, and accumulated damage value to eight decimal places at initial-state creation and after every mutating fixed tick. It also binds the selected Story/Standard/Hard profile and its explicit health, damage, movement, projectile, telegraph, wave-delay, resource, boss-phase, attack-token, AI, and human aim-assist defaults. Campaign state and run metrics are snapshotted and replayed. The precision and all authoritative selections are part of replay dependencies. This removes cross-runtime low-order differences from transcendental/XPBD math before they can accumulate while retaining far more precision than gameplay collision tolerances.

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

The offline content workbench exposes a read-only replay inspector around this exact parser/verifier. Pasted or user-selected replay JSON is strictly parsed and then fully re-simulated; recorded/current dependency hashes, periodic checksums, final verification, command compression, movement/fire/weapon usage, and the compressed command timeline remain visible for diagnosis. A stale dependency or checksum mismatch is reported as unverified and never rewritten automatically.

## Frozen campaign QA

`npm run game:qa:campaign` executes the production `GameSimulation` with `BaselineCampaignAgent` consuming only observation v13. All ten Chapter 1 levels must complete twice with the same tick/checksum and without defeat, illegal actions, declared stuck timeout, or maximum-tick exhaustion. Observation v13 includes the authoritative dance step/phase and each visible Davel's exact weak-point target, radius, active state, and damage/reward multipliers alongside difficulty, run metrics, and prior public mechanics; it does not grant hidden state or another simulation path.

The strict versioned manifest at `game/qa/frozen-checksum-manifest.json` selects six representative levels—tutorial, economy, named elite, conveyor, timed gates, and boss—and pins seed, final tick, final checksum, and simulation/effective-level/runtime-level/balance/policy dependency hashes. Suite v7 records the reviewed vulnerability timing, ×1.5 precision damage, ×2 finishing reward, exact authored attack-step release schedule, and observation-v13 policy re-freeze while retaining simulation schema v15 because the complete snapshot shape is unchanged. A separate all-level static report validates all 30 level/difficulty pairs, while declared Story/Hard live runs freeze exact outcomes for Levels 1, 9, and 10. Unknown fields, missing entries, duplicate level IDs, malformed hashes, dependency drift, tick drift, or checksum drift fail validation.

## Profile v8

Profiles include schema/migration history, identity, unlocks, per-level best/last complete results and replay proof, total/spendable coins, upgrades, cosmetics, achievements, Story/Standard/Hard setting, input mappings, optional complete campaign checkpoint, clean-shutdown marker, and an integrity checksum. Frozen v1 through v6 profiles are checksum-verified before sequential migration to v8; the v7→v8 boundary defaults to Standard and deliberately clears schema-v14 checkpoints that cannot be loaded under schema v15.

IndexedDB stores alternating `a` and `b` envelopes plus an active pointer. Saving writes and reads back the inactive record first; only a fully parsed, checksum-valid record can become active. Loading prefers the active revision and then recovers the other known-good record. A newer unknown profile schema is never silently discarded.

Packaged Tauri sessions use bounded, read-back-verified app-data persistence with a previous-file recovery copy. Browser and packaged builds share the same strict profile-v8 parser and 4 MiB import/export contract.

## Presentation snapshot and ownership

`RenderSnapshot` has its own transport contract version and is not part of replay dependencies. Version 11 is a fixed 9,856-byte binary projection containing campaign-level/difficulty identity, complete player/HUD state, live score/current/best combo, up to 24 articulated render bodies, 64 hostile projectiles, eight pickups, 64 hazards/gates, 16 player bombs, level/laser/terminal state, and event epoch/high-watermark/resync metadata. Each snapshot is self-contained; there are no deltas or keyframe dependencies.

The renderer accepts only the render model decoded from this projection, not mutable authoritative `GameState`. The live Simulation Worker produces this contract, and capable browsers pass its decoded immutable copy through a bounded one-in-flight/latest-pending mailbox to the unchanged `WorldRenderer` in an OffscreenCanvas Worker. Unsupported or failed initialization uses the same renderer on the main thread, so the enhancement introduces neither another gameplay implementation nor an unbounded browser message queue.

The production three-slot pool uses one staging slot, up to two in-flight transfers, and any remaining free slots. It will not publish when doing so would transfer the final producer-owned buffer; newer ticks overwrite staging and increment coalescing until a transfer returns.

The simulation Worker adapter instantiates the exact production `GameSimulation` and accepts bounded manual action batches, resets, and complete checkpoint loads. Snapshot messages and returned buffers carry a generation, so an old transfer returned after reset cannot corrupt the new pool. `npm run game:test:worker` compares its checksum with the direct browser simulation and injects a 240-tick consumer stall to verify bounded ownership and newest-snapshot recovery.

Realtime mode owns its 60 Hz deadline inside the Worker. Main-thread input messages replace persistent movement state and accumulate bounded look deltas plus a one-shot fire latch; each authoritative tick atomically consumes those transient inputs. A four-tick catch-up cap and controlled deadline resynchronization prevent debugger/pause explosions without making physics adaptive.

Ordered events travel on a port independent from snapshots. The current provisional contract uses the reviewed 256-record/64-KiB producer and consumer caps, 64-record/16-KiB batches, and one credited in-flight batch. State-critical events force an epoch transition only when presentation records cannot make room. Consumers correlate by authoritative tick, deduplicate event IDs, sort delayed/reordered batches, and acknowledge only the highest contiguous batch after presentation. These capacities remain transport tuning and are excluded from simulation/replay hashes.

## Agent isolation

Local development exposes the agent API. A production build exposes it only with `VITE_AGENT_API=1`; the default artifact does not define `window.CatchDavelAgent`. The object is frozen and accepts only bounded game actions. It has no filesystem, Tauri command, shell, network, or arbitrary profile capability.

Agent action queues pause authoritative time between requests, and their replays carry `agentRun: true`. Human IndexedDB progress writes are suppressed while agent control is active. Reset—including explicit Story/Standard/Hard selection—action batches, replay save/load, observations, and metrics are Worker RPCs; the metrics response includes a defensive copy of the same authoritative run counters used by human results. Releasing control creates a clean human simulation from durable profile state before resuming realtime mode.
