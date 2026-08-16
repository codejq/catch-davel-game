# Phase -1 feasibility spike specification

Status: **Prepared; execution is gated by Decisions 16–20**

Source of truth: `GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`, Revision 6

This specification turns the Phase -1 gate into a reproducible experiment. It does not approve the pending decisions and does not authorize production architecture. The spike is disposable evidence: if it passes, its measured budgets inform Phase 0; its code is not silently promoted into the production engine.

## 1. Approval precondition

Before executable spike files are created, `docs/decisions/PHASE_MINUS_ONE_APPROVAL.md` must record an approver, date, approved Decisions 16–20 or explicit replacements, and certification-device ownership.

The experiment assumes the recommended inputs until approval:

- deterministic pulse-gun hitscan;
- 60 Hz authoritative simulation;
- two physics substeps per tick;
- eight XPBD iterations per substep;
- simulation-only Worker topology;
- bounded three-buffer snapshot transport and credited event transport;
- 24 concurrently active full-physics robots;
- the Section 19.1 desktop, Android, and iOS baselines.

Any replacement changes the scenario manifest before implementation begins. Results from a different scenario may not be presented as evidence for the plan's gate.

## 2. Questions the spike must answer

1. Can 24 representative articulated robots remain deterministic at 60 Hz with the fixed two-substep/eight-iteration solver?
2. Does XPBD integration, constraints, and collision stay at or below 2 ms p95 on the desktop baseline?
3. Does the complete authoritative tick stay at or below 4 ms p95 desktop and 7 ms p95 mobile when representative AI, navigation, combat, hazards, objectives, economy, events, and snapshot construction are included?
4. Can the raw WebGL2 renderer present the representative sphere/capsule instance load within the GPU/frame budgets?
5. Do snapshot and event transports remain bounded and non-blocking under normal play and injected consumer stalls?
6. What fixed queue, batch, and one-to-four-batch credit values are supported by measured worst-case event bursts?
7. Do absolute audio timing and same-event audio/visual synchronization meet the declared targets?
8. Does memory remain bounded during sustained play, stalls, context recovery, and repeated scenario reset?

## 3. Disposable workspace layout

After approval, create the spike under `spike/phase-minus-one/` so it cannot be confused with the later production `src/` tree:

```text
spike/phase-minus-one/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    browser/
      bootstrap.ts
      main-consumer.ts
      audio-probe.ts
    bench/
      cli.ts
      metrics.ts
      report.ts
      scenarios.ts
    render/
      renderer.ts
      geometry.ts
      shaders.ts
      timing.ts
    sim/
      simulation.ts
      scenario.ts
      state.ts
      random.ts
      checksum.ts
      ai.ts
      navigation.ts
      combat.ts
      events.ts
      snapshots.ts
      physics/
        particles.ts
        constraints.ts
        collisions.ts
        xpbd.ts
    transport/
      contract.ts
      snapshot-pool.ts
      event-channel.ts
      metrics.ts
    workers/
      simulation.worker.ts
      render.worker.ts
  test/
    determinism.test.ts
    xpbd.test.ts
    snapshot-pool.test.ts
    event-channel.test.ts
    scenario.test.ts
  artifacts/
    README.md
```

The simulation subtree imports no DOM, WebGL, WebAudio, Worker, Tauri, or wall-clock APIs. Browser and Node harnesses import the same simulation functions.

## 4. Representative robot workload

Each of 24 robots uses the minimum full Davel skeleton from Section 8.1:

- 15 particles: head, chest, pelvis, paired shoulders, elbows, hands, hips, knees, and feet;
- 14 rendered/physical bone links connecting the hierarchy;
- distance constraints for every bone;
- explicit pose/motor targets sufficient to exercise shoulders, elbows, hips, knees, torso, and head motion;
- collision spheres at joints and collision capsules on relevant links;
- deterministic impulses, stumble, and recovery;
- one fixed dance/attack phase per robot, offset from the shared beat by seeded data.

The minimum active workload is therefore 360 articulated particles and 336 capsule links before projectiles, hazards, player collision, and presentation effects. Reducing the particle, constraint, or robot count to make a gate pass is a scenario change requiring review, not an optimization.

## 5. Required deterministic scenarios

### 5.1 `perf:sim`

- fixed published seed;
- 600 warm-up ticks followed by 6,000 measured ticks;
- all 24 robots active throughout the measured interval;
- two substeps and eight solver iterations;
- deterministic grid/room navigation work for every robot;
- broadphase and environment contacts;
- attack-token scheduling, hitscan, projectile sweeps, hazards, damage, objectives, coin/economy events, and snapshot construction;
- no renderer;
- repeated at least five times per certification session, with every raw run retained.

### 5.2 `perf:bomb-squad`

This scenario establishes event transport limits rather than reusing arbitrary provisional numbers:

- a pulse bomb detonates at the center of a coordinated 24-robot squad;
- all robots receive deterministic damage/knockback evaluation in the same tick;
- representative hit markers, damage numbers, impact sparks, debris, critical audio cues, and one tempo/objective transition are emitted;
- the report records peak and p99 event records/tick, bytes/tick, burst duration, acknowledgement round-trip, queue occupancy, and each candidate credit window from one through four batches;
- selected fixed caps include documented headroom and produce zero state-critical resynchronizations in the approved nominal stress run.

### 5.3 `perf:render`

- raw WebGL2 only; no Three.js or other engine;
- procedural sphere and capsule geometry;
- instanced rendering for the 360 joints and 336 links, plus representative floor, walls, projectiles, particles, and debug overlay;
- same renderer module on the main thread and in an OffscreenCanvas render Worker where supported;
- context-loss and restoration exercise;
- Low-quality 720p-equivalent certification path plus diagnostic higher tiers.

### 5.4 `perf:transport-stall`

- independent main-thread and render-consumer pauses of 50 ms, 250 ms, 1 s, and 5 s;
- snapshot invariant `producerOwned >= 1 && inFlight <= 2` asserted every tick;
- newest-state coalescing verified after each pause;
- event producer ring, consumer correlation queue, in-flight credits, and browser port backlog proven bounded;
- presentation-only overflow and state-critical `eventEpoch` resync forced deliberately;
- the simulation tick may not wait for either consumer.

### 5.5 `perf:audio-visual`

- synthesized click and unambiguous rendered flash/pose marker share one tick-tagged beat event;
- absolute tick-to-audio error and render presentation timing recorded separately;
- audio onset versus visual marker differs by no more than 15 ms p95;
- measurement method and API limitations are named in the report; instrumented timing is not mislabeled as physical speaker/display capture.

### 5.6 `determinism:replay`

- identical seed and command stream produce identical periodic and final checksums in direct Node execution, simulation Worker execution, main-thread-render fallback, and render-Worker hosting;
- renderer frame slicing and injected consumer stalls do not change simulation checksums;
- no `Math.random()`, wall-clock read, GPU result, device quality value, or message arrival time enters authoritative state.

## 6. Instrumentation contract

Every measured tick emits component timings for:

- integration/external forces;
- broadphase and collision;
- XPBD constraints/motors;
- AI and navigation;
- combat, projectiles, and hazards;
- objectives and economy;
- event creation;
- self-contained snapshot construction;
- whole tick.

Browser runs additionally record:

- CPU frame time and presented FPS;
- GPU timer-query results where supported, clearly falling back to CPU submission timing where unavailable;
- draw calls, instance counts, buffer uploads, and shader/context errors;
- snapshot size, serialization time, post-to-receive latency by consumer, return latency, pool occupancy, and coalescing count;
- event records/bytes, credits, acknowledgement latency, drops, epoch changes, and resync duration;
- audio absolute timing and relative audio/visual timing;
- JavaScript heap where exposed, process/WebView memory where available, and reset-to-reset growth;
- device temperature/thermal state where the platform exposes it, otherwise a labeled sustained-run proxy.

Percentiles are calculated from raw samples using one checked-in implementation. Warm-up samples are excluded but retained separately. Failed or interrupted runs remain in the artifact set with their failure reason.

## 7. Evidence and manifest format

Each run writes a uniquely named artifact directory containing:

```text
run.json
samples.jsonl
summary.json
errors.jsonl
```

`run.json` records:

- Git commit and dirty-state flag;
- scenario ID/version and fixed seed;
- simulation schema and transport contract versions;
- tick/substep/iteration counts and all content limits;
- runtime, browser/WebView, OS, CPU, GPU, RAM, power policy, and screen/internal resolution;
- warm-up/measured ticks and repetition index;
- queue, batch, byte, and credit configuration;
- start/end timestamps for provenance only, never simulation input.

The checked-in report references immutable raw artifact hashes. Large raw artifacts may be stored outside Git, but the manifest, hashes, summaries, scripts, and human-readable report are committed.

## 8. Planned commands

The approved scaffold must expose these stable commands from the repository root:

```text
npm run spike:dev
npm run spike:build
npm run spike:test
npm run spike:perf:sim
npm run spike:perf:browser
npm run spike:report
npm run spike:verify
```

`spike:verify` runs type checking, tests, a short deterministic replay, artifact-schema validation, and a check that no forbidden renderer dependency is present. It does not claim real-device certification when run on development hardware.

## 9. Pass/fail gate

Phase -1 passes only when committed evidence demonstrates:

- desktop whole-tick p95 at or below 4 ms;
- desktop XPBD/collision p95 at or below 2 ms;
- mobile whole-tick p95 at or below 7 ms;
- selected render path meets the Section 19 frame/GPU targets on every named device;
- render-Worker snapshot latency at or below 1.5 ms desktop and 3 ms mobile;
- main-thread snapshot diagnostic target at or below 5 ms desktop and 8 ms mobile during active play;
- audio error at or below 10 ms desktop and 20 ms mobile;
- same-event audio/visual separation at or below 15 ms p95;
- no state-critical resync in nominal stress, bounded behavior under injected stalls, and zero simulation stalls caused by consumers;
- deterministic checksums agree across all execution/hosting variants;
- memory is bounded and no repeat-reset growth remains unexplained.

Development-only VMware results are useful diagnostics but cannot satisfy an absolute hardware gate. If named hardware is unavailable, the report remains incomplete rather than substituting faster or virtual hardware.

If a gate fails, the report must identify whether the fixed campaign budget, representative workload, or implementation needs revision. Solver substeps/iterations may not adapt to frame time, and failed results may not be hidden by silently lowering active robots or presentation load.

## 10. Lessons reused from `quantum-garden-game`

The sibling project demonstrates useful conventions that may be carried forward:

- Vite with a relative `base` for offline/static packaging;
- explicit build, offline-smoke, Tauri, and test scripts;
- a small deterministic fixed-step loop with direct unit coverage;
- an agent-facing `reset`/`observe`/`act`/`step` API operating on game state rather than DOM controls;
- separate headless tests for deterministic behavior.

Its existing Three.js renderer, JavaScript source layout, 30 Hz agent default, browser-demo determinism limitations, and temporary `csp: null` setting are not copied. Catch Davel remains strict TypeScript, raw WebGL2, 60 Hz, simulation-authoritative, and least-privilege by its own plan.
