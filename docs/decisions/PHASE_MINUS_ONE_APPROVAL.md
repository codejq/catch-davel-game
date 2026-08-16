# Phase -1 approval packet

Status: **Awaiting Quantum Billing approval**  
Applies to: `GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`, Revision 6  
Gate: Phase -1 may not begin until Decisions 16–20 are resolved.

## Requested decisions

| Plan decision | Recommended approval | Why it is the spike input | Approval |
|---:|---|---|---|
| 16 | Use deterministic hitscan for the pulse gun; do not simulate a player pulse projectile. | Fixes the representative combat workload and replay behavior. | Pending |
| 17 | Use a 60 Hz authoritative tick, two physics substeps, and exactly eight XPBD iterations per substep for simulation schema version 1 on every device. | Fixes the solver workload and deterministic replay envelope. | Pending |
| 18 | Use a simulation-only Worker; host the shared renderer on the main thread or a render Worker; use the bounded three-buffer snapshot state machine and bounded credited event transport; keep `SharedArrayBuffer` optional behind verified isolation. | Fixes the topology and transport workload to measure. | Pending |
| 19 | Cap concurrently active full-physics robots at 24 and use deterministic staged waves for larger encounters. | Fixes the maximum representative robot workload. | Pending |
| 20 | Approve the provisional device/browser matrix in Section 19.1, or name replacement hardware before certification. | Makes absolute performance certification falsifiable. | Pending |

Approval of this packet authorizes the disposable Phase -1 feasibility spike only. It does not silently resolve later decisions whose gates are Phase 0 or beyond.

## Required certification devices

| Target | Plan baseline | Availability |
|---|---|---|
| Windows desktop | Intel Core i5-8250U, Intel UHD 620, 8 GB RAM, Windows 11 | Confirmation/device access required |
| Android | Google Pixel 6a, 6 GB RAM, Android 14 | Confirmation/device access required |
| iOS | iPhone 12, 4 GB RAM, iOS 17.4 | Confirmation/device access required |

Public browser floors remain Chromium-family 124+, Firefox 125+, and Safari 17.4+ unless Decision 20 supplies replacements.

## Current development environment audit

The current workspace reports an Intel Core i9-14900K through a virtualized six-logical-processor environment, about 30 GB RAM, Windows 10 build 19045, and VMware SVGA 3D graphics. It is suitable for implementation and correctness testing but is **not** a substitute for any named certification device. Measurements from it must be labeled development-only.

## Approval record

Approver: **Pending**  
Approval date: **Pending**  
Approved decisions or replacements: **Pending**  
Available certification hardware/owners: **Pending**

