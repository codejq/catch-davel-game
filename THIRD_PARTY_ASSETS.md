# Third-party assets

Catch Davel's development build includes 93 wall-art images supplied by the product owner in
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
