# Catch Davel: Open World

A realistic first-person sniper game in the browser, built with [Three.js](https://threejs.org/), TypeScript, and Vite. Armed robot sentries have taken three worlds. Move quietly, hide, search buildings for each world's portal keycard, and pick your shots.

## Play

```powershell
npm ci
npm run world:dev      # development server with debug hooks
npm run world:build    # production build in world/dist
```

| Control | Action |
| --- | --- |
| W A S D | Move |
| Shift | Run; hold breath to steady the scope when aiming |
| C / Ctrl | Crouch |
| Z | Crawl (prone) |
| Space | Jump; climb onto crates, walls, and ledges up to about 2 m |
| W at a ladder | Climb onto roofs and watchtowers |
| Right mouse | Aim through the scope; the wheel switches between 4× and 8× |
| Left mouse | Fire (bolt-action, 5-round magazine) |
| R | Reload |
| E | Open or close doors; hold to search cabinets, crates, desks, and lockers; enter the portal |
| Esc | Pause |

## The worlds

- **Green Valley**: a farming village among oak, birch, and pine forests, with a lake and wooden watchtowers.
- **Dust Ridge**: an adobe desert outpost among dunes, rocks, palms, and cacti.
- **Frost Pass**: concrete bunkers in a snowy mountain pass with snow-covered pines and dense fog.

Each world is generated deterministically from its seed: heightfield terrain with flattened building plots and dirt roads, enterable one- and two-storey buildings (doors that swing open, windows, stairs, flat roofs reachable by ladder, and furniture), forests, bushes, rocks, and wind-blown grass. One searchable container in the building farthest from your spawn holds the keycard that unlocks the portal to the next world.

## How it plays

- **Stealth**: robot sentries see you based on stance, movement, distance, and cover. Crouching or crawling inside a bush makes you nearly invisible. Their eyes turn cyan (patrolling), amber (suspicious or searching), and red (alert). Threat arrows around the reticle show robots that are noticing you.
- **Sound**: every shot is loud. Robots within 75 m hear it and move to search the area it came from, so relocate after you fire.
- **Ballistics**: bullets fly at 820 m/s with gravity, zeroed at 100 m. Aim higher for long shots; the scope shows the range. A headshot destroys a robot, and a body shot takes two.
- **Scope**: sway grows with standing, moving, and fatigue. It shrinks when you crouch or go prone, or when you hold your breath.
- **Survival**: health slowly regenerates up to 50%. Medkits and extra rounds turn up when you search.

## Architecture

- `src/core`: seeded random numbers, noise, keyboard and mouse input, the collision world (axis-aligned boxes over a heightfield, with ladder, cover, and portal volumes plus raycasts), and procedural Web Audio.
- `src/world`: themes, terrain, building and watchtower generators, layout, procedural canvas textures, vegetation with wind shaders, and the scene builder. The scene builder merges static geometry per material and splits forests and grass into instanced tiles that hide with distance and cast shadows only when near.
- `src/player`: character physics (stances, stamina, jumping, ladders, climbing onto ledges), rifle state, ballistics, and the first-person rifle model. The rifle renders in its own scene with a narrower lens.
- `src/enemies`: sentry AI (patrol, suspicious, alert, search), hit testing, and the armored robot model with walk, aim, and collapse animations.
- `src/game.ts`: the frame loop, rendering (physical sky, image-based lighting, sun shadows that follow the player, ACES tone mapping, and dimmer light indoors), interaction, the HUD, and world-to-world travel.

## Testing

```powershell
npm run world:lint     # TypeScript
npm run world:test     # unit tests: movement, collision, layout, AI, ballistics, rifle
npm run world:smoke    # browser run: snipe, take fire, open a door, search, cross all portals
```

The smoke test drives the real game through development-only hooks (`window.catchDavelWorld`), which production builds do not include.
