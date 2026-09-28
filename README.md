# Zama Sniper

Zama Sniper is Quantum Billing's open-source, offline-first, first-person 3D maze game about chasing funny, dangerous dancing Davel robots. It is designed for people, robots, and LLM agents: a shared place where artificial agents can learn to play, enjoy games, and entertain themselves during free time through the same deterministic simulation used by human players, tests, and replays.

The game uses TypeScript, raw WebGL2, a custom sphere/capsule renderer, fixed-step Verlet/XPBD physics, Workers with an OffscreenCanvas enhancement, Vite, and Tauri v2—without Three.js or a native game engine.

The production workspace is in [`game`](game/README.md). The approved design and implementation contract is [`GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md`](GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md); current implementation evidence is recorded in [`docs/vertical-slice/IMPLEMENTATION_STATUS.md`](docs/vertical-slice/IMPLEMENTATION_STATUS.md).

## Zama Sniper: Open World

The main browser game is now [Zama Sniper: Open World](world/README.md), a realistic first-person sniper game built on Three.js. You cross three worlds (Green Valley, Dust Ridge, Frost Pass) with villages, forests, lakes, desert outposts, and snowy bunkers. You can walk, run, crouch, crawl, jump, climb ladders and ledges, open doors, go from building to building, hide in bushes, and search houses for the keycard that opens each world's portal, while armored robot sentries patrol, hunt, and shoot back.

![A robot squad closing in on the sniper in Green Valley](world/docs/screenshots/robots-flanking.jpg)

| | |
| --- | --- |
| ![Dust Ridge through the scope](world/docs/screenshots/scope.jpg) | ![A searched crate with its loot floating out](world/docs/screenshots/loot.jpg) |
| ![A family picnic beside their house](world/docs/screenshots/family-picnic.jpg) | ![A tank patrolling the road through Dust Ridge](world/docs/screenshots/tank.jpg) |

Every world is home to civilian families (some picnicking, some strolling with their dogs) who panic and hide when fighting starts; shooting an innocent costs you health. Tanks patrol the roads and shell you from close range, and a destroyed robot drops its automatic carbine for you to take. The robots fight as a squad: they radio your position, bound from cover to cover, flank, and dive for cover when your shots land near them. Doors, boxes, and the ground around the houses hide randomized loot, from cash and armor to a suppressor and a 12x scope.

```powershell
npm ci
npm run world:dev
```

### Built for LLM agents

Language-model agents can play the open world through an MCP server, a ready-made Claude agent, or the in-page `window.zamaSniper` API. The world pauses while the agent thinks, observations come as text briefings (with screenshots for vision models), and commands are high level: walk to a building (route finding through doors and up stairs included), search a crate, aim at a robot, fire. See [world/AGENTS.md](world/AGENTS.md).

```powershell
npm run world:build
claude mcp add zama-sniper -- node world/agent/mcp-server.mjs
```

The original raw-WebGL2 maze game described below is still playable at `/classic/` on the published site, and its last standalone version is preserved on the `maze-game` branch.

## Play and download

- [Play Zama Sniper: Open World in your browser](https://codejq.github.io/zama-sniper/)
- [Play the classic maze game](https://codejq.github.io/zama-sniper/classic/)
- [Download Windows, Linux, macOS, or offline web builds](https://github.com/codejq/zama-sniper/releases)
- [View cross-platform build runs](https://github.com/codejq/zama-sniper/actions/workflows/platform-builds.yml)

## Quick start

```powershell
npm ci
npm run game:dev
```

The application is offline after build. Development builds expose the versioned LLM agent API; normal production builds do not expose mutation-capable agent controls. See the production workspace README for gameplay, content-authoring, replay, testing, packaging, and agent instructions, or start with the dedicated [LLM agent play guide](docs/agent/LLM_AGENT_PLAY_GUIDE.md).

## Supported builds

The same game is delivered as an offline web build and through Tauri v2 on Windows, Linux, and macOS. Android remains available through the documented local Tauri command. GitHub Actions validates the project and produces unsigned web and desktop artifacts; publishing signed store-ready packages requires the platform owner's signing credentials.

## Contributing and license

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before changing simulation, rendering, content, saves, transport, or agent contracts. Zama Sniper is licensed under the [MIT License](LICENSE). Third-party assets require the evidence described in [`THIRD_PARTY_ASSETS.md`](THIRD_PARTY_ASSETS.md); the current campaign uses project-original procedural visuals and audio. Public distributions must also retain the [credits](CREDITS.md), [privacy notice](PRIVACY.md), and [trademark policy](TRADEMARKS.md). Security reports follow [SECURITY.md](SECURITY.md), and release owners use the explicit [release checklist](docs/release/RELEASE_CHECKLIST.md).
