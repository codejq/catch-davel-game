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
6. Confirm the validation report shows complete English/Arabic localization and resolved provenance for every palette, maze template, audio preset, and choreography component. A new key or asset ID remains invalid until its independent catalog or provenance record is added.
7. Choose **Canonical format** before review. A valid edit that changes authoritative content shows `STALE DEPENDENCY`; that is expected until the reviewed source, replay hashes, exports, and frozen references are regenerated together.
8. **Copy** or **Download JSON** creates review material only. It never writes into the repository. A developer must apply the approved change to the typed source definition and run the generated-export workflow.

## Replay inspection

Paste a replay into the replay editor or choose a local JSON file. **Parse and re-simulate** uses the production replay parser and `GameSimulation`; it does not trust the recorded final result. The report shows identity, tick range, command-run compression, movement/fire/weapon usage, each recorded-versus-current dependency hash, periodic checksums, and the complete compressed command timeline. Stale dependencies and checksum drift preserve the parsed diagnostics but show `NOT VERIFIED` with the exact failure.

**Create deterministic sample** records 180 ticks for the currently selected level and immediately re-simulates them. It is a tool smoke test and format example, not a campaign solvability reference or human balance result.

## Submission gate

Before submitting a normal level change:

```powershell
npm run game:content:schema
npm run game:content:submission
npm run game:content:export
npm run game:qa:campaign
npm run game:qa:balance
npm run game:test
npm run game:build
```

The generated schema and canonical exports must be committed with their typed source. `game:content:submission` emits the machine-readable release-locale and provenance coverage report, while `game:content:export` invokes that gate before writing any output. Do not update dependency hashes or the six-level frozen manifest merely to make a failure disappear: explain the authoritative change, inspect the before/after campaign report, increment the frozen suite version when its reviewed contract changes, and include the replacement ticks/checksums in review.

The workbench validates structure, deterministic reachability, budgets, production projections, release-locale coverage, and asset-provenance completeness. It does not certify human fun, translation quality, final company license/trademark approval, accessibility, device performance, or physical-device release readiness; those remain separate review gates. `THIRD_PARTY_ASSETS.md` documents the current zero-third-party inventory and the evidence future intake must provide.

The Chapter 1 balance table is generated from the same harness as `game:qa:balance`. Authored archetype/rank groups must exactly match stable runtime IDs in every wave, objective counts must match total roster size, and declared peak robots must match the runtime wave peak. Coin caches remain optional in affordability reporting; guaranteed combat income is reported separately so an undiscovered secret cannot masquerade as required progression currency.
