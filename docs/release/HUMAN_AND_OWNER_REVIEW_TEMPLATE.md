# Human and owner release review record

Copy this file to `docs/release/evidence/<version>/HUMAN_AND_OWNER_REVIEW.md` for a real review. Do not edit this template into an approval. Every approval needs a named reviewer, ISO date, reviewed commit, outcome, and issue references. “Approved with conditions” does not close a gate until every blocking condition is resolved and rechecked.

## Review identity

| Field | Required value |
|---|---|
| Product version | `TBD` |
| Git commit | `TBD — full 40-character commit` |
| Build/evidence manifest | `TBD — path and SHA-256` |
| Review coordinator | `TBD — name and role` |
| Review window | `TBD — YYYY-MM-DD through YYYY-MM-DD` |
| Blocking issue tracker/query | `TBD` |

Outcome vocabulary: `APPROVED`, `REJECTED`, or `PENDING`. A section closes only with `APPROVED` and zero unresolved critical/high issues.

## Quantum Billing ownership and policy approval

The authorized Quantum Billing representative reviews the exact title, logo, Davel robot identity, code license, original-asset license statement, credits, corresponding-source offer, and trademark policy.

| Evidence | Value |
|---|---|
| Reviewer and authority | `TBD` |
| Date | `TBD` |
| Outcome | `PENDING` |
| Approved documents/asset revisions | `TBD` |
| Exceptions or issue IDs | `TBD` |
| Signature or approval-record link | `TBD` |

## Production responsibility acceptance

Each responsibility must have a primary owner and backup who accept maintenance through the announced support window.

| Responsibility | Primary owner | Backup | Acceptance date | Outcome |
|---|---|---|---|---|
| Choreography and music | `TBD` | `TBD` | `TBD` | `PENDING` |
| Content tooling and schema | `TBD` | `TBD` | `TBD` | `PENDING` |
| Replay/checksum compatibility | `TBD` | `TBD` | `TBD` | `PENDING` |
| Release QA and issue triage | `TBD` | `TBD` | `TBD` | `PENDING` |
| Security/private reporting | `TBD` | `TBD` | `TBD` | `PENDING` |

## Decision ratification

The owner records `APPROVED AS IMPLEMENTED` or an explicit replacement. Any replacement that changes shipped behavior reopens its implementation and regression gates. Decisions 16–20 already have a separate approved Phase -1 record; Decision 22 is already recorded as the 36-level scope approval.

| Plan decision | Implemented candidate | Owner/date | Outcome or replacement |
|---|---|---|---|
| 1–3 — title, family-safe mechanical tone, “deactivated/cleansed” terminology | Zama Sniper: Rhythm Rebellion; no gore; robots deactivated and virus cleansed | `TBD` | `PENDING` |
| 4–5 — TypeScript and sprint/dash movement without jump | Implemented | `TBD` | `PENDING` |
| 6–7 — English/Arabic and optional gamepad | Implemented | `TBD` | `PENDING` |
| 8–10 — four sectors, four weapons/upgrades, no microtransactions | Implemented | `TBD` | `PENDING` |
| 11 — official desktop/mobile targets | `TBD` | `TBD` | `PENDING` |
| 12–13 — MIT/assets/trademarks and logo/Davel permission owner | Candidate documents and current original identity | `TBD` | `PENDING` |
| 14 — project-original procedural audio instead of shortlisted samples | Implemented | `TBD` | `PENDING` |
| 15 — one canonical ending; no alternate endings in this release | Implemented | `TBD` | `PENDING` |
| 21 — internal content workbench and one-day gate | Implemented; human timing recorded separately | `TBD` | `PENDING` |
| 23 — isolated agent progress and hidden production mutation API | Implemented | `TBD` | `PENDING` |
| 24 — named production/support ownership | Ownership table above | `TBD` | `PENDING` |

## Human playtest

Record device/OS, input method, display/audio setup, accessibility settings, fresh or migrated profile, elapsed session, and issue IDs for every reviewer. Reviewers must not use an LLM or baseline-agent completion as a substitute for play.

Minimum cohort:

- one first-time player for Level 1 onboarding;
- one keyboard/mouse reviewer and one touch reviewer for control feel;
- at least two reviewers for fun, readability, economy, and pacing across the entire campaign;
- one reviewer who completes Level 36 and evaluates the ending in English or Arabic;
- one reduced-motion/photosensitivity-safe and one captions/high-contrast pass (reviewers may overlap).

### Campaign level coverage

Every level must receive a human completion and explicit fun/readability result. Record `PASS`, `FAIL`, or `RETEST` plus issue IDs.

| Levels | Reviewer | Completion evidence | Fun/readability outcome | Issues |
|---|---|---|---|---|
| 01–06 | `TBD` | `TBD` | `PENDING` | `TBD` |
| 07–12 | `TBD` | `TBD` | `PENDING` | `TBD` |
| 13–18 | `TBD` | `TBD` | `PENDING` | `TBD` |
| 19–24 | `TBD` | `TBD` | `PENDING` | `TBD` |
| 25–30 | `TBD` | `TBD` | `PENDING` | `TBD` |
| 31–36 | `TBD` | `TBD` | `PENDING` | `TBD` |

### Required playtest conclusions

| Gate | Reviewer/date | Outcome | Evidence and issues |
|---|---|---|---|
| Level 1 teaches movement, aim, key/door, combat, checkpoint, and exit without outside instruction | `TBD` | `PENDING` | `TBD` |
| XPBD Davels read as funny, elastic, varied, and threatening rather than broken or identical | `TBD` | `PENDING` | `TBD` |
| Keyboard/mouse control, aim, four weapons, menus, pause, and fullscreen feel acceptable | `TBD` | `PENDING` | `TBD` |
| Touch movement/look/actions and UI placement feel acceptable at supported viewport sizes | `TBD` | `PENDING` | `TBD` |
| Difficulty, economy, upgrades, secrets, wave pacing, bosses, and all-level repetition are acceptable | `TBD` | `PENDING` | `TBD` |
| Level 36 encounter, conclusion, results, and return flow provide a clear campaign ending | `TBD` | `PENDING` | `TBD` |
| Reduced motion, photosensitivity-safe mode, captions, high contrast, and text scaling remain playable | `TBD` | `PENDING` | `TBD` |

## English and Arabic review

Review the built artifact, not only source catalogs. Check menus, settings, briefings, objectives, HUD, captions, results/ending, errors, plural/count behavior, clipping, RTL order, numerals, terminology consistency, and semantic announcements.

| Locale | Reviewer/date | Native/professional qualification | Outcome | Screens/issues |
|---|---|---|---|---|
| English | `TBD` | `TBD` | `PENDING` | `TBD` |
| Arabic/RTL | `TBD` | `TBD` | `PENDING` | `TBD` |

## Audio mix review

Use representative quiet exploration, dense squad, pulse bomb, boss, low-health, interface, caption, pause/resume, and ending scenes. Check intelligibility, clipping, fatigue, spatial direction, obstruction, music/combat balance, mute behavior, and source ceilings.

| Dynamic range | Reviewer/date and playback setup | Outcome | Measurements/issues |
|---|---|---|---|
| Wide | `TBD` | `PENDING` | `TBD` |
| Balanced | `TBD` | `PENDING` | `TBD` |
| Night | `TBD` | `PENDING` | `TBD` |

## Security and privacy review

Review `SECURITY.md`, `PRIVACY.md`, production CSP, Tauri capabilities, offline/network behavior, browser IndexedDB, packaged profile path, bounded import/export, malicious/corrupt/newer payload rejection, agent API isolation, source maps, dependency audit disposition, and private reporting ownership.

| Discipline | Reviewer/date | Outcome | Evidence/issues |
|---|---|---|---|
| Application security | `TBD` | `PENDING` | `TBD` |
| Privacy | `TBD` | `PENDING` | `TBD` |

## Final disposition

| Field | Value |
|---|---|
| Open critical issues | `TBD` |
| Open high issues | `TBD` |
| Accepted lower-severity issues | `TBD — IDs, owner, rationale` |
| Overall outcome | `PENDING` |
| Quantum Billing release authority | `TBD` |
| Approval date and record/signature | `TBD` |
