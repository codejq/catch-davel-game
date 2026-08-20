# Trained content-designer acceptance record

Copy this template for the Phase 6.5 one-working-day acceptance session. The participant must be a trained content designer who did not implement the workbench. Automation may validate their result, but may not create or repair the authored level for them.

## Session identity

| Field | Required value |
|---|---|
| Designer name and qualification | `TBD` |
| Observer | `TBD` |
| Date/time zone | `TBD` |
| Git commit and clean starting branch | `TBD` |
| Machine/browser | `TBD` |
| Start/end time | `TBD` |
| Break duration | `TBD` |
| Active authoring + review/fix time | `TBD` |

The acceptance limit is one normal working day (maximum eight active hours). Record interruptions separately; do not hide assistance or exclude debugging time caused by the workflow.

## Assigned exercise

Create one ordinary campaign-quality level using existing art/audio and stable archetypes. It must have a distinct maze route, palette, dance preset, encounter/wave structure, objective, exactly one reachable noncritical secret, English/Arabic strings, provenance-resolved assets, hard budgets, and a Standard live-agent validation run. Do not modify simulation/runtime code to make the level pass.

## Timed checkpoints

| Checkpoint | Start | End | Active minutes | Evidence |
|---|---|---|---|---|
| Read authoring guide and inspect template | `TBD` | `TBD` | `TBD` | `TBD` |
| Author level/localization/provenance | `TBD` | `TBD` | `TBD` | `TBD` |
| Workbench validation and previews | `TBD` | `TBD` | `TBD` | `TBD` |
| Agent/balance/difficulty review | `TBD` | `TBD` | `TBD` | `TBD` |
| Fixes and canonical export | `TBD` | `TBD` | `TBD` | `TBD` |
| Submission/reviewer handoff | `TBD` | `TBD` | `TBD` | `TBD` |

## Required command evidence

Record exit code, duration, and log/artifact path for `game:content:submission`, `game:content:export`, `game:qa:campaign`, `game:qa:balance`, `game:test`, and `game:build`. The canonical export must be clean on a second generation and `git diff --check` must pass.

## Assistance and friction log

List every question, undocumented step, tool failure, workaround, observer intervention, and source-code change. Classify each as blocking, major, minor, or observation. A blocking workflow defect fails the session even if an engineer later repairs the output.

## Acceptance

| Criterion | Outcome | Evidence/issues |
|---|---|---|
| Completed within eight active hours | `PENDING` | `TBD` |
| Designer authored the content without implementation assistance | `PENDING` | `TBD` |
| All strict/canonical/agent/balance/test/build gates pass | `PENDING` | `TBD` |
| Reviewer judges output comparable to an ordinary released level | `PENDING` | `TBD` |
| No blocking workflow defect remains | `PENDING` | `TBD` |

Final outcome: `PENDING`

Designer signature/record and date: `TBD`

Observer signature/record and date: `TBD`
