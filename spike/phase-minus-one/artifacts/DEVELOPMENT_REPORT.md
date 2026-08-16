# Phase -1 development report

Status: **Incomplete — core development diagnostics pass; audio timing and baseline-device certification are outstanding**

This report is evidence from the current development environment only. It cannot approve Phase 0 because the named Intel UHD 620 desktop, Pixel 6a, and iPhone 12 runs have not been supplied.

## Frozen workload

- Simulation schema 1: 60 Hz, two substeps, eight XPBD iterations.
- 24 full-physics robots: 360 particles and 336 links.
- Raw WebGL2; no Three.js.
- Browser topology: OffscreenCanvas render Worker.
- Bomb-plus-squad burst: 146 records / 4672 bytes in one tick.

## Development results

| Diagnostic | Result | Plan target | Interpretation |
|---|---:|---:|---|
| Node whole tick p95 | 0.194 ms | ≤ 4 ms desktop | Diagnostic pass |
| Node XPBD/collision p95 | 0.139 ms | ≤ 2 ms desktop | Diagnostic pass |
| Browser whole tick p95 | 0.600 ms | ≤ 4 ms desktop | Diagnostic pass |
| Main snapshot latency p95 | 0.200 ms | ≤ 5 ms desktop | Diagnostic pass |
| Raw WebGL2 CPU submission p95 | 0.300 ms | GPU/frame budget | Informational; not GPU time |
| Raw WebGL2 GPU elapsed p95 | 15.258 ms | ≤ 5.5 ms desktop | Open |
| Render load | 3 draws / 697 instances | Representative workload | Exercised |
| Node ↔ simulation Worker checksum | match | Exact match | Pass |
| Browser consumer stalls | 8/8 continued | 50 ms–5 s, both consumers | Pass |
| WebGL2 context recovery | lost and restored | Rebuild resources and resume | Pass |
| Instrumented audio mapping p95 | 15.709 ms | ≤ 10 ms desktop | Fail/open |
| Instrumented audio/visual separation p95 | 33.209 ms | ≤ 15 ms | Fail/open |
| JavaScript heap change after probes + GC | 0.79 MiB | Bounded; reset series required | Informational |
| Browser runtime errors | 0 | 0 | Pass |

The Node 6,000-tick run ended at checksum `bf3793bf`; its event peak was 79 records/tick. The browser Worker checksum was `394af9b5` at its captured final tick and matched a direct Node replay at that same tick.

## Browser evidence

- Run: `perf-browser-2026-08-16T04-26-09-017Z`
- Commit recorded by run: `80a2a6451f03584133b322f9c1d0fc3c379c6882`; dirty state: `true`
- Browser: 151.0.4129.86
- CPU: Intel(R) Core(TM) i9-14900K
- GPU: ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)
- GPU timer-query extension exposed: true
- Samples: 61 simulation / 60 render
- SHA-256 run.json: `d6d39968c8f3e9f23a45c9108eb15b48313250ac2b0f4dda5b7c286b66eb05d9`
- SHA-256 samples.jsonl: `0eca00738589552d81d1f05d268aacd9c052f86e4106c4c1f13f89c021326f44`
- SHA-256 summary.json: `0f25f8613dc500dcc415b01ac2e1bf3d8ab45da5a0d409027913739f6933e128`
- SHA-256 errors.jsonl: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## Open gates

- Repeat at least five frozen `perf:sim` runs and the browser suite on the approved i5-8250U/UHD 620 desktop.
- Run the Android suite on a Pixel 6a and the iOS suite on an iPhone 12.
- Capture GPU timer-query/frame pacing, sustained memory/reset growth, and thermal behavior.
- Repeat the passing context-loss/restoration and browser-consumer stall probes on every baseline device; transport bounds remain covered by invariant tests.
- Investigate the failed development audio timing result, then repeat it on baseline devices with physical speaker/display capture. Current result limitation: Instrumented Web Audio clock mapping and animation-frame timing only; no microphone, speaker, photodiode, or physical display capture.
- Re-run from a clean commit before promoting evidence; development runs with unrelated workspace changes remain marked dirty.

Phase 0 remains gated until those items are measured and the Phase -1 report is approved. No production architecture decision is inferred from this development result.
