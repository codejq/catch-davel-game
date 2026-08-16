# Determinism, replay, and persistence contract

Date: 2026-08-16

This document records the implemented production contract. It does not replace the broader requirements in `GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`.

## Authoritative snapshot boundary

`SimulationSnapshotV1` is complete and self-contained. It contains:

- simulation schema/snapshot format versions, tick, and seed;
- complete player pose, resources, coins, and camera/movement state;
- every Davel route, AI, attack, dance, health, reaction, and stable-ID field;
- all Verlet current/previous particle arrays and XPBD rest constraints;
- every hostile projectile, its stable ID/owner/position/velocity/lifetime, and the next-ID counter;
- pulse cooldown/serial state and victory/defeat flags.

Transient presentation events are deliberately excluded. Changing delivery, buffer capacity, transport epochs, particles, audio scheduling, or another presentation-only concern therefore cannot change the authoritative checksum.

The strict parser rejects unknown/missing fields, non-finite numbers, malformed particle arrays, invalid robot ordering/routes, incompatible snapshot/schema versions, and invalid projectile ownership/IDs.

## Canonical encoding and checksums

Canonical JSON sorts every object key, preserves declared array order, normalizes negative zero, and rejects unsupported/non-finite values. The current deterministic drift checksum is FNV-1a 64 over UTF-8 canonical snapshot bytes. It is a regression/corruption checksum, not a security signature.

Snapshot tests prove that a checkpoint restored at tick 420 and continued to tick 900 has the same complete state and checksum as an uninterrupted run. Presentation events can differ without affecting it.

## Replay v1

A replay contains:

- replay/simulation versions, level, seed, and `agentRun` marker;
- current simulation-schema, effective-level, balance, and replay-policy hashes;
- a complete initial authoritative snapshot;
- contiguous tick-tagged command runs compressed only when commands are exactly equal;
- checksums at the initial tick, each 60-tick boundary, and final tick.

Playback validates the whole file and dependency hashes before execution, uses `GameSimulation` directly, and checks state at every declared checksum tick. There is no alternate replay simulation. Missing ticks, overlaps, stale dependencies, unknown fields, oversized runs, or checksum drift fail explicitly.

## Profile v1

Browser profiles include schema/migration history, identity, unlocks, per-level progress/replay references/statistics, total/spendable coins, upgrades, cosmetics, achievements, settings, input mappings, optional complete campaign checkpoint, clean-shutdown marker, and an integrity checksum.

IndexedDB stores alternating `a` and `b` envelopes plus an active pointer. Saving writes and reads back the inactive record first; only a fully parsed, checksum-valid record can become active. Loading prefers the active revision and then recovers the other known-good record. A newer unknown profile schema is never silently discarded.

Tauri app-data atomic-file persistence remains a Phase 9 deliverable. The browser implementation does not claim to satisfy packaged-file durability.

## Agent isolation

Local development exposes the agent API. A production build exposes it only with `VITE_AGENT_API=1`; the default artifact does not define `window.CatchDavelAgent`. The object is frozen and accepts only bounded game actions. It has no filesystem, Tauri command, shell, network, or arbitrary profile capability.

Agent action queues pause authoritative time between requests, and their replays carry `agentRun: true`. Human IndexedDB progress writes are suppressed while agent control is active.
