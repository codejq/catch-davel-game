# Phase 6.5 authoring-gate dry run

Date: 2026-08-16

Status: automated pipeline and handoff rehearsal passed; trained-human creative authoring timing remains to be performed.

## Scope

The checked-in `npm run game:authoring:dry-run` command creates an in-memory representative Level 2 edit using only approved existing assets. It changes the seed, BPM, and par time; performs strict validation and canonical round-trip serialization; and requires the authoritative edit to be reported as a stale dependency. It then executes the complete checked-in integration pipeline without mutating source content or canonical exports.

This proves the automated portion of the Phase 6.5 workflow is runnable, bounded, and fail-closed. It does not substitute an AI or CI runtime for the plan's required trained-content-designer session.

## Recorded run

- Host run started at `2026-08-16T10:15:49.554Z`.
- Working-day threshold: 480 minutes.
- Automated elapsed time: 14,698 ms (0.24 minutes).
- Representative candidate: Level 2, seed `authoring-dry-run-level-002-v1`, 99 BPM, 5,060 par ticks.
- Canonical candidate size: 6,026 bytes.
- Coverage: 3 localization keys, 10 provenance-resolved assets, and 5 Davels.
- Stale authoritative dependency: detected as required.

| Stage | Elapsed | Result |
| --- | ---: | --- |
| Representative edit preflight | 4 ms | Pass |
| Schema staleness check | 446 ms | Pass |
| Submission/localization/provenance gate | 564 ms | Pass |
| Canonical export staleness check | 536 ms | Pass |
| Ten-level campaign agent QA | 4,209 ms | Pass |
| Robot-wave/coin balance QA | 1,338 ms | Pass |
| Automated test suite | 5,039 ms | Pass |
| Production build | 2,559 ms | Pass |

The final machine record reported `automatedGatePassed: true` and `humanDesignerTimingStatus: requires-trained-content-designer-session`.

## Remaining human evidence

A trained content designer must use the workbench workflow to create, validate, agent-test, and submit a normal Chapter 1-quality level using existing art/audio, while recording active authoring time, review/fix time, and total elapsed time. The exit gate passes only if that total is below one working day. This session is an acceptance measurement, not an implementation blocker; other game work continues while it is scheduled.
