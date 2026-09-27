# Contributing to Zama Sniper

Zama Sniper is an open-source Quantum Billing project. Contributions must preserve the single deterministic simulation used by humans, replays, tests, and LLM agents.

## Required local gate

Install the pinned lockfile from the repository root, then run:

```powershell
npm ci
npm run game:format:check
npm run game:lint
npm run game:content:submission
npm run game:build
npm run game:test
npm run game:qa:campaign
npm run game:qa:balance
npm run game:test:worker
npm run game:test:runtime
npm run game:tauri:test
```

CI runs the same checks. Generated schemas and canonical content exports must already be current; validation commands must not leave a tracked diff.

## Architecture rules

- Do not add Three.js or another general-purpose 3D/physics engine. Rendering remains raw WebGL2; physics remains fixed-step Verlet/XPBD.
- Never use wall time, `Math.random`, render quality, GPU results, message arrival order, or device performance in authoritative simulation decisions.
- Human input, tests, replays, and agents must continue through the same `GameSimulation` and command schema.
- Presentation settings may change pixels, audio, captions, vibration, and motion only. They must not change AI, collisions, spawn timing, damage, XPBD iterations, or replay truth.
- Version authoritative schema, replay, observation, transport, and profile changes explicitly. Add checksum-valid migration fixtures before changing released profile fields.
- Keep queues, pools, timers, audio voices, GPU instances, and transport credits bounded.
- Do not add assets without the provenance and license evidence required by `THIRD_PARTY_ASSETS.md` and the content submission gate.
- Agent sessions must remain isolated from human coins, medals, achievements, attempts, and ranked statistics.

Use two-space indentation for TypeScript, JavaScript, JSON, CSS, HTML, YAML, and Markdown examples; use `rustfmt` for Rust. Keep LF line endings, remove trailing whitespace, and end text files with a newline. Commit generated content only when its reviewed source contract changed.
