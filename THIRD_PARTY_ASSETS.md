# Third-party assets

Catch Davel currently distributes no third-party art, audio, models, textures, fonts, or other media assets.

The Chapter 1 palettes, maze templates, WebAudio presets, deterministic choreography, and Tauri app icon are project-original procedural/vector content. Their exact content IDs and source ownership records live in `game/src/content/assets/provenance.ts`; the content export command rejects missing, duplicate, stale, or ambiguous Chapter 1 provenance, while the packaging record identifies the SVG source for every generated desktop/mobile icon variant.

Before a third-party asset may enter a build, its manifest record must include its creator, title, HTTPS source URL, approved SPDX-style license ID, retrieval date, original SHA-256 checksum, every shipped-file SHA-256 checksum, modifications, and required attribution. The accepted third-party licenses are currently CC0-1.0 and CC-BY-4.0. Assets with unclear terms, non-commercial restrictions, or legacy Sampling+ terms are rejected.

This inventory records technical provenance and development-policy acceptance. Final public-release license, trademark, and company approvals remain separate release gates.
