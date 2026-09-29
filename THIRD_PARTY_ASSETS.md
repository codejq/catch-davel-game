# Third-party assets

Zama Sniper's development build includes 93 wall-art images supplied by the product owner in
`game/public/wall-art/`. They are used as decorative, non-authoritative maze textures. Creator,
source URL, and redistribution-license metadata were not supplied with the files, so these images
remain subject to an explicit Quantum Billing public-release rights review. They must not be treated
as CC0 or CC-BY merely because they are present in the development repository.

The 36 campaign palettes, maze templates, Web Audio room profiles, layered synthesized gameplay cues, tick-correlated music patterns, deterministic choreography, and Tauri app icon are project-original procedural/vector content. Audio and music are generated at runtime from `game/src/audio/` and the campaign's checked-in room/music profiles; they download and embed no sample files. Exact content IDs and source ownership records live in `game/src/content/assets/provenance.ts`; the content export command rejects missing, duplicate, stale, or ambiguous campaign provenance, while the packaging record identifies the SVG source for every generated desktop/mobile icon variant.

Before the wall-art collection may enter a public release, or before another third-party asset may
enter any build, its manifest record must include its creator, title, HTTPS source URL, approved
SPDX-style license ID, retrieval date, original SHA-256 checksum, every shipped-file SHA-256
checksum, modifications, and required attribution. The accepted third-party licenses are currently
CC0-1.0 and CC-BY-4.0. Assets with unclear terms, non-commercial restrictions, or legacy Sampling+
terms are rejected from public releases.

This inventory records technical provenance and development-policy acceptance. Final public-release license, trademark, and company approvals remain separate release gates.


## Zama Sniper: Open World 3D models

The open-world game ships five photo-scanned or professionally modelled props from [Poly Haven](https://polyhaven.com), all released under CC0-1.0 (public domain dedication: commercial use allowed, no attribution required). They are fetched and optimized by `world/scripts/fetch-models.mjs`, which also records each asset's creator, HTTPS source URL, license, retrieval date, original SHA-256 checksums (glTF and every texture/binary), shipped SHA-256 checksum, and modifications in [`world/models.provenance.json`](world/models.provenance.json).

| Shipped file | Asset | Creator | License | Retrieved |
| --- | --- | --- | --- | --- |
| `world/public/models/sniper-rifle.glb` | [Bolt Action Rifle 7.62](https://polyhaven.com/a/bolt_action_rifle_7_62) | Mateusz Sadek | CC0-1.0 | 2026-09-29 |
| `world/public/models/ammo-box.glb` | [Ammo Box](https://polyhaven.com/a/ammo_box) | DanKit | CC0-1.0 | 2026-09-29 |
| `world/public/models/medical-box.glb` | [Medical Box](https://polyhaven.com/a/medical_box) | Ulan Cabanilla | CC0-1.0 | 2026-09-29 |
| `world/public/models/jerrycan.glb` | [Metal Jerrycan Green](https://polyhaven.com/a/metal_jerrycan_green) | Ulan Cabanilla | CC0-1.0 | 2026-09-29 |
| `world/public/models/barrel.glb` | [Barrel_01](https://polyhaven.com/a/Barrel_01) | Jorge Camacho | CC0-1.0 | 2026-09-29 |

Modifications: converted from Poly Haven's 1k glTF to single `.glb` files with `@gltf-transform/cli optimize` (textures resized and re-encoded as WebP, geometry quantized). The game falls back to its own procedural models if a file fails to load. All other open-world visuals and sounds are project-original procedural content.
