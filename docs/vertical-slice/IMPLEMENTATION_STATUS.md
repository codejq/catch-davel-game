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
- Five silhouette-and-color-readable combat identities are active across the six Davels: Wobble Scout pursuit/slap, Blue Slider strafing/fast bolt, Yellow Spinner beat bolt, Red Firemouth telegraphed large fireball, and elite Cyan DJ tempo/cooldown support. Every ability passes through explicit anticipation and recovery state exposed in snapshots and agent observations.
- Four deterministic weapon roles are implemented: pulse hitscan; fast/charged sword with front-arc projectile deflection; bouncing, fused, wall-occluded area bombs with XPBD impulse; and a continuous energy/heat/focus laser. Level 1 preserves its pulse-only campaign unlock; browser and LLM training resets expose all four without writing campaign progress.
- The pre-run Quantum Workbench spends durable coins on three bounded levels each of pulse damage, pulse efficiency, sword cooling, bomb capacity, and laser cooling. Purchases are integrity-sealed, clear incompatible checkpoints, and reinitialize authoritative Worker state; agent/training sessions always start with zero upgrades.
- Deterministic Davel fire-spit projectiles with line-of-sight gating, maze collision, player damage, defeat state, audiovisual feedback, and structured agent observations.
- Versioned browser-agent observation/action API using the same authoritative simulation as human play.
- Frozen, capability-limited agent API with reset/observe/act/step/replay/metrics and agent-time pausing between action batches; default production builds keep mutation methods disabled.
- Complete canonical simulation snapshots and checksums covering authoritative player/weapon resources, live bombs, laser focus, robot, XPBD, AI, projectile, economy, ID-counter, and terminal state while excluding presentation events.
- Versioned replay recording/playback with compressed contiguous commands, initial/60-tick/final checksums, and simulation/level/balance/policy dependency hashes.
- Versioned IndexedDB profiles with human-readable JSON, integrity checking, alternating verified records, active-pointer switching, and previous-record recovery.
- Agent sessions are replay-marked and isolated from human campaign persistence.
- Fixed 7,696-byte self-contained `RenderSnapshot` v4 with capacity for 24 Davels, 64 typed hostile projectiles, 16 player bombs, complete combat/tempo/laser state, transport epoch/high-watermark metadata, and a renderer-facing model decoupled from mutable authority.
- Bounded three-buffer snapshot ownership with tested `producerOwned >= 1`, `inFlight <= 2`, coalescing, newest-state delivery, and independent consumer copies.
- The live main-thread renderer consumes only decoded immutable Worker snapshots; no authoritative `GameSimulation` runs in the browser entry point.
- Production simulation Worker adapter uses the same `GameSimulation`, supports seeded reset/manual action batches/checkpoint loading, publishes through the bounded pool, and generation-tags returns across resets.
- The Worker also owns an autonomous 60 Hz clock with bounded catch-up, persistent movement input, one-shot look/fire latches, and independent snapshot/event ports.
- Ordered event transport uses fixed records, stable deduplicated IDs, tick correlation, acknowledgement only after presentation, one credited batch, presentation-first overflow eviction, and epoch/resync handling for critical overflow.
- Human input, the LLM API, replay save/load, observations, and status queries now all use the same live Simulation Worker authority. Releasing agent control resets a clean human session from durable profile coins before realtime ticking resumes.
- Capable browsers run the unchanged raw-WebGL2 `WorldRenderer` in a dedicated OffscreenCanvas Worker. Its host permits one render frame in flight and coalesces pending state to the newest immutable snapshot; capability/initialization failures use the main-thread renderer fallback.
- Level 1 now has authoritative health/energy/key pickups, a closed workshop door that participates in player collision until its key opens it, a checkpoint with exact Worker-side snapshot capture, and an objective-gated exit. Deactivating every Davel unlocks the exit; victory occurs only when the player reaches it.
- Simulation schema v6, RenderSnapshot transport v4, replay dependency hashes, and agent observation v4 include the complete interaction, objective, weapon-upgrade, combat-state, typed-projectile, and elite-buff state. Human checkpoint snapshots persist through the alternating-record profile repository and are restored before realtime play resumes; agent and training sessions cannot write them.
- Appendix A now has a strict TypeScript `LevelDefinition`, authored Level 1 record, generated Draft 2020-12 JSON Schema, canonical sorted JSON export, and validator shared by tests and replay dependency hashing. It rejects unknown fields, stale references, objective cycles, impossible key ordering, invalid encounter ownership, missing ordinary-level Standard agent coverage, and content budgets above fixed caps.
- Authoritative numeric state is quantized to eight decimal places after each fixed tick. Simulation schema v6 includes weapon upgrades/resources, live bombs, laser focus, Davel combat states/buffs, and projectile kinds while retaining the cross-runtime precision contract.
- The deterministic zero-upgrade `BaselineCampaignAgent` uses only public observation v4 and level metadata. Both the headless simulation and live Worker API complete Standard Level 1 at tick 4,526 with frozen checksum `27d7cb51e8e5386a`, below the declared 6,000-tick limit; generated content embeds current simulation/effective-level/runtime-level/balance/policy hashes.

## Verification evidence

- Production build: passed.
- Automated tests: 17 files, 43 tests passed.
- Long robot route check: 3,600 fixed ticks per test run with no wall entry.
- Browser WebGL check: 1280×720 Chrome run with no page or console errors.
- Browser agent check: a 30-tick command advanced exactly from tick 0 to tick 30 and remained paused at tick 30 during a 250 ms model-think interval.
- Browser replay check: two command runs advanced to tick 30, saved and verified, survived reset to another seed, restored the identical checksum, and remained paused at tick 30.
- Browser persistence check: IndexedDB advanced atomically from slot `a` revision 1 to slot `b` revision 2 across reload; a subsequent 240-tick agent session did not change the human revision.
- Production API check: the default built artifact loaded with profile storage ready and did not expose `window.CatchDavelAgent`.
- Worker determinism/stall check: a 240-tick browser Worker run matched the direct checksum, retained two in-flight/one producer-owned buffer, coalesced 239 snapshots under a deliberate consumer stall, and delivered tick 240 when capacity returned.
- Autonomous-clock check: while the main browser thread was deliberately blocked for 300 ms, the simulation Worker advanced 18 fixed ticks, coalesced 17 snapshots, and delivered its newest tick 259 after recovery.
- Live-runtime check: realtime advanced during its 300 ms windows, the agent reset and stepped exactly to tick 30, replay reload restored checksum `d5d5b7970c4d59f8`, manual mode stayed paused during a 250 ms think interval, the human IndexedDB profile did not change, and releasing control resumed realtime ticking.
- Full-arsenal Worker/API check: a training reset exposed exactly pulse/sword/bomb/laser; authoritative actions generated sword heat, consumed one of three bombs and retained its live trajectory, then selected an active heat-producing laser beam. The subsequent frozen campaign run remained pulse-only and checksum-identical to the Node policy run.
- Render-topology check: the production artifact initialized the OffscreenCanvas Worker with no page/console errors; a separately forced main-thread fallback obtained WebGL2, rendered live Worker snapshots, and likewise kept the production agent API absent.
- Visual inspection confirmed a bright continuous floor, bounded colorful corridors, readable HUD/gun, rounded connected robot parts, angry-comic faces, and visible size/proportion differences.

These are development/CI results, not physical-device release certification.

## Next implementation work

1. Resolve preset manifests into materialized effective level data and make runtime construction consume that export.
2. Add encounter pacing, an authoritative elite encounter, and the first boss around the completed weapon/archetype/economy foundation.
3. Add campaign data, automated agent scenarios, and the frozen checksum benchmark manifest.
4. Add Tauri desktop/mobile packaging and its app-data save adapter before platform release certification.
5. Expand the slice into Chapter 1 content before scaling campaign data toward 100 levels.
