# Catch Davel content workbench

Date: 2026-08-16

The internal workbench is the review surface for authored `LevelDefinition` JSON. It ships in the offline Vite build as `tooling.html`, but it is not linked from the player UI and does not mutate source files or campaign progress.

## Start it

From the repository root:

```powershell
npm run game:dev
```

Open the printed local URL with `/tooling.html`. The production build also contains this page, so `npm run game:build` verifies the same artifact designers review.

## Authoring loop

1. Select one of the ten canonical Chapter 1 levels and load it into the JSON editor.
2. Edit the level definition, then choose **Validate**. Unknown fields, invalid types/IDs, stale references, objective cycles, impossible key order, invalid encounter ownership, and exceeded content budgets fail explicitly.
3. Review the deterministic 15×15 runtime grid and its pickups, lock, checkpoint, coin caches, conveyor, or timed gates. The preview comes from the production grid and runtime profile manifests, not a second mock implementation.
4. Review the encounter graph. Critical rooms and optional rooms have distinct shapes; locked/triggered edges are labeled.
5. Review the dance timeline, attack/vulnerability beats, robot groups, wave delays, and declared performance budgets.
6. Choose **Canonical format** before review. A valid edit that changes authoritative content shows `STALE DEPENDENCY`; that is expected until the reviewed source, replay hashes, exports, and frozen references are regenerated together.
7. **Copy** or **Download JSON** creates review material only. It never writes into the repository. A developer must apply the approved change to the typed source definition and run the generated-export workflow.

## Submission gate

Before submitting a normal level change:

```powershell
npm run game:content:schema
npm run game:content:export
npm run game:qa:campaign
npm run game:test
npm run game:build
```

The generated schema and canonical exports must be committed with their typed source. Do not update dependency hashes or the six-level frozen manifest merely to make a failure disappear: explain the authoritative change, inspect the before/after campaign report, increment the frozen suite version when its reviewed contract changes, and include the replacement ticks/checksums in review.

The workbench validates structure, deterministic reachability, budgets, and production projections. It does not certify human fun, audio licensing, localization quality, accessibility, device performance, or physical-device release readiness; those remain separate review gates.
