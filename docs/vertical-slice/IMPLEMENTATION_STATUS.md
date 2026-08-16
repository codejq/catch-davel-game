# First playable implementation status

Date: 2026-08-16

Implementation is active. Missing physical devices do not block development; they defer only platform release certification as recorded in `docs/decisions/IMPLEMENTATION_CONTINUATION.md`.

## Completed in the production workspace

- Strict TypeScript/Vite game workspace with no Three.js or general-purpose 3D engine.
- Raw WebGL2 instanced maze, sphere, and capsule rendering.
- Bright, fully bounded static maze with a tested route from start to exit.
- Fixed-step first-person movement, mouse aim, wall collision, gun view model, crosshair, and HUD.
- Six distinct Davel definitions: Clucky-7, Velvet Slide, Tiny Tyrant, Big Bouncer, Loose Screw, and DJ Grin.
- Authoritative articulated Davel bodies using fixed-step Verlet integration, XPBD compliant link projection, two substeps, and eight constraint iterations per substep.
- Independent deterministic robot territories, route decisions, pauses, reversals, speeds, phases, scales, proportions, palettes, and dance poses.
- Pulse hitscan, wall occlusion, energy cost, cooldown, damage, hit flash, knockback, deactivation, coin rewards, remaining-enemy objective, and victory state.
- Deterministic Davel fire-spit projectiles with line-of-sight gating, maze collision, player damage, defeat state, audiovisual feedback, and structured agent observations.
- Versioned browser-agent observation/action API using the same authoritative simulation as human play.
- Frozen, capability-limited agent API with reset/observe/act/step/replay/metrics and agent-time pausing between action batches; default production builds keep mutation methods disabled.
- Complete canonical simulation snapshots and checksums covering authoritative player, robot, XPBD, AI, projectile, economy, ID-counter, and terminal state while excluding presentation events.
- Versioned replay recording/playback with compressed contiguous commands, initial/60-tick/final checksums, and simulation/level/balance/policy dependency hashes.
- Versioned IndexedDB profiles with human-readable JSON, integrity checking, alternating verified records, active-pointer switching, and previous-record recovery.
- Agent sessions are replay-marked and isolated from human campaign persistence.
- Fixed 6,332-byte self-contained `RenderSnapshot` v1 with capacity for 24 Davels and 64 projectiles, transport epoch/high-watermark metadata, and a renderer-facing model decoupled from mutable authority.
- Bounded three-buffer snapshot ownership with tested `producerOwned >= 1`, `inFlight <= 2`, coalescing, newest-state delivery, and independent consumer copies.
- The live main-thread renderer now consumes the decoded immutable snapshot contract; simulation/render Worker hosting remains the next topology step.
- Production simulation Worker adapter uses the same `GameSimulation`, supports seeded reset/manual action batches/checkpoint loading, publishes through the bounded pool, and generation-tags returns across resets.
- The Worker also owns an autonomous 60 Hz clock with bounded catch-up, persistent movement input, one-shot look/fire latches, and independent snapshot/event ports.
- Ordered event transport uses fixed records, stable deduplicated IDs, tick correlation, acknowledgement only after presentation, one credited batch, presentation-first overflow eviction, and epoch/resync handling for critical overflow.

## Verification evidence

- Production build: passed.
- Automated tests: 13 files, 28 tests passed.
- Long robot route check: 3,600 fixed ticks per test run with no wall entry.
- Browser WebGL check: 1280×720 Chrome run with no page or console errors.
- Browser agent check: a 12-tick command advanced exactly from tick 0 to tick 12 and remained paused at tick 12 during a 300 ms model-think interval.
- Browser replay check: two command runs advanced to tick 30, saved and verified, survived reset to another seed, restored the identical checksum, and remained paused at tick 30.
- Browser persistence check: IndexedDB advanced atomically from slot `a` revision 1 to slot `b` revision 2 across reload; a subsequent 240-tick agent session did not change the human revision.
- Production API check: the default built artifact loaded with profile storage ready and did not expose `window.CatchDavelAgent`.
- Worker determinism/stall check: a 240-tick browser Worker run matched the direct checksum, retained two in-flight/one producer-owned buffer, coalesced 239 snapshots under a deliberate consumer stall, and delivered tick 240 when capacity returned.
- Autonomous-clock check: while the main browser thread was deliberately blocked for 300 ms, the simulation Worker advanced 18 fixed ticks, coalesced 17 snapshots, and delivered its newest tick 259 after recovery.
- Visual inspection confirmed a bright continuous floor, bounded colorful corridors, readable HUD/gun, rounded connected robot parts, angry-comic faces, and visible size/proportion differences.

These are development/CI results, not physical-device release certification.

## Next implementation work

1. Add Worker/OffscreenCanvas production transport using the already-proven bounded three-buffer transport contract.
2. Add richer combat AI states, pickups, and a complete exit/win flow.
3. Add campaign level data, validators, automated agent scenarios, and the frozen checksum benchmark manifest.
4. Add Tauri desktop/mobile packaging and its app-data save adapter before platform release certification.
5. Expand the slice into Chapter 1 content before scaling campaign data toward 100 levels.
