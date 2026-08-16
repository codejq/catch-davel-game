# First playable implementation status

Date: 2026-08-16

Implementation is active. Missing physical devices do not block development; they defer only platform release certification as recorded in `docs/decisions/IMPLEMENTATION_CONTINUATION.md`.

## Completed in the production workspace

- Strict TypeScript/Vite game workspace with no Three.js or general-purpose 3D engine.
- Raw WebGL2 instanced maze, sphere, and capsule rendering.
- Ten bright, fully bounded Chapter 1 maze grids with distinct deterministic loops/shortcuts and tested routes from start to exit.
- Fixed-step first-person movement, mouse aim, wall collision, gun view model, crosshair, and HUD.
- Eleven distinct Davel definitions, including the original six, the Final Invoice boss, Foreman Stomp, Gearbox Grin, Bolt Jester, and Clockwork Crook.
- Authoritative articulated Davel bodies using fixed-step Verlet integration, XPBD compliant link projection, two substeps, and eight constraint iterations per substep.
- Independent deterministic robot territories, route decisions, pauses, reversals, speeds, phases, scales, proportions, palettes, and dance poses.
- Ten authored Chapter 1 choreography profiles now drive the XPBD bodies at level-specific BPM and intensity: wobble march, side shuffle, robot pop, corner peek, heavy two-step, conveyor conga, freeze dance, clockwork charleston, turbo shuffle, and giant breakdown. A runtime/content alignment test prevents preset drift, and public observations identify the active performance without exposing hidden state.
- Five silhouette-and-color-readable combat identities are active across the six Davels: Wobble Scout pursuit/slap, Blue Slider strafing/fast bolt, Yellow Spinner beat bolt, Red Firemouth telegraphed large fireball, and elite Cyan DJ tempo/cooldown support. Every ability passes through explicit anticipation and recovery state exposed in snapshots and agent observations.
- The isolated Final Invoice boss encounter adds a 420-health oversized/crowned boss with stable ID 6, three health-gated phases, phase reset/telegraph events, and deterministic one/two/three-fireball spreads. Browser and LLM entry points can load it without contaminating Level 1 or human profile progress.
- Four deterministic weapon roles are implemented: pulse hitscan; fast/charged sword with front-arc projectile deflection; bouncing, fused, wall-occluded area bombs with XPBD impulse; and a continuous energy/heat/focus laser. Level 1 preserves its pulse-only campaign unlock; browser and LLM training resets expose all four without writing campaign progress.
- The pre-run Quantum Workbench spends durable coins on three bounded levels each of pulse damage, pulse efficiency, sword cooling, bomb capacity, and laser cooling. Purchases are integrity-sealed, clear incompatible checkpoints, and reinitialize authoritative Worker state; agent/training sessions always start with zero upgrades.
- Authored branch rooms on Levels 2–9 now contain deterministic gold Quantum Coin caches, while secret rooms on Levels 4, 7, and 9 contain larger caches. Collection is one-shot authoritative state with rendering, HUD/audio feedback, state-critical event transport, snapshots/replays, LLM visibility, and durable economy persistence.
- Deterministic Davel fire-spit projectiles with line-of-sight gating, maze collision, player damage, defeat state, audiovisual feedback, and structured agent observations.
- Versioned browser-agent observation/action API using the same authoritative simulation as human play.
- Frozen, capability-limited agent API with reset/observe/act/step/replay/metrics and agent-time pausing between action batches; default production builds keep mutation methods disabled.
- Complete canonical simulation snapshots and checksums covering authoritative player/weapon resources, live bombs, laser focus, robot, XPBD, AI, projectile, economy, ID-counter, and terminal state while excluding presentation events.
- Versioned replay recording/playback with compressed contiguous commands, initial/60-tick/final checksums, and simulation/level/balance/policy dependency hashes.
- Versioned IndexedDB profiles with human-readable JSON, integrity checking, alternating verified records, active-pointer switching, and previous-record recovery.
- Agent sessions are replay-marked and isolated from human campaign persistence.
- A player-facing Chapter 1 campaign map lists all ten named missions, current/locked/cleared states, and durable best-tick records. `M` pauses and resumes the authoritative Worker around the map; victory clears the checkpoint, records the best run, unlocks the next mission, and opens the refreshed map.
- Fixed 9,584-byte self-contained `RenderSnapshot` v8 with campaign-level identity and capacity for 24 Davels/bosses, eight typed resource/coin pickups, 64 typed hostile projectiles, 64 hazards, 16 player bombs, complete combat/tempo/boss/laser/wave state, transport epoch/high-watermark metadata, and a renderer-facing model decoupled from mutable authority.
- Bounded three-buffer snapshot ownership with tested `producerOwned >= 1`, `inFlight <= 2`, coalescing, newest-state delivery, and independent consumer copies.
- The live main-thread renderer consumes only decoded immutable Worker snapshots; no authoritative `GameSimulation` runs in the browser entry point.
- Production simulation Worker adapter uses the same `GameSimulation`, supports seeded reset/manual action batches/checkpoint loading, publishes through the bounded pool, and generation-tags returns across resets.
- The Worker also owns an autonomous 60 Hz clock with bounded catch-up, persistent movement input, one-shot look/fire latches, and independent snapshot/event ports.
- Ordered event transport uses fixed records, stable deduplicated IDs, tick correlation, acknowledgement only after presentation, one credited batch, presentation-first overflow eviction, and epoch/resync handling for critical overflow.
- Human input, the LLM API, replay save/load, observations, and status queries now all use the same live Simulation Worker authority. Releasing agent control resets a clean human session from durable profile coins before realtime ticking resumes.
- Capable browsers run the unchanged raw-WebGL2 `WorldRenderer` in a dedicated OffscreenCanvas Worker. Its host permits one render frame in flight and coalesces pending state to the newest immutable snapshot; capability/initialization failures use the main-thread renderer fallback.
- Every Chapter 1 level now has distinct authoritative health/energy/key placement, a collision-participating lock, checkpoint, and objective-gated exit. Level 6 adds a periodic deterministic conveyor hazard; Level 9 stages ten Davels across two independently snapshotted waves with a 45-tick inter-wave shift. Victory occurs only after all waves are cleared and the player reaches the exit.
- Simulation schema v12, RenderSnapshot transport v8, replay dependency hashes, and agent observation v8 include authoritative Chapter 1 level identity and choreography, typed resource/coin pickups, selected-grid collision, hazard phase, staged-wave/spawn state, interactions, objectives, weapon upgrades, combat state, typed projectiles, elite buffs, and boss phase. Human checkpoint snapshots persist through the alternating-record profile repository and are restored only for their matching level; agent and training sessions cannot write them.
- Appendix A now has a strict TypeScript `LevelDefinition`, canonical authored records and sorted JSON exports for Chapter 1 Levels 1–10, a generated Draft 2020-12 JSON Schema, and a validator shared by tests and replay dependency hashing. It rejects unknown fields, stale references, objective cycles, impossible key ordering, invalid encounter ownership, missing ordinary-level Standard agent coverage, and content budgets above fixed caps.
- Authoritative numeric state is quantized to eight decimal places after each fixed tick. Simulation schema v12 includes campaign level/grid and derived choreography identity, typed pickup/cache state, encounter identity and wave state, hazard state, weapon upgrades/resources, live bombs, laser focus, Davel spawn/combat/buff state, boss phase, and projectile kinds while retaining the cross-runtime precision contract.
- The deterministic zero-upgrade `BaselineCampaignAgent` uses only public observation v8 and level metadata. Both the headless simulation and live Worker API complete Standard Level 1 at tick 4,526 with frozen checksum `bc89b745a14e68a2`, below the declared 6,000-tick limit. Current dependency hashes are simulation `4aff514e03b7bc96`, effective Level 1 `db0371022921707f`, runtime level `89024bcb436256c9`, balance `d06573c4b4825196`, and policy `d3d7c87fc057d2d4`.
- Browser `?level=level-001` through `?level=level-010` selection, Worker resets, LLM observations/maps, snapshots, replay files, collision/line-of-sight, replay dependencies, raw-WebGL2 walls, palettes, interactions, hazards, and wave pacing now preserve and consume the selected Chapter 1 ID. Level 5 contains Foreman Stomp, Level 6 renders and simulates its conveyor, Level 8 starts eight Davels, Level 9 stages two five-Davel waves, and Level 10 selects the stable boss.

## Verification evidence

- Production build: passed.
- Automated tests: 18 files, 70 tests passed, including deterministic Standard completion of all ten Chapter 1 IDs twice each, nine distinct same-Davel motion signatures, durable sequential unlock/best-time progression, typed coin-cache rendering/event checks, Level 6 conveyor phase checks, Level 9 wave/save/restore and multi-defeat checks, and boss-training wave isolation.
- Long robot route check: 3,600 fixed ticks per test run with no wall entry.
- Browser WebGL check: 1280×720 Chrome run with no page or console errors.
- Browser agent check: a 30-tick command advanced exactly from tick 0 to tick 30 and remained paused at tick 30 during a 250 ms model-think interval.
- Browser replay check: two command runs advanced to tick 30, saved and verified, survived reset to another seed, restored the identical checksum, and remained paused at tick 30.
- Browser persistence check: IndexedDB advanced atomically from slot `a` revision 1 to slot `b` revision 2 across reload; a subsequent 240-tick agent session did not change the human revision.
- Production API check: the default built artifact loaded with profile storage ready and did not expose `window.CatchDavelAgent`.
- Campaign browser check: a fresh production profile rendered ten map cards with only Level 1 unlocked; opening the map held the Worker at one unchanged tick for 250 ms, and closing it resumed authoritative ticking.
- Worker determinism/stall check: a 240-tick browser Worker run matched the direct checksum, retained two in-flight/one producer-owned buffer, coalesced 239 snapshots under a deliberate consumer stall, and delivered tick 240 when capacity returned.
- Autonomous-clock check: while the main browser thread was deliberately blocked for 300 ms, the simulation Worker advanced 18 fixed ticks, coalesced 17 snapshots, and delivered its newest tick 259 after recovery.
- Live-runtime check: realtime advanced during its 300 ms windows, the agent reset and stepped exactly to tick 30, replay reload restored checksum `930e3ea621ef3068`, manual mode stayed paused during a 250 ms think interval, the human IndexedDB profile did not change, and releasing control resumed realtime ticking.
- Boss Worker/API check: a boss-training reset delivered exactly stable robot ID 6, name `The Final Invoice`, rank `boss`, phase 1, and 420 health through the public observation contract before the zero-upgrade campaign checksum run.
- Chapter campaign-agent check: every canonical Level 1–10 ID loaded its declared seed and deterministic roster, completed twice with identical final tick/checksum, avoided defeat, and stayed below its declared Standard tick budget.
- Chapter browser/API check: Level 8 crossed browser selection, Worker reset, public observation, level metadata, and replay identity with canonical seed `campaign-level-008-v1` and exactly eight active Davels.
- Full-arsenal Worker/API check: a training reset exposed exactly pulse/sword/bomb/laser; authoritative actions generated sword heat, consumed one of three bombs and retained its live trajectory, then selected an active heat-producing laser beam. The subsequent frozen campaign run remained pulse-only and checksum-identical to the Node policy run.
- Render-topology check: the production artifact initialized the OffscreenCanvas Worker with no page/console errors; a separately forced main-thread fallback obtained WebGL2, rendered live Worker snapshots, and likewise kept the production agent API absent.
- Visual inspection confirmed a bright continuous floor, bounded colorful corridors, readable HUD/gun, rounded connected robot parts, angry-comic faces, and visible size/proportion differences.

These are development/CI results, not physical-device release certification.

## Next implementation work

1. Resolve the remaining preset manifests into materialized effective level data and remove residual hand-authored runtime mappings.
2. Expand Chapter 1 level-specific mechanics beyond the Level 6 conveyor and Level 9 staged encounter, then add pacing/route regression scenarios.
3. Add the frozen multi-level checksum benchmark manifest and Phase 6.5 replay/LLM diagnostics.
4. Add Tauri desktop/mobile packaging and its app-data save adapter before platform release certification.
5. Finish the polished Chapter 1 slice before scaling campaign data toward 100 levels.
