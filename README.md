# Catch Davel

Catch Davel is Quantum Billing's open-source, offline-first, first-person 3D maze game about chasing funny, dangerous dancing Davel robots. It uses TypeScript, raw WebGL2, a custom sphere/capsule renderer, fixed-step Verlet/XPBD physics, Workers with an OffscreenCanvas enhancement, Vite, and Tauri v2—without Three.js or a native game engine.

The production workspace is in [`game`](game/README.md). The approved design and implementation contract is [`GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`](GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md); current implementation evidence is recorded in [`docs/vertical-slice/IMPLEMENTATION_STATUS.md`](docs/vertical-slice/IMPLEMENTATION_STATUS.md).

## Quick start

```powershell
npm ci
npm run game:dev
```

The application is offline after build. Development builds expose the versioned LLM agent API; normal production builds do not expose mutation-capable agent controls. See the production workspace README for gameplay, content-authoring, replay, testing, packaging, and agent instructions.

## Contributing and license

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before changing simulation, rendering, content, saves, transport, or agent contracts. Catch Davel is licensed under the [MIT License](LICENSE). Third-party assets require the evidence described in [`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md); the current campaign uses project-original procedural visuals and audio. Public distributions must also retain the [credits](CREDITS.md), [privacy notice](PRIVACY.md), and [trademark policy](TRADEMARKS.md). Security reports follow [SECURITY.md](SECURITY.md), and release owners use the explicit [release checklist](docs/release/RELEASE_CHECKLIST.md).
