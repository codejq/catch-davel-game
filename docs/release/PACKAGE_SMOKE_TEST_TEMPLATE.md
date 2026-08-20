# Final package smoke-test record

Copy this file once per selected target/artifact. Test the exact signed/notarized file named in `release-evidence.json`; rebuilding after the test invalidates the record.

## Artifact identity

| Field | Required value |
|---|---|
| Version and Git commit | `TBD` |
| Evidence-manifest SHA-256 | `TBD` |
| Target/architecture/package filename | `TBD` |
| Artifact SHA-256 and byte length | `TBD` |
| Signing identity/status | `TBD` |
| OS/device and fresh/upgrade install | `TBD` |
| Tester/date | `TBD` |

## Checks

Record `PASS`, `FAIL`, or `NOT APPLICABLE` with evidence and issue IDs. Any failure blocks that target.

| Check | Outcome | Evidence/issues |
|---|---|---|
| Signature/notarization verification succeeds | `PENDING` | `TBD` |
| Install, launch, version identity, icon, and uninstall behave correctly | `PENDING` | `TBD` |
| Launch works with networking disabled and causes no unexpected connection | `PENDING` | `TBD` |
| New campaign starts and Level 1 can reach gameplay/results | `PENDING` | `TBD` |
| Keyboard/mouse or touch controls, pause, menus, audio, and fullscreen/orientation work | `PENDING` | `TBD` |
| Suspend/resume and process restart preserve exactly one valid progress state | `PENDING` | `TBD` |
| Profile export/import picker succeeds; corrupt/oversized/wrong-type payloads fail safely | `PENDING` | `TBD` |
| English and Arabic/RTL switch and render without clipping at supported text scales | `PENDING` | `TBD` |
| Required notices exist in the installed/bundled `legal/` content and match evidence hashes | `PENDING` | `TBD` |
| Mutation-capable production agent API remains unavailable | `PENDING` | `TBD` |
| Upgrade install retains compatible profile or follows documented migration behavior | `PENDING` | `TBD` |
| Clean uninstall/removal behavior matches platform policy | `PENDING` | `TBD` |

Final target outcome: `PENDING`

Open blocking issues: `TBD`

Tester signature/record and date: `TBD`

Release-QA approval and date: `TBD`
