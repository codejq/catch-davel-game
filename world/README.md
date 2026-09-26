# Catch Davel: Open World

A realistic first-person sniper game in the browser, built with [Three.js](https://threejs.org/), TypeScript, and Vite. Armed robot sentries have taken three worlds. Move quietly, hide, search buildings for each world's portal keycard, and pick your shots.

## Play

```powershell
npm ci
npm run world:dev      # development server with debug hooks
npm run world:build    # production build in world/dist
```

The main layout uses the right hand around the arrow keys, like the classic maze game. The WASD and mouse layout works at the same time.

| Arrow-key layout | WASD and mouse | Action |
| --- | --- | --- |
| ↑ / ↓ | W / S | Move forward or back |
| ← / → | Mouse | Turn |
| Page Up / Page Down (or Insert / Delete) | Mouse | Look up or down |
| Home / End | A / D | Step left or right |
| Ctrl | Left click | Fire (bolt-action, 5-round magazine) |
| Right Shift (toggle) | Right mouse (hold) | Scope |
| + / − | Wheel | Switch between 4× and 8× |
| Enter | E | Open or close doors; hold to search; enter the portal |
| Backspace | R | Reload |
| Left Shift | Left Shift | Run; hold breath to steady the scope when aiming |
| C / Z | C / Z | Crouch / crawl (prone) |
| Space | Space | Jump; climb onto crates, walls, and ledges up to about 2 m |
| ↑ at a ladder | W at a ladder | Climb onto roofs and watchtowers |
| Enter (menu) | Click | Start, resume, or retry; Esc pauses |

Most browsers close the tab on Ctrl + W, so if you move with W, fire with the mouse.

## The worlds

- **Green Valley**: a farming village among oak, birch, and pine forests, with a lake and wooden watchtowers.
- **Dust Ridge**: an adobe desert outpost among dunes, rocks, palms, and cacti.
- **Frost Pass**: concrete bunkers in a snowy mountain pass with snow-covered pines and dense fog.

Each world is generated deterministically from its seed: heightfield terrain with flattened building plots and dirt roads, enterable one- and two-storey buildings (doors that swing open, windows, stairs, flat roofs reachable by ladder, and furniture), forests, bushes, rocks, and wind-blown grass. One searchable container in the building farthest from your spawn holds the keycard that unlocks the portal to the next world.

## How it plays

- **Stealth**: robot sentries see you based on stance, movement, distance, and cover. Crouching or crawling inside a bush makes you nearly invisible. Their eyes turn cyan (patrolling), amber (suspicious or searching), and red (alert). Threat arrows around the reticle show robots that are noticing you.
- **Cover**: robots check your head, chest, shoulders, and hips separately. A tree trunk, wall, or rock hides whatever it covers, and each layer of leaves thins what they can see. Their rounds are traced through the world, so a trunk between you and a robot stops the bullet (you'll see it splinter the bark).
- **Close-quarters robots**: robot rifles only hurt within 10 m. A robot that spots you from farther away walks in to close the distance, so keep them at range and pick them off.
- **Who's shooting**: every incoming round leaves a glowing tracer and a muzzle flash, a red (hit) or amber (near miss) arrow at the edge of the screen points at the shooter, and robots firing at you are boxed in red with their distance.
- **Loot behind doors**: the first time you open a door there's a good chance something is behind it: cash, ammo, body armor (soaks up part of each hit), a medkit, an extended magazine, or an extra life that gets you back up when you'd otherwise die.
- **Sound**: every shot is loud. Robots within 75 m hear it and move to search the area it came from, so relocate after you fire.
- **Ballistics**: bullets fly at 820 m/s with gravity, zeroed at 100 m. Aim higher for long shots; the scope shows the range. A headshot destroys a robot, and a body shot takes two.
- **Scope**: sway grows with standing, moving, and fatigue. It shrinks when you crouch or go prone, or when you hold your breath.
- **Survival**: health slowly regenerates up to 50%. Medkits and extra rounds turn up when you search.

## Architecture

- `src/core`: seeded random numbers, noise, keyboard and mouse input, the collision world (axis-aligned boxes over a heightfield, with ladder, cover, and portal volumes plus raycasts), and procedural Web Audio.
- `src/world`: themes, terrain, building and watchtower generators, layout, procedural canvas textures, vegetation with wind shaders, and the scene builder. The scene builder merges static geometry per material and splits forests and grass into instanced tiles that hide with distance and cast shadows only when near.
- `src/player`: character physics (stances, stamina, jumping, ladders, climbing onto ledges), rifle state, ballistics, and the first-person rifle model. The rifle renders in its own scene with a narrower lens.
- `src/enemies`: sentry AI (patrol, suspicious, alert, search, cover-aware sight and ballistics), hit testing, and the military robot model (hydraulic joints, sensor head, carbine) with stride, combat crouch, head tracking, recoil, and collapse animations.
- `src/game.ts`: the frame loop, rendering (physical sky, image-based lighting, sun shadows that follow the player, ACES tone mapping, and dimmer light indoors), interaction, the HUD, and world-to-world travel.

## Testing

```powershell
npm run world:lint     # TypeScript
npm run world:test     # unit tests: movement, collision, layout, AI, ballistics, rifle
npm run world:smoke    # browser run: snipe, take fire, arrow keys and Ctrl, open a door, search, cross all portals
```

The smoke test drives the real game through development-only hooks (`window.catchDavelWorld`), which production builds do not include.
