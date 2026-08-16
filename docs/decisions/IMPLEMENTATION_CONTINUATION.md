# Implementation continuation decision

Status: **Approved**

Date: **2026-08-16**

Approver: **Project owner, via the implementation thread**

The project will continue through Phase 0 and subsequent implementation work even though the named Windows, Android, and iOS certification devices are not currently available.

This decision changes gate timing, not technical targets:

- local and CI evidence is labeled development-only;
- missing physical-device results do not pause implementation;
- deterministic behavior, bounded memory/transport, tests, and current-machine regression checks remain mandatory;
- a release may not claim support for a named platform until that platform's certification suite passes;
- device evidence is added when hardware becomes available without discarding prior implementation progress.

The first continued deliverable is a playable visual vertical slice addressing the project-owner review: attractive varied Davel silhouettes, independent deterministic dance behavior, a bright bounded maze, a first-person player, and pulse-gun combat.
