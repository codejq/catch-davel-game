# Phase -1 development report

Status: **Incomplete — development diagnostics pass; baseline-device certification is outstanding**

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
| Node whole tick p95 | 0.193 ms | ≤ 4 ms desktop | Diagnostic pass |
| Node XPBD/collision p95 | 0.139 ms | ≤ 2 ms desktop | Diagnostic pass |
| Browser whole tick p95 | 0.400 ms | ≤ 4 ms desktop | Diagnostic pass |
| Main snapshot latency p95 | 0.300 ms | ≤ 5 ms desktop | Diagnostic pass |
| Raw WebGL2 CPU submission p95 | 0.200 ms | GPU/frame budget | Informational; not GPU time |
| Render load | 3 draws / 697 instances | Representative workload | Exercised |
| Node ↔ simulation Worker checksum | match | Exact match | Pass |
| Browser runtime errors | 0 | 0 | Pass |

The Node 6,000-tick run ended at checksum `bf3793bf`; its event peak was 79 records/tick. The browser Worker checksum was `915fbbb7` at its captured final tick and matched a direct Node replay at that same tick.

## Browser evidence

- Run: `perf-browser-2026-08-16T04-12-01-267Z`
- Commit recorded by run: `cbd1ffc3df13c33ea5db057384cde3f608282517`; dirty state: `true`
- Browser: 151.0.4129.86
- CPU: Intel(R) Core(TM) i9-14900K
- GPU: ANGLE (Microsoft, Microsoft Basic Render Driver (0x0000008C) Direct3D11 vs_5_0 ps_5_0, D3D11)
- GPU timer-query extension exposed: true
- Samples: 181 simulation / 180 render
- SHA-256 run.json: `dd347b25b701f029fe0adbdfca8415dbc0f6424b6cac55a14b8a73b048a78bcd`
- SHA-256 samples.jsonl: `314d85c84f1fbccf34b051a3daa9ab430eb4a00db4abeb0ae0b5fe1611b42122`
- SHA-256 summary.json: `d666a70fa40a4c53f65c41e8b18fdabdf0bf1af3ab3d2544886586d5f97e0436`
- SHA-256 errors.jsonl: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

## Open gates

- Repeat at least five frozen `perf:sim` runs and the browser suite on the approved i5-8250U/UHD 620 desktop.
- Run the Android suite on a Pixel 6a and the iOS suite on an iPhone 12.
- Capture GPU timer-query/frame pacing, sustained memory/reset growth, and thermal behavior.
- Complete WebGL context-loss/restoration and 50 ms–5 s browser-consumer stall probes.
- Complete instrumented audio absolute timing and audio/visual separation probes.
- Re-run from a clean commit before promoting evidence; development runs with unrelated workspace changes remain marked dirty.

Phase 0 remains gated until those items are measured and the Phase -1 report is approved. No production architecture decision is inferred from this development result.
