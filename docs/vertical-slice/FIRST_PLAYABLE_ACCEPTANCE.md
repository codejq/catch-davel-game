# First playable vertical-slice acceptance

Status: **Implementation authorized**

This milestone replaces the Phase −1 stress scene as the build presented for gameplay and visual review. The stress scene remains a benchmark and is not presented as the game.

## Required player experience

- First-person player with keyboard/mouse controls, pointer lock, visible pulse gun, crosshair, health, energy, coins, and objective HUD.
- Bright bounded 3D maze with readable floor, walls, landmarks, exit, and no path into an unlit void.
- At least six active Davel robots with visibly different scale, proportions, color, silhouette, and seeded dance personality.
- Robots navigate independently rather than following one shared path or forming a synchronized line.
- Davels preserve the reference's charm through oversized heads, thick rounded limbs, dark joint caps, strong color contrast, shadows, funny expressions, and exaggerated reactions.
- Pulse-gun hitscan, damage, knockback, defeat, coin rewards, and a basic win condition.
- Deterministic seed and command processing suitable for direct play, tests, replay capture, and the agent API.

## Dance personalities for the slice

1. **Rubber Chicken** — rapid elbows, head bob, alternating knees.
2. **Moonwalker** — sideways glide, backward lean, sweeping arms.
3. **Tiny Tyrant** — small body, oversized head, fast stomps and an evil grin.
4. **Big Bouncer** — broad body, slow heavy hops, delayed arm follow-through.
5. **Broken Marionette** — asymmetrical loose limbs and sudden recoveries.
6. **Disco Menace** — pointing arm, hip swing, tempo-synced turns.

All variation is derived from named deterministic RNG streams. Presentation should feel surprising without using nondeterministic `Math.random()` in authoritative behavior.

## Review boundary

This slice proves feel, readability, architecture, and the core combat loop. It does not attempt all 100 levels, final assets, complete audio, mobile packaging, or campaign balance.
