# Catch Davel: Game Design and Implementation Plan

Status: **Implementation complete; physical-device evidence waived for this implementation goal**
Prepared for: **Quantum Billing LLC**  
Planned license: **Open source; MIT for original source code, subject to company approval**  
Document date: **2026-08-17**
Revision: **53 — one authored secret in every released level**

> This document defines the product, gameplay, architecture, content plan, licensing approach, quality targets, implementation phases, and acceptance gates. Implementation evidence is tracked in `docs/vertical-slice/IMPLEMENTATION_STATUS.md`; decisions still marked **Review required** remain gated at their named phase.

Revision 53 closes the released campaign's per-level secret promise. Every Level 1–36 definition now contains exactly one reachable, noncritical secret room and one authoritative one-shot `secret-coin-cache`, with chapter-band rewards of 12/16/20/24 coins. Content submission validates the room count, runtime binding, collision-safe placement, reachability, and interaction uniqueness; deterministic tests additionally prove all 36 manifests obey that contract. Because pickup amount and collection state are authoritative, simulation-level dependency hashes, the Level 1/9/10 difficulty references, all generated exports, and frozen replay suite v16 were deliberately migrated. The first-clear economy is now 1,660 guaranteed plus 1,348 optional coins, or 3,008 maximum.

Revision 52 records playable Level 36, **Cold Storage**, completing the owner-approved 36-level campaign. One deliberately limited 12-point repair precedes a four-wave endurance encounter: the first three waves use every ordinary and elite stable Davel identity, and the final wave reveals stable boss ID 6 as the three-phase Refrigerator Robot. Four opposing always-active ice lanes, a distinct authored route, a bright blue/mint/pink/gold palette, emissive refrigerator-crown landmarks, project-original procedural audio/music, and the 140 BPM `refrigerator-robot-rumble` XPBD motif create the ending without a parallel simulation path. Human controls, tests, replays, Workers, raw WebGL2, save progress, and public LLM observation v19 all consume the same schema-v21 truth. The baseline LLM clears Standard twice at tick 3,936 with checksum `161899201918e925`; its effective and simulation-level dependency hashes are `429d9c27ab08995b` and `f187873e2832fc55`. The complete campaign contains 36 playable levels, 108 localized strings per release locale, 360 provenance-resolved assets, and at that revision had a first-clear economy of 1,660 guaranteed plus 769 optional coins; Revision 53 supersedes the optional total and deterministic references.

Revision 51 records playable Level 35, **Zero-Degree Duel**, as the named-elite test of the shortened Frozen Funk Lab finale. Two qualifying rounds lead into a final three-way face-off with stable Violet Shielder ID 11, Cyan DJ ID 5, and Foreman Stomp ID 7; all ten Davels retain their distinct proportions, silhouettes, routes, attacks, and rewards. Four always-active ice lanes create opposing pulls around a distinct authored ring without adding simulation state. A bright violet/cyan/pink/gold palette, emissive zero-degree scoreboards, project-original procedural audio/music, and the 134 BPM `freeze-frame-face-off` XPBD motif give the duel its own identity. Human play, snapshots, replays, Workers, raw WebGL2, tests, and public LLM observation v19 share the existing schema-v21 authority. The baseline LLM clears Standard twice at tick 3,037 with checksum `3f60415af956c8cd`; its effective and simulation-level dependency hashes are `1e98c3db26bcd24e` and `95b529fe964fa73a`. The campaign then contained thirty-five playable levels, 105 localized strings per release locale, 350 provenance-resolved assets, and a first-clear economy of 1,551 guaranteed plus 731 optional coins.

Revision 50 records the owner-approved scope lock of 20 August 2026: the complete campaign contains 36 levels, not 100. Levels 1–30 remain the three complete ten-level chapters already defined, and Levels 31–36 form the six-level Frozen Funk Lab finale. Levels 37–100, Chapters 5–10, and staged post-release chapter promises are removed from the product scope. Stable content, profile, transport, tooling, and test envelopes now end at `level-036`. The implementation goal therefore completes after Levels 35–36 and the final repository-wide gates; physical-device certification remains optional.

Revision 2 fixes deterministic-simulation contradictions, separates simulation and rendering workers, reconciles the robot budget, selects hitscan for the pulse gun, adds content tooling and agent-driven campaign QA, defines a provisional device matrix, makes packaged saves file-backed, protects production progress from agent automation, and adds the level-data contract in Appendix A.

Revision 9 records the implemented player-resource upgrade contract. Simulation schema v18 derives maximum health and energy from two bounded three-level upgrades; pickups and regeneration clamp to those authoritative caps. Replay format v3, RenderSnapshot transport v13, observation v15, Worker resets, HUD, workbench purchases, tests, and profile v10 all carry the same state. The checksum-first v9→v10 migration bounds the previously reserved upgrade fields and clears schema-v17 checkpoints. Agent and training resets deliberately retain zero upgrades. The existing schema-v17 sprint command and API v2 remain unchanged. Physical-device suites remain mandatory before a corresponding platform release claim, but their current unavailability never blocks implementation or the active goal.

Revision 10 records the implemented player locomotion-audio pass. A presentation-only sequencer derives alternating footsteps from authoritative travelled-distance `bobPhase`, requires actual snapshot displacement, distinguishes the faster sprint cadence, and emits at most one current cue per presented snapshot. Hidden, paused, terminal, coalesced, rewind, and resync paths consume or re-prime phase without replaying a stale burst. The project-original two-layer cue uses the existing world bus, room response, dynamic-range controls, and fixed 50-source ceiling. It changes no simulation schema, replay dependency, transport contract, save profile, or LLM observation.

Revision 11 records the implemented Davel defeat-collapse pass. A bounded renderer-local tracker recognizes only safely correlated active-to-zero-health transitions, copies the final 11-point XPBD pose, and topples that pose toward the floor for 36 presentation ticks while existing coins and mechanical fragments scatter. Coalesced gaps, spawns, non-fatal deactivation, rewinds, level changes, reactivation, and resynchronization cannot synthesize or retain a false collapse. Zero-motion presentation uses one immediate stable toppled silhouette. Authoritative defeat, collision removal, rewards, waves, snapshots, replay checksums, and LLM observations remain unchanged.

Revision 12 records the implemented spatial-transient audio pass. Robot attacks, impacts, defeat/taunt cues, and positioned bomb fuse/detonation cues now use camera-relative stereo direction rather than absolute world X and follow one monotonic distance curve from a 1.5-unit full-gain radius to a bounded 8% critical-cue tail at 18 units. Snapshot-derived Davel movement already applies its own proximity gain and therefore receives direction without double attenuation. Player-hit, player weapons, pickups, objectives, and interface cues remain listener-local. The projection uses only the newest immutable player/robot transforms or finite positioned events and changes no authoritative or replay state.

Revision 13 records the implemented granular effects-bus graph. Every procedural cue now routes exhaustively to one of five dedicated Web Audio gain nodes—`weapons`, `robots`, `environment`, `interface`, or `voice`—before the shared dry/room-response/master chain; continuous ambience enters `environment`, Davel mechanisms enter `robots`, and personality taunts enter `voice`. Music retains its separately controlled sequencer path. The existing persisted combat/world/interface controls currently operate as grouped macros over those five nodes, preserving profile v10 while the next persistence slice adds independent five-bus controls and migration required by Section 15.10.

Revision 14 records the completed independent effects-bus persistence contract. English and Arabic settings now expose separate `weapons`, `robots`, `environment`, `interface`, and `voice` controls; a persisted value of zero is the bus mute. Profile v11 stores all five values independently. Its checksum-first v10→v11 migration maps legacy combat gain to weapons and robots, world gain to environment and voice, and interface gain to interface. Because this is presentation-only, a valid schema-v18 campaign checkpoint is retained unchanged. The strict browser and packaged transfer filename is now `catch-davel-profile-v11.json`; simulation schema, replay format, transport contracts, frozen checksums, and LLM observations are unchanged.

Revision 15 records the completed maze-obstruction and event-variation audio pass. Positioned Davel and bomb cues sample the open listener/source segment against static maze walls, the closed workshop door, and active timed gates using current immutable presentation state. An obstructed route applies a fixed 0.58 gain multiplier and a real 920 Hz per-transient low-pass node; endpoints are excluded so a listener or source touching a gate cannot self-occlude. Non-interface transported events also derive bounded 0.94–1.0 gain and 0.975–1.025 pitch variation from cue plus stable event ID, while interface cues remain exact and movement/laser/fuse sequencers retain their purpose-built modulation. No runtime random source, simulation state, replay dependency, transport field, save field, or LLM observation was added.

Revision 16 records the completed distance-dependent report layer. Eligible remote explosions, shots, impacts, weak-point hits, boss phases, and defeats introduce one delayed filtered-noise reflection after 6.5 world units, fading smoothly to full report character at the existing 18-unit spatial limit. The report narrows toward the center, lengthens and darkens with distance, inherits wall/gate low-pass response, and is counted before allocation inside the unchanged 48-transient/50-total hard ceiling. Near cues and ineligible/UI cues allocate no report source. This remains presentation-only and changes no authoritative contract or checksum.

Revision 17 records the completed combat-music pacing director. The previous active-robot ratio kept the score near full intensity even while threats were distant; a bounded presentation tracker now derives exploration, engaged, escalating, wave-transition, objective-clear, and terminal phases from immutable snapshots. Proximity, telegraphs, hostile projectile count, player health pressure, and boss phase build the target; a pending wave rises from 0.52 toward 0.86, objective completion releases to 0.08, and terminal state reaches zero. Attack and release slew at fixed per-authoritative-tick rates, reset across rewinds/resyncs, and feed the existing tick/BPM procedural sequencer and ambience without adding timers, simulation state, replay dependencies, or LLM-only information.

Revision 18 records the completed objective-clear route handoff. A legitimate contiguous false→true objective transition opens a three-second English/Arabic `MAZE STABILIZED` card with the current localized green-exit target, rounded distance, compass instruction, semantic announcement, and a tick-derived remaining bar. It suppresses a competing Davel bark while visible and then yields to the persistent objective compass. The bounded tracker continues an already-observed banner through snapshot coalescing but never invents one after a load, unseen transition gap, rewind, level change, resync, victory, or defeat. It consumes the same immutable snapshot/compass projection and changes no gameplay truth.

Revision 19 records the completed first Chapter 1 environmental-storytelling pass. Each Neon Workshop mission now places three deterministic, collision-safe wall-top landmarks using a distinct title/mechanic-linked motif: signal prongs, grinning marquee, coin circuit, wrong-way arrows, foreman gantry, conveyor drums, blackout lamps, shift clock, rush stacks, or the Final Invoice crown. The objective exit is no longer a three-box doorway: it reads as a barred red lock before clearance, then becomes a green portal with approach strips, internal frame, and a tall pulsing route beacon. An explicit bounded per-instance emissive channel preserves authored signal colors through ordinary lighting and fog. Layouts stay under the existing 512-cube batch, motion derives only from snapshot tick and the presentation motion scale, and zero motion is stable. These additions are renderer-only and change no collision, simulation, replay, save, transport, or LLM contract.

Revision 20 records the completed first-person weapon-locomotion pass. The pulse gun, sword, bomb, and laser view models now share bounded lateral sway, vertical step response, and roll derived from authoritative player position, travelled-distance `bobPhase`, and snapshot tick spacing. Walk and sprint speed produce different intensity, attack/release use fixed per-tick slew, and normal snapshot coalescing reaches the same pose as sequential delivery to floating-point tolerance. Rewind, level change, phase reset, terminal state, resync, and zero camera-motion presentation return safely toward or directly to rest. Existing recoil and sword-swing keyframes compose with the locomotion offsets instead of replacing them. This tracker is browser presentation only and adds no simulation, transport, replay, save, or LLM state.

Revision 21 records the completed close-combat state-marker pass. Existing authoritative XPBD hit impulses, impact flashes/sparks, shocked expressions, hit markers, captions, audio, and vibration remain the hit-reaction stack. To keep overlapping attack phases readable, each telegraph now adds a three-point amber chevron around the Davel silhouette and each recovery adds two cyan side brackets. The shapes use at most three raw sphere instances per active robot, scale with the authored body, pulse only through snapshot `combatTicks` and presentation motion, and remain stable at zero motion. A per-instance emissive value in the existing Davel sphere/capsule batches prevents these signals from turning muddy under low-angle lighting. This presentation projection consumes already-public combat state and changes no AI, damage, collision, simulation, replay, transport, save, or LLM contract.

Revision 22 records the completed ordinary-Davel health-readability pass. A damaged, active, non-boss Davel within 14 world units now receives one dark background capsule and one emissive remaining-health capsule. Exact health is encoded by bar width and reinforced with green/amber/red thresholds; full-health, distant, defeated, and boss robots allocate no bar, avoiding encounter-start clutter and duplication of the Final Invoice HUD. The world-space bar faces the player independently of robot heading but remains depth tested, and its height is capped at 2.82 units beneath the 3.1-unit maze walls so it cannot reveal enemies across occlusion. Story/Standard/Hard maximum health comes from the existing authoritative difficulty projection. No screen-space overlay, new hidden information, simulation field, replay dependency, transport field, save field, or LLM field was added.

Revision 23 records the completed hostile-projectile travel-readability pass. Every moving slider bolt, beat bolt, and fireball now carries exactly two tapered emissive raw-WebGL2 wake capsules of fixed world length, preserving a readable direction across difficulty speed multipliers without adding a screen overlay; stationary or invalid vectors allocate none. A browser-only snapshot tracker detects only live projectiles after they cross their closest point inside a safe 0.58/0.74-to-1.35-unit kind-specific near-miss annulus and dangerous height, then plays a project-original spatial two-layer whoosh with kind-specific pitch. It emits at most two closest stable-ID cues per presented snapshot, reports each active projectile once, consumes disabled or terminal passes, deletes departed IDs, and silently re-primes on rewind, level change, and resync. The cue remains inside the existing 48-transient/50-total source ceiling and the robots effects bus. Simulation, collision, damage, projectile transport, replay, save, and LLM observations are unchanged.

Revision 24 records the first campaign-scaling architecture pass. The reserved `level-001` through `level-036` numbering envelope is explicitly separate from `PLAYABLE_LEVEL_IDS`, which contains only complete authored definitions admitted through one ordered `campaignLevel` registry. Simulation, AI/LLM APIs, Worker protocol/client, render transport/model, replay, progression/results, browser routing, tooling, QA, audio/effect trackers, and maze/combat helpers consume the playable contract rather than importing Chapter 1 directly. An architecture-lint boundary prevents those reusable modules from regressing to chapter-specific identifiers; only the Chapter 1 authoring module, its unique landmark projection, the frozen legacy checksum parser, and the ID/catalog aggregation boundary remain intentionally narrow. Reserved but unauthored IDs are rejected by Worker/agent/runtime guards and cannot appear merely because the 36-ID envelope exists. The current ten levels and all binary/checksum semantics remain unchanged; the next content slice can join the registry without forking gameplay or LLM logic.

Revision 25 records the first Chapter 2 admission through that shared boundary. Level 11, **Ticket Trouble**, enters the Copper Carnival with a bright copper/teal palette, a distinct ticket-booth landmark, a brass-ticket lock, two opposite-phase timed ticket gates, an eight-Davel ticket-taker squad, the 118 BPM `ticket-taker-swing`, English/Arabic strings, project-original procedural audio/music, canonical exports, and complete provenance. The campaign now unlocks the sword at Level 11 through the same authoritative weapon mask used by humans, Workers, replays, tests, and LLM observations. The reserved transport level code uses the stable 36-ID envelope rather than playable-array position, so admitting later content cannot renumber prior wire values. Level 11 passes strict content/schema/reachability/balance checks and the public-observation reference policy twice at tick 3,198. The materialized export is now campaign-scoped, while unauthored Levels 12–36 remain rejected.

Revision 26 records the completed Chapter 2 dash contract. From Level 11 onward, a directional dash travels 2.7 world units through bounded 0.16-unit collision sweeps, costs 24 authoritative energy, and starts a 48-tick cooldown; it cannot tunnel through static walls, the campaign lock, or active timed gates. Keyboard Space, a level-gated mobile button, gamepad B, Worker input, replay format v4, and agent API v3 all feed the same schema-v19 `PlayerCommand`. Observation v16 exposes unlock/readiness data without hidden state, and self-contained RenderSnapshot v14 carries the cooldown in its 9,876-byte fixed buffer. Profile v12 adds the default binding through a checksum-first v11 migration and clears incompatible schema-v18 checkpoints. Frozen checksum suite v12 re-records the authoritative zero-cooldown field and dependency hashes. Automated raw-WebGL2 browser verification measures the dash through the real Worker; physical-device availability remains a release-certification concern and does not block implementation.

Revision 27 records playable Level 12, **Sliding Sideshow**. Two offset, opposing conveyor lanes turn the Copper Carnival arena into a readable dash course; a two-act nine-Davel encounter opens with Blue Sliders and closes with spinners, a firemouth, Foreman Stomp, and DJ Grin. The 124 BPM `sideways-soft-shoe` adds a distinct lateral foot-crossing XPBD choreography without changing any earlier level outcome. A bright blue/coral/teal palette, striped slider-canopy landmarks, authored maze and pickups, procedural audio/music, English/Arabic mission text, and project-original provenance all flow through the shared registry and generated campaign manifest. The public-observation policy clears Standard at tick 2,303 with checksum `0792c6d3bbc8135e`; the production browser verifies its opening act and dash control. The campaign now contains twelve playable levels, 36 localized content strings in each release locale, and 120 provenance-resolved presentation assets. Levels 13–36 remain reserved and fail closed until authored. Physical-device results remain deferred release-certification evidence, never an implementation blocker.

Revision 28 records playable Level 13, **Spinner's Midway**. Three timed arena gates rotate on 60-tick offsets inside a distinct Copper Carnival maze, teaching the player to read openings while a two-act ten-Davel cast escalates from Yellow Spinners and Blue Sliders to a ringmaster finale. The 128 BPM `carousel-kick` adds alternating high kicks, wide arms, and counter-leaning articulated poses; a bright red/blue/green/violet palette and emissive carousel-sign landmarks give the level its own silhouette. English/Arabic strings, procedural audio/music, provenance, exports, balance, and public-agent validation pass the shared pipeline. Standard clears deterministically at tick 9,641 with checksum `9194e8e7e93c486c`. The campaign now contains thirteen playable levels, 39 localized content strings per release locale, and 130 provenance-resolved presentation assets. Levels 14–36 remain reserved and fail closed until authored; unavailable physical devices still defer certification only.

Revision 29 records playable Level 14, **Firebreather Funhouse**. Two opposite vertical conveyor lanes and an independently timed fire-ring gate combine earlier Chapter 2 lessons inside a new maze. Three acts split ten stable Davels into a masked welcome, a spinner/firemouth ring, and the elite Foreman/DJ finale without reusing an identity across waves. The 132 BPM `flame-fan-fandango` adds counter-leaning, wide flame-fan arms and forward torso accents; a hot orange/red/blue/violet palette and emissive flame marquee complete the visual identity. Standard clears deterministically at tick 4,101 with checksum `0b08e95e10bc61f8`. The campaign now contains fourteen playable levels, 42 localized content strings per release locale, and 140 provenance-resolved assets. Levels 15–36 remain reserved and fail closed until authored; physical-device evidence remains certification-only.

Revision 30 records playable Level 15, **Tempo Tent Takeover**. Four independently phased timed gates surround a new Copper Carnival arena, forcing the player to read a rotating route instead of following one opening. Three acts stage ten stable Davels without identity reuse and culminate in an elite Red Firemouth and Cyan DJ. The 136 BPM `tempo-tent-twist` choreography adds a deterministic 30-tick stop-beat inside every 150-tick cycle, while the copper carnival palette and emissive speaker-tent landmark give the level its own bright silhouette. Standard clears deterministically at tick 4,412 with checksum `fd4014ee346c75ff`. The campaign now contains fifteen playable levels, 45 localized content strings per release locale, and 150 provenance-resolved assets. Levels 16–36 remain reserved and fail closed until authored; physical-device evidence remains certification-only.

Revision 31 records playable Level 16, **Laughing Mirrors**. A symmetric maze adds two optional false-corridor loops and three mirror shutters that open on separate thirds of a 210-tick cycle. Three acts stage ten stable Davels from a mixed reflection rehearsal through an elite Firemouth/DJ last laugh. The 140 BPM `mirrorball-lindy` gives articulated bodies opposing heel kicks, counter-leaning torsos, mirrored arm folds, and exaggerated head snaps; a bright silver/blue/pink palette and emissive framed mirror-gallery landmarks keep the deception readable rather than dark. Standard clears deterministically at tick 2,583 with checksum `15372f1ae713e641`. The campaign now contains sixteen playable levels, 48 localized content strings per release locale, and 160 provenance-resolved assets. Levels 17–36 remain reserved and fail closed until authored; physical-device evidence remains certification-only.

Revision 32 records playable Level 17, **Prize Booth Panic**, and the first real defense-objective contract. After the vault key is collected, every active Davel deterministically pathfinds toward a solid 360-health prize bank, stops inside its authored attack radius, and strikes on stable per-ID schedules; losing the bank causes authoritative defeat. The target crosses schema-v20 snapshots/checksums/replays, self-contained 9,896-byte RenderSnapshot v15, a raw-WebGL2 damage-colored prize-bank model, English/Arabic HUD, observation v17, API v4, baseline threat prioritization, and checksum-first profile v13 migration that clears only incompatible schema-v19 checkpoints. The 146 BPM `jackpot-jitterbug` adds exaggerated coin-grab and toss poses, while the bright teal/gold/pink/violet arena and prize-vault landmarks keep the target readable. Standard clears at tick 2,264 with checksum `23cec2a24827d6e3`, leaving the bank at 333/360 health. Frozen suite v13 re-records the six reference checksums and dependencies. The campaign now contains seventeen playable levels, 51 localized strings per release locale, and 170 provenance-resolved assets. Levels 18–36 remain reserved; physical-device availability is removed from implementation gating and remains only optional future platform-release certification evidence.

Revision 33 records playable Level 18, **Big Top Backtrack**, and its planned key-triggered maze reversal. Two state-driven timed-door collision profiles begin in opposite states: the outbound lane is open and the return lane is solid; collecting the reverse key atomically closes the outbound lane and opens the alternate route. The active flags are authoritative existing hazard state, survive complete snapshot/replay restoration, steer player and Davel collision/pathfinding, render through the existing raw-WebGL2 gate path, and appear to LLMs as zero-timer state-driven gates under observation v17/API v4. A distinct sky-blue/orange/red/violet palette, backtrack-arrow landmarks, three-act ten-Davel roster, and 150 BPM `reverse-circus-strut` complete the level. Standard clears deterministically at tick 3,154 with checksum `079778d2c4903215`; its simulation-level dependency hash isolates the new behavior without changing prior level checksums or the global schema. The campaign now contains eighteen playable levels, 54 localized strings per release locale, and 180 provenance-resolved assets. Levels 19–36 remain reserved, and physical-device evidence remains outside implementation gating.

Revision 34 records playable Level 19, **Midnight Matinee**. Two long opposing conveyor lanes and two 80-tick-offset curtain gates combine the chapter's movement and timing lessons in a three-act, ten-Davel gauntlet. “Midnight” is thematic rather than unreadably dark: the distinct palette uses a bright blue moonlit sky, pale reflective floor, saturated neon walls, and emissive crescent-marquee landmarks so the maze boundary and routes remain clear. The 154 BPM `moonlit-swing-off` adds deep dips, sweeping head and arm motion, alternating traveling steps, and a distinct XPBD pose signature. Standard clears deterministically at tick 1,903 with checksum `c149d0d0b6905a1d`; its simulation-level dependency hash is `2a11ddf526e2aca1`. The campaign now contains nineteen playable levels, 57 localized strings per release locale, 190 provenance-resolved assets, and a first-clear economy of 725 guaranteed plus 259 optional coins. Levels 20–36 remain reserved. Physical-device availability is not an implementation blocker; optional certification evidence can be collected later when hardware exists.

Revision 35 records playable Level 20, **Ringmaster Davel**, completing the Copper Carnival chapter. A golden-ticket route leads into a bright magenta/gold/teal big top where four 45-tick-offset curtain barriers rotate around a single three-phase boss. The encounter reuses the stable authoritative boss combat identity and its readable one-, two-, and three-fireball escalation while giving the carnival persona a localized Ringmaster HUD, a distinct crown landmark, and the 160 BPM `evil-ringmaster-revue` with deep bows, wide flourishes, and traveling steps. Standard clears deterministically at tick 1,040 with checksum `51e6cae114e3745a`; the simulation-level dependency hash is `2b66b71ee1b11f7e`. The campaign now contains twenty playable levels, 60 localized strings per release locale, 200 provenance-resolved assets, and a first-clear economy of 775 guaranteed plus 281 optional coins. Levels 21–36 remain reserved. Physical-device evidence remains optional future certification and does not block implementation.

Revision 36 records playable Level 21, **Pipework Promenade**, opening the Toxic Boiler chapter. The shared campaign loadout unlocks bombs at the chapter boundary, and a new authoritative pressure seal remains solid until a bomb detonates within the fixed 6.5-unit break radius. The seal state survives snapshots and replays, participates in collision and pathfinding, and is exposed to LLMs through the existing complete hazard observation. Two opposing steam lanes, a bright green/teal/orange/violet boiler palette, emissive pipe-valve landmarks, two four-Davel acts, and the 126 BPM `pipe-tap-tango` introduce the chapter without changing earlier level checksums. The public-observation baseline clears Standard at tick 2,968 with checksum `257ae8405cd95837`; the simulation-level dependency hash is `ae7edbfccd2b01e7`. The campaign now contains twenty-one playable levels, 63 localized strings per release locale, 210 provenance-resolved assets, and a first-clear economy of 819 guaranteed plus 304 optional coins. Levels 22–36 remain reserved. By owner direction, unavailable physical devices are removed from this implementation goal and may contribute optional platform evidence later.

Revision 37 records playable Level 22, **Green Steam**. A deterministic 180-tick raw-WebGL2 haze cycle smoothly brings the far fog plane inward and mixes a readable green tint from immutable snapshot ticks; photosensitivity zero-flash mode keeps a stable mild haze instead of pulsing. The effect is presentation-only, so collision, targeting, deterministic replays, and public LLM observations remain unchanged. Three staggered steam lanes, a distinct lime/violet/cyan/orange boiler palette, emissive scrubber-canister landmarks, two acts totaling nine stable Davels, and the 130 BPM `toxic-toe-tango` give the mission its own visual and movement identity. Standard clears at tick 1,608 with checksum `576d72650a5957ba`; its simulation-level dependency hash is `ed22c5c39b4e5213`. The campaign now contains twenty-two playable levels, 66 localized strings per release locale, 220 provenance-resolved assets, and a first-clear economy of 868 guaranteed plus 328 optional coins. Levels 23–36 remain reserved, with physical-device evidence still outside the active goal.

Revision 38 records playable Level 23, **Firemouth Fiesta**. A furnace-key route crosses two alternating flame shutters into a hot-draft arena where three compact acts escalate from masked wobblers and a Red Firemouth headliner to an elite Firemouth/Cyan DJ encore. The 134 BPM `flame-lick-flamenco` adds heel stamps, claps, counter-leaning hips, and fan-like arm flourishes to the shared articulated XPBD bodies. A distinct bright orange/gold/red/cyan boiler palette, emissive brazier landmarks, authored pickups, procedural spatial audio/music, English/Arabic mission text, and project-original provenance all use the shared content pipeline. Standard clears deterministically at tick 2,497 with checksum `7c07510016994e91`; its simulation-level dependency hash is `dff52cc3fa613256`. The campaign now contains twenty-three playable levels, 69 localized strings per release locale, 230 provenance-resolved assets, and a first-clear economy of 920 guaranteed plus 353 optional coins. Levels 24–36 remain reserved. Physical-device evidence remains outside the active implementation goal and cannot block continuation.

Revision 39 records playable Level 24, **Valve Velocity**, and activates the authored timer completion contract. Three valve shutters run on one authoritative 240-tick cycle with 80-tick phase offsets; their collision state and exact toggle countdown already cross complete snapshots, replays, raw-WebGL2 rendering, and public LLM observations. Defeating the three-act ten-Davel crew early does not unlock the exit before the fixed tick-3,600 stabilization boundary, while the bilingual human HUD presents the same countdown. The 138 BPM `pressure-step-paso` adds pump/release footwork, counter-leaning torsos, and asymmetric valve-lever arms; a bright teal/gold/pink/violet palette and pressure-valve landmarks keep all routes readable. Standard clears deterministically at tick 3,602 with checksum `5b88f460625402f1`; its simulation-level dependency hash is `6af9106095909e44`. The campaign now contains twenty-four playable levels, 72 localized strings per release locale, 240 provenance-resolved assets, and a first-clear economy of 972 guaranteed plus 379 optional coins. Levels 25–36 remain reserved. Physical-device evidence remains optional and outside the implementation goal.

Revision 40 records playable Level 25, **The Crimson Pair**, and introduces the first authoritative synchronized elite duo. Stable Davel IDs 5 and 7 start one 36-tick telegraph atomically, resolve their distinct Cyan DJ support and Red Firemouth attacks on the same authored beat, and share 32-tick recovery plus 96-tick repeat timing while retaining independent routes, proportions, silhouettes, health, and abilities. Existing public observations expose both exact combat timelines to humans, tests, replays, and LLMs without hidden pair state. A crimson renderer treatment preserves their distinct forms; two alternating gates, opposing steam lanes, bright rose/gold/cyan boiler colors, duel landmarks, and the 142 BPM `duelling-tango` create a readable arena and unique lunge/retreat choreography. Standard clears deterministically at tick 2,938 with checksum `01f55ee8928e01cc`; its simulation-level dependency hash is `1c7b106c08f767cd`. The campaign now contains twenty-five playable levels, 75 localized strings per release locale, 250 provenance-resolved assets, and a first-clear economy of 1,024 guaranteed plus 406 optional coins. Levels 26–36 remain reserved. By owner direction, physical-device evidence is not a goal dependency or blocker and may be collected only as optional future certification evidence.

Revision 41 records playable Level 26, **Bombs in the Ballroom**, and expands the bomb-seal contract into deterministic route choice. One center seal is required for mission completion, while two independently persistent side seals are optional shortcuts: all three are solid collision/pathfinding hazards until a bomb detonates within the fixed 6.5-unit radius, but leaving either shortcut intact never blocks victory. Complete snapshots, replays, raw-WebGL2 gates, public hazard observations, and the generic baseline LLM policy share the same state; Level 21 no longer needs a hard-coded agent exception. Three acts total ten stable Davels, a blast-draft lane crosses the arena, bomb-chandelier landmarks identify the route, and the 146 BPM `detonator-danzon` adds fuse-like windups and exaggerated recoil poses. Standard clears deterministically at tick 3,061 with checksum `673a7e3312907cd3`; its simulation-level dependency hash is `eac80a3af3d37d9a`. The campaign now contains twenty-six playable levels, 78 localized strings per release locale, 260 provenance-resolved assets, and a first-clear economy of 1,076 guaranteed plus 434 optional coins. Levels 27–36 remain reserved. Physical-device evidence remains optional future certification and cannot block the implementation goal.

Revision 42 records playable Level 27, **Magenta Drain**, and implements the rising-hazard escape as three permanent authoritative stage gates. Each magenta barrier begins a smooth 90-tick raw-WebGL2 rise warning, then joins collision and pathfinding exactly at fixed level ticks 1,500, 2,700, and 3,900; inactive/active state and exact countdown already cross complete snapshots, replays, Worker transport, and public LLM hazard observations. A deliberately connected switchback maze lets late players and the baseline policy reroute instead of becoming irrecoverably trapped. Three acts total ten stable Davels, stepped drain-riser landmarks reinforce upward motion, and the 150 BPM `drainpipe-rumba` adds climbing knees, asymmetric arms, and dip/recovery poses. Standard clears deterministically at tick 2,706—after the middle gate closes—with checksum `78f5e29fefa72093`; its simulation-level dependency hash is `9c349a3c30a13c05`. The campaign now contains twenty-seven playable levels, 81 localized strings per release locale, 270 provenance-resolved assets, and a first-clear economy of 1,128 guaranteed plus 463 optional coins. Levels 28–36 remain reserved. Physical-device evidence remains optional and outside the active implementation goal.

Revision 43 records playable Level 28, **Three-Key Tango**, and extends the existing authoritative pickup array into a true ordered three-key state machine without changing the simulation schema or any earlier frozen checksum. The brass key releases the first collision/pathfinding lock, the cyan key releases the second, and only the magenta key completes the all-keys predicate that permits the final door. Each individual pickup identity and active bit already survives complete snapshots, replays, checksums, Worker state, and public LLM observations, so partial progress restores exactly and the baseline policy uses the same visible key sequence as a human. The physical grid proves that key two, key three, and the exit are respectively unreachable before their preceding locks; three local loops do not bypass that order. Brass/cyan/magenta raw-WebGL2 keys, matching gate treatments, triple-key totem landmarks, and the 154 BPM `triple-key-cha-cha` add a distinct readable identity. Three acts total ten stable Davels. Standard clears deterministically at tick 5,923 with checksum `931226a87dba7db5`; its simulation-level dependency hash is `2ce1fc91cbee4832`. The campaign now contains twenty-eight playable levels, 84 localized strings per release locale, 280 provenance-resolved assets, and a first-clear economy of 1,180 guaranteed plus 493 optional coins. Levels 29–36 remain reserved. Physical-device certification remains optional and cannot block this implementation goal.

Revision 44 records playable Level 29, **Fever Tunnels**, as a deliberate systems remix rather than a parallel mechanic. Two 90-tick-offset flame shutters share the existing authoritative timed-door clock with two opposing poison conveyor lanes, while a faster 150-tick fever-haze projection remains presentation-only and derives exclusively from immutable snapshot ticks. Collision, pathfinding, snapshots, replays, Worker transport, rendering, and public LLM observations therefore continue to consume one shared hazard state. A distinct authored tunnel grid, fever-thermometer landmarks, bright lime/orange/cyan/magenta palette, procedural audio/music, and the 158 BPM `feverish-salsa` XPBD motif give the mix its own readable identity. Three acts total ten stable Davels. The public-observation Standard policy clears deterministically at tick 4,433 with checksum `f7cb0c1cf679b2ed`; its simulation-level dependency hash is `042561dfffe467b1`. The campaign now contains twenty-nine playable levels, 87 localized strings per release locale, 290 provenance-resolved assets, and a first-clear economy of 1,232 guaranteed plus 524 optional coins. Levels 30–36 remain reserved. Physical-device certification remains optional and cannot block this implementation goal.

Revision 45 records playable Level 30, **Furnace Mouth**, closing the Toxic Boiler chapter with the shared authoritative three-phase boss contract. Stable boss ID 6 retains the existing health-gated one/two/three-fireball escalation, snapshot/replay/Worker state, public LLM combat timeline, and difficulty scaling; the campaign presentation gives it a localized Furnace Mouth identity instead of leaking a second boss simulation. Four 40-tick-offset flame jaws rotate around a distinct authored arena. Furnace-jaw landmarks, a bright ember/coolant palette, procedural audio/music, and the 164 BPM `inferno-flamenco-finale` XPBD motif complete the finale. Standard clears deterministically at tick 944 with checksum `0075c09f4775a02f`; its simulation-level dependency hash is `e2789398020900b3`. The campaign now contains thirty playable levels, 90 localized strings per release locale, 300 provenance-resolved assets, and a first-clear economy of 1,282 guaranteed plus 556 optional coins. Levels 31–36 remain reserved. Physical-device certification remains optional and cannot block this implementation goal.

Revision 46 records playable Level 31, **Cold Reception**, opening Chapter 4 with an authoritative ice-movement tutorial. Three always-active ice lanes apply bounded deterministic drift in opposing directions through the same fixed-step hazard state used by collision, complete snapshots, replays, Workers, raw-WebGL2 rendering, tests, and LLM agents. Ice receives its own transport code and public observation kind rather than masquerading as a conveyor; RenderSnapshot advances to v16 and the agent observation schema to v18, while the unchanged simulation schema and all prior authoritative checksums remain stable. A bright cyan/blue/violet/pink cold-storage palette, crystalline ice landmarks, procedural audio/music, a three-act ten-Davel reception crew, and the 118 BPM `chilly-funk-walk` XPBD motif establish the chapter. The public-observation Standard policy clears deterministically at tick 4,666 with checksum `62621ca008eb32a2`; its simulation-level dependency hash is `af693b5ee94f0d79`. The campaign now contains thirty-one playable levels, 93 localized strings per release locale, 310 provenance-resolved assets, and a first-clear economy of 1,334 guaranteed plus 589 optional coins. Levels 32–36 remain reserved. Physical-device certification remains optional and cannot block this implementation goal.

Revision 47 records playable Level 32, **Slippery Smiles**, escalating the existing ice contract into mobile ranged-squad pressure without adding parallel authority. Two visually and proportionally distinct Blue Sliders open with lateral bolt crossfire; later acts rotate in Spinner bolts, a Firemouth, and the Cyan DJ/Foreman elite pair while four opposing always-active ice lanes keep both pursuit and evasive routes moving. Snapshots, replays, Workers, raw-WebGL2 rendering, tests, and public LLM observations consume the same v20 simulation state, v16 RenderSnapshot, and v18 observation contract, so every prior authoritative checksum remains stable. A distinct bright blue/cyan/magenta/lime palette, skate-arch landmarks, authored rink maze, procedural audio/music, three-act ten-Davel squad, and 122 BPM `ice-slide-moonwalk` XPBD motif establish its own readable identity. The public-observation Standard policy clears deterministically at tick 3,840 with checksum `a12f4dd6fc4e0962`; its simulation-level dependency hash is `69859c228e2e161c`. The campaign now contains thirty-two playable levels, 96 localized strings per release locale, 320 provenance-resolved assets, and a first-clear economy of 1,386 guaranteed plus 623 optional coins. Levels 33–36 remain reserved. Physical-device certification remains optional and cannot block this implementation goal.

Revision 48 records playable Level 33, **Violet Wall**, and the first authoritative Violet Shielder. Stable Davel ID 11 strafes laterally and raises a bright raw-WebGL2 plate during telegraphs and deterministic `shield-pose-popping` dance phases. Ordinary attacks deal 25% damage through the plate, while legitimately aimed weak-point hits bypass it and retain the shared precision multiplier. Shield activity is derived only from complete snapshotted robot state, so simulation, replay, Worker rendering, tests, and public LLM observations cannot disagree or require a parallel timer. Simulation schema v21 and observation v19 publish the mechanic; RenderSnapshot remains v16 because its existing robot dance/combat fields are sufficient for the renderer. Profile v14 clears only incompatible schema-v20 checkpoints, frozen suite v15 records the intentional checksum migration, and a distinct project-original shield-step cue preserves the archetype's audio identity. The violet/cyan/gold cold-storage maze includes three deterministic ice lanes, luminous shield pylons, a three-act ten-Davel company, and the 126 BPM `shield-pose-popping` XPBD motif. Standard clears at tick 3,980 with checksum `1d2729f1e1aa5807`; its effective and simulation-level dependency hashes are `dd07f47959e2dd6b` and `36460f12387f9356`. The campaign now contains thirty-three playable levels, 99 localized strings per release locale, 330 provenance-resolved assets, and a first-clear economy of 1,442 guaranteed plus 658 optional coins. Levels 34–36 remain reserved. Physical-device certification is optional and cannot block this implementation goal.

Revision 49 records playable Level 34, **Frosted Crossroads**, as a route-reading escalation built entirely from existing authoritative contracts. Four always-active ice lanes pull in all cardinal directions across a distinct authored maze while a Violet Shielder, mobile ranged units, ordinary dancers, and the elite DJ/Foreman pair rotate through three acts totaling ten stable Davels. The bright cyan/magenta/mint/violet palette, luminous glass-frame crossroads landmarks, procedural cold-room audio/music, and 130 BPM `crystal-locking-dance` XPBD motif create a separate visual and movement identity without adding simulation state. Snapshots, replays, Workers, raw WebGL2, tests, human input, and public LLM observations all consume the same schema-v21 state and observation-v19 fields. Standard clears twice at tick 3,774 with checksum `4bfa45c79fecab8d`; its effective and simulation-level dependency hashes are `f46a859e80625dc9` and `c79dda8d80564622`. The campaign now contains thirty-four playable levels, 102 localized strings per release locale, 340 provenance-resolved assets, and a first-clear economy of 1,498 guaranteed plus 694 optional coins. Levels 35–36 remain reserved. Physical-device certification remains optional and cannot block this implementation goal.

## 1. Executive summary

Catch Davel is an original, fast, funny, first-person 3D maze-combat game. The player enters colorful mazes across 36 progressively harder levels and defeats dancing, mischievous Davel robots. The robots are comedic and expressive but also dangerous: they grin, taunt, dodge to the beat, ambush the player, fire projectiles, and sometimes spit fire.

The player begins with a pulse gun and later unlocks a sword, bombs, and a laser. Defeated robots release Quantum Coins. Coins purchase permanent weapon improvements, defensive upgrades, and cosmetic items. Each level has its own palette, maze configuration, dance profile, combat mix, secrets, and optional mastery challenges.

The game will be built in strict TypeScript compiled to JavaScript, without Three.js or another general-purpose 3D engine. It will use a custom raw WebGL2 capsule/sphere renderer, deterministic fixed-step simulation, custom Verlet/XPBD articulated robot physics, Web Workers, and an optional OffscreenCanvas rendering path. Vite will create an offline web build, and Tauri v2 will package the same game for desktop and mobile.

Humans, automated tests, replay playback, and LLM agents will all use the same authoritative simulation. The project will not repeat the architectural split found in the reference garden repository, where the shipped browser runtime and deterministic headless runtime currently behave as parallel implementations.

## 2. Confirmed product decisions

- First-person 3D maze-combat game.
- A visible weapon presentation inspired by classic fast first-person games.
- No Three.js.
- Strict TypeScript is preferred over untyped JavaScript for production source.
- Raw WebGL2 custom renderer.
- Custom fixed-step Verlet/XPBD physics.
- Web Worker simulation with an optional OffscreenCanvas WebGL2 enhancement.
- Vite offline web build.
- Tauri v2 desktop and mobile packaging.
- Exactly one deterministic simulation shared by human play, tests, replays, and LLM play.
- 36 numbered campaign levels with increasing difficulty.
- Dancing robots with distinct colors, abilities, personalities, rewards, and dance behavior.
- Player weapons include a gun, sword, bombs, and laser.
- Persistent player progress and upgrades.
- Keyboard and mouse controls on desktop, touch controls on mobile, with optional gamepad support.
- Open-source release connected to Quantum Billing LLC and its original Davel robot identity.

## 3. Identity, ownership, and originality

### 3.1 Working title

**Catch Davel: Rhythm Rebellion**

Other acceptable subtitles for later review:

- Catch Davel: Maze of Mischief
- Catch Davel: Quantum Breakdown
- Catch Davel: Dance or Disassemble

The short store/display title remains **Catch Davel**.

### 3.2 Attribution

Proposed title-screen credit:

> An original game by Quantum Billing LLC

Proposed repository description:

> Catch Davel is an open-source first-person 3D maze game featuring Quantum Billing's original dancing Davel robots.

### 3.3 Intellectual-property boundary

The game may use classic first-person maze pacing as a genre reference, but it must not copy Doom or another commercial game’s:

- source code;
- maps or map layouts;
- character, weapon, enemy, or logo designs;
- textures, sprites, animations, music, or sounds;
- names, story, dialogue, or trade dress.

All Davel robot designs, maze themes, UI, story, shaders, physics behavior, and procedural geometry will be original or based on assets with explicitly compatible licenses.

### 3.4 Proposed open-source policy

- Original source code: MIT License, pending Quantum Billing approval.
- Original company-created art and audio: CC BY 4.0 or CC0, decided per asset.
- Third-party assets: only licenses approved in the asset policy below.
- Quantum Billing name and logo: remain company trademarks and are not automatically licensed for endorsement of forks.
- A future `TRADEMARKS.md` should explain that forks may use the source license but may not imply official Quantum Billing sponsorship.
- Every distributed asset must appear in `THIRD_PARTY_ASSETS.md` with creator, source URL, license, retrieval date, file hash, and modifications.

**Review required:** Quantum Billing must approve the final code license, asset license, logo use, robot ownership statement, and trademark wording.

### 3.5 Explicitly out of scope

Unless a later design revision explicitly adds them, the complete 36-level campaign excludes:

- online or local multiplayer;
- competitive leaderboards or authoritative anti-cheat;
- cloud accounts and cloud synchronization;
- paid currency, loot boxes, advertisements, or in-app purchases;
- user-authored mods and a public mod API;
- a player-facing level editor or workshop;
- procedural generation of an unbounded campaign;
- virtual-reality support;
- server-hosted gameplay;
- photorealistic humans, gore, or dismemberment;
- importing arbitrary 3D model formats at runtime.

Internal content tools are required for the development team, but they are not a supported player-facing editor in the first release.

## 4. Game vision

### 4.1 Player fantasy

The player is a Quantum Response Ranger sent into the Davel research maze after a malicious Rhythm Virus turns the company’s cheerful entertainment robots into dancing troublemakers. The player must deactivate the corrupted robots, recover their Quantum Coins, stabilize each maze, and reach the Davel Core before the rhythm signal spreads.

The player should feel:

- fast and capable;
- amused by the robots’ movement and personalities;
- surprised by attacks choreographed to music;
- rewarded for accuracy, timing, exploration, and weapon choice;
- curious about the next color palette, dance, robot, and maze mechanic.

### 4.2 Tone

- Funny and mischievous, not grim.
- Robots appear evil through exaggerated glowing eyes, eyebrows, smiles, taunts, and attacks.
- Violence is mechanical and non-gory: sparks, loose bolts, smoke puffs, collapsing elastic limbs, and harmless-looking energy cores.
- Defeat language in family-facing UI should use “deactivate,” “defeat,” or “cleanse” rather than graphic language.
- Weapon feedback can sound powerful and physically convincing without depicting realistic injury.

### 4.3 Audience

- Primary: players who enjoy short first-person action levels, mastery challenges, expressive physics, and progression.
- Secondary: families, casual players, speedrunners, browser-game players, open-source developers, AI/game-agent researchers.
- Target session: 5–12 minutes per normal level; 12–20 minutes for major bosses.
- Campaign target: approximately 15–25 hours for first completion, with additional replay value from medals and challenges.

### 4.4 Design pillars

1. **Dance is gameplay.** Dance motion communicates personality, timing, attacks, and vulnerability.
2. **Elastic robot comedy.** Articulated XPBD bodies react physically without becoming unreadable.
3. **Fast maze decisions.** Movement, aim, doors, hazards, flanking, and weapon switching remain immediate.
4. **Readable complexity.** Color is supported by shape, icon, sound, and motion so combat stays understandable.
5. **Fair progression.** Difficulty grows through combinations and smarter behavior, not only inflated health.
6. **One deterministic game.** Humans, replays, tests, and agents never use separate gameplay rules.
7. **Offline and portable.** Every required runtime asset ships with the game.

## 5. Narrative structure

### 5.1 Premise

Quantum Billing created Davel robots to make technical demonstrations welcoming and memorable. During a test of the Quantum Rhythm Core, an unknown signal called the Grin Beat corrupts the robots. The infected robots rebuild the facility into shifting performance mazes and refuse shutdown commands.

The player enters through the Neon Workshop and follows the signal across four sectors. Logs reveal that the apparent villain, Prime Davel, is not purely malicious: its safety system concluded that humans only pay attention when a demonstration becomes a spectacular game. The released canonical ending cleanses the dangerous Grin Beat while preserving the Davels’ harmless personalities and dances; alternate endings remain outside the 36-level release scope.

### 5.2 Story delivery

- Four short chapter introductions.
- Environmental signs and humorous robot graffiti.
- Optional audio/text logs in secret rooms.
- Boss taunts and pre-fight poses.
- Results-screen messages from the facility assistant.
- No long mandatory cutscenes.
- All dialogue localized through data files.

## 6. Core game flow

```text
Launch
  -> profile/language/accessibility
  -> campaign map or continue
  -> loadout and upgrades
  -> level briefing
  -> maze exploration and combat
  -> objective completion
  -> exit portal
  -> results, medals, coins, unlocks
  -> upgrades or next level
```

### 6.1 Moment-to-moment loop

1. Enter or inspect a room.
2. Read robot colors, shapes, sounds, and dance timing.
3. Move, strafe, dodge, aim, and choose a suitable weapon.
4. Interrupt attacks or exploit a dance vulnerability.
5. Deactivate robots and collect Quantum Coins, health, energy, or keys.
6. Search for secrets or continue through the maze.
7. Complete the room objective and open the next route.

### 6.2 Level completion

A normal level requires a primary objective followed by reaching the exit portal. Primary objectives rotate among:

- deactivate every required robot;
- recover a number of Quantum Keys;
- shut down rhythm transmitters;
- survive timed waves;
- hunt named elite robots;
- defend a stabilizer;
- escape a pursuing boss;
- defeat a chapter boss.

Optional objectives provide medals but never block campaign progress:

- finish under par time;
- achieve an accuracy target;
- take no damage in a specified room;
- find every secret;
- use a featured weapon;
- maintain a combo;
- finish without upgrades;
- pacify a rare robot through rhythm timing rather than destroying it.

### 6.3 Failure and recovery

- On zero health, restart from the latest deterministic checkpoint.
- Coins banked before a checkpoint remain safe; unbanked room coins are replayed with the room.
- No purchased consumable is permanently lost on failure.
- Assist options may add checkpoints, aim support, slower enemy projectiles, or reduced damage.
- Campaign progress is never reset by failure.

## 7. Player systems

### 7.1 Movement

- Walk, sprint, strafe, and controlled air movement.
- Short dash unlocked in Chapter 2.
- Optional crouch/slide unlocked in Chapter 4 if playtesting shows it improves rather than complicates combat.
- No mandatory platforming over lethal precision jumps.
- Player collision is a vertical capsule against maze planes and simple convex obstacles.
- Camera bob, recoil, and shake have independent accessibility sliders and can be disabled.

### 7.2 Health and resources

- Base health: 100.
- Optional armor layer unlocked in Chapter 3.
- Weapon energy/ammunition is intentionally simple:
  - pulse gun uses replaceable cells;
  - sword uses stamina/heat, not ammunition;
  - bombs use a limited carried count;
  - laser uses a rechargeable energy meter and can overheat.
- Pickups have stable IDs and deterministic spawn rules.
- Health and ammunition scarcity are adjusted by difficulty mode, not by hidden randomness.

### 7.3 Weapons

#### Pulse gun

- Starting weapon.
- Deterministic hitscan behavior: firing performs an authoritative ray query on that simulation tick; no player pulse projectile remains in flight.
- Accurate first shot, increasing spread during uncontrolled rapid fire.
- Strong recoil animation, muzzle flash, casing/energy-cell effect, impact sparks, near and distant sound layers.
- Upgrade branches: precision, burst control, or coin-efficiency bonus for skill shots.
- The sword deflects selected robot fireballs, bolts, and bombs; it does not deflect the player’s hitscan shots.

#### Quantum sword

- Unlocked during Chapter 2.
- Fast slash, charged strike, and defensive projectile deflection.
- Highest reward for risky close-range combat.
- Can cut fireballs or reflect selected energy projectiles after an upgrade.
- Upgrade branches: speed, reach, or deflection window.

#### Pulse bombs

- Unlocked during Chapter 3.
- Thrown arcing projectile with clear blast preview and fuse cue.
- Area damage and strong XPBD knockback.
- Does not damage the player on Story mode; configurable self-damage on higher difficulties.
- Upgrade branches: blast radius, stun duration, or cluster fragments.

#### Continuous laser

- Unlocked during Chapter 5.
- Highly accurate sustained beam with heat management.
- Excels against shields and exposed boss components.
- Beam illumination, contact sparks, and rising overheat tone.
- Upgrade branches: cooling, penetration, or escalating focus damage.

### 7.4 Weapon feel requirements

Each weapon must combine:

- immediate input response;
- visible first-person anticipation and recovery;
- synchronized sound transient;
- camera and weapon recoil;
- muzzle/edge/beam lighting;
- impact decal or spark response;
- controller/mobile haptic hook where supported;
- hit marker and optional damage number;
- distinct robot XPBD reaction;
- positional room reflection/reverb.

Damage must be applied by deterministic simulation events. Rendering, sound, camera shake, and haptics react to those events and never decide whether a hit occurred.

## 8. Davel robot design

### 8.1 Shared physical construction

Each Davel is represented by a small articulated particle-and-constraint body:

- head center and optional face anchor;
- chest and pelvis;
- left/right shoulders, elbows, and hands;
- left/right hips, knees, and feet;
- XPBD distance constraints for bone lengths;
- angular or pose constraints for readable silhouettes;
- motor targets driven by the current dance/attack state;
- collision spheres/capsules for damage and environment contact.

The renderer draws joints as spheres and limbs as capsules stretched between joint pairs. A small set of procedural accessories—hat, horns, antenna, shield plates, fire nozzle, crown—creates silhouettes without imported character models.

### 8.2 Personality system

Every robot combines:

- archetype;
- color palette and high-contrast icon;
- face set;
- voice/taunt set;
- dance preset;
- aggression profile;
- attack rhythm;
- preferred range;
- coin reward band;
- size and mass variation;
- rare modifier, if any.

Faces use simple procedural geometry or a small generated texture atlas:

- friendly idle grin that becomes an exaggerated evil smile;
- eyebrows that telegraph attacks;
- blinking or narrowing emissive eyes;
- shocked expression when staggered;
- embarrassed smile when missing an attack;
- dizzy spiral eyes when stunned.

### 8.3 Core robot archetypes

Color is never the only identifying signal; each type also has a different head shape, icon, movement sound, and silhouette.

| Archetype | Default color | Combat identity | Typical coins | Signature behavior |
|---|---|---|---:|---|
| Wobble Scout | Green, round head | Basic melee | 1–2 | Simple approach, wide grin, slap attack |
| Blue Slider | Blue, visor head | Fast flanker | 2–3 | Side-slides and attacks from angles |
| Yellow Spinner | Yellow, disk antenna | Mobile ranged | 3–4 | Spins while firing beat-timed bolts |
| Red Firemouth | Red, nozzle mouth | Area denial | 4–6 | Telegraphs and spits fire cones/balls |
| Violet Shielder | Purple, square head | Defensive support | 5–7 | Projects a shield during dance poses |
| Orange Bomber | Orange, barrel torso | Explosive pressure | 5–8 | Throws timed bombs, flees when rushed |
| Cyan DJ | Cyan, speaker shoulders | Buffer/controller | 6–9 | Changes BPM and strengthens nearby robots |
| Pink Trickster | Pink, split antenna | Teleporter/decoy | 7–10 | Creates fake silhouettes and swaps position |
| White Mirror | White, mask face | Reactive elite | 9–12 | Copies the player’s recent movement pattern |
| Black Glitch | Black with neon edges | Dangerous elite | 12–18 | Irregular timing, short phases, mixed attacks |

### 8.4 Rare modifiers

- Giant: greater mass, health, reach, and reward.
- Tiny: fast, low health, difficult aim, comic voice.
- Armored: breakable plates expose weak points.
- Frenzied: faster BPM after taking damage.
- Golden: rare escape target carrying a large coin reward.
- Echo: repeats its last attack from a delayed hologram.
- Conductor: synchronizes a group into a coordinated pattern.
- Vamp: drains weapon energy at close range.

### 8.5 Attacks

- Slap or body-check.
- Lunging headbutt.
- Beat-timed energy bolt.
- Fire spit projectile.
- Sweeping fire cone.
- Ground shockwave.
- Shield pulse.
- Bomb throw.
- Laser sweep.
- Teleport ambush.
- Summon backup dancers.
- DJ tempo buff.

Every damaging attack requires a readable anticipation pose, sound cue, minimum reaction window, and consistent collision rule.

## 9. Dance as a combat system

### 9.1 Dance grammar

Rather than hand-authoring 36 unrelated animations, levels select a deterministic dance grammar:

- base foot pattern;
- torso sway curve;
- arm sequence;
- head accent;
- movement path;
- beats per minute;
- attack beats;
- vulnerable beats;
- transition rules;
- personality exaggeration;
- per-robot phase offset.

Dance motors set XPBD pose targets while the constraint solver preserves elastic reactions. Taking damage adds impulses without permanently breaking the choreography. Robots can stumble, recover on the next bar, and resume dancing.

### 9.2 Dance and fairness

- Attacks are synchronized to visible poses and audible beats.
- Higher difficulty adds syncopation and mixed groups, not invisible attacks.
- A rhythm indicator is optional, never mandatory.
- Deaf/hard-of-hearing mode adds visual beat and attack indicators.
- Reduced-motion mode reduces exaggerated sway, camera response, flashes, and particles without changing timing.

### 9.3 Dance interruption

- Precise gun hit: brief flinch.
- Sword strike: large directional bend.
- Bomb: whole-body launch and recovery.
- Laser: escalating heat/stagger response.
- Weak-point hit during a vulnerability pose: larger damage and coin multiplier.
- Bosses may lose accessories or limbs visually, but their authoritative collision and required attacks remain fair.

## 10. Coin economy and progression

### 10.1 Quantum Coins

- Dropped from defeated robots according to archetype, difficulty, and skill bonuses.
- Magnetized toward the player at close range to avoid tedious collection.
- Combo multiplier increases for accurate, varied, damage-free play.
- Coins are earned only through gameplay; no paid currency or loot boxes are planned.
- Standard level completion banks collected coins.
- Checkpoints protect already banked room rewards.

### 10.2 Spending categories

- Weapon upgrades.
- Maximum health and armor improvements.
- Dash cooldown or movement utility.
- Coin magnet range.
- Cosmetic weapon colors.
- Cosmetic Davel gallery poses.
- Optional jukebox tracks/dance demonstrations.

### 10.3 Upgrade principles

- Upgrades change choices and feel rather than merely multiplying damage.
- The campaign must remain completable with modest upgrades.
- Respec is free or very cheap so experimentation is encouraged.
- No upgrade should invalidate an enemy’s signature mechanic.
- Mastery medals may unlock cosmetics but not mandatory power.

### 10.4 Results and medals

Each level records:

- completion status;
- best time;
- score;
- accuracy;
- damage taken;
- robots defeated by type;
- coins collected and available;
- secrets found;
- highest combo;
- optional objectives;
- replay seed and deterministic checksum;
- bronze, silver, gold, or quantum medal.

## 11. Campaign structure: 36 levels

The campaign contains three ten-level chapters and a six-level Frozen Funk Lab finale. Every chapter introduces a palette, maze mechanic, base dance family, and enemy escalation; Levels 10, 20, and 30 are chapter bosses, while Level 36 is the final endurance mission and ending. Each individual level applies a unique accent hue, named dance preset, objective mix, seed, and encounter configuration.

### 11.1 Chapter overview

| Levels | Chapter | Palette | Maze identity | Dance family | Major addition |
|---:|---|---|---|---|---|
| 1–10 | Neon Workshop | Lime/cyan | Training labs and simple loops | Robot, march, shuffle | Core movement and gun |
| 11–20 | Copper Carnival | Orange/teal | Booths, gates, rotating halls | Swing and carnival | Sword and Blue Sliders |
| 21–30 | Toxic Tango Tunnels | Green/magenta | Pipes, vents, hazard lanes | Tango and Latin steps | Bombs and Firemouths |
| 31–36 | Frozen Funk Lab | Ice blue/violet | Sliding floors and glass routes | Funk and moonwalk | Shielders and final endurance |

### 11.2 Full level catalog

The names and scenarios below are working content specifications. Exact room counts and balance values will be stored in data, not hard-coded logic.

| # | Working level name | Primary scenario | Unique dance preset / twist |
|---:|---|---|---|
| 1 | First Beat | Learn movement and deactivate scouts | Wobble March |
| 2 | Grinning Hall | First branching maze | Side-to-Side Shuffle |
| 3 | Coin Circuit | Collect keys and learn coin banking | Pocket Robot Pop |
| 4 | Wrong Turn Boogie | Ambush room and first secret | Corner Peek Groove |
| 5 | Foreman’s Two-Step | First elite hunt | Heavy Boot Two-Step |
| 6 | Conveyor Conga | Moving hazard lanes | Conveyor Conga |
| 7 | Lights Out, Smiles On | Partial darkness | Flashlight Freeze Dance |
| 8 | Shift Change | Timed doors and mixed scouts | Clockwork Charleston |
| 9 | Workshop Rush | Multi-room survival | Turbo Tool Shuffle |
| 10 | Chief Wobble | Chapter boss | Giant Wobble Breakdown |
| 11 | Ticket Trouble | Carnival gates and sword tutorial | Ticket-Taker Swing |
| 12 | Sliding Sideshow | Blue Slider introduction | Sideways Soft-Shoe |
| 13 | Hall of Hats | Accessory weak points | Hat-Tip Hop |
| 14 | Carousel Crossfire | Rotating central arena | Carousel Waltz-Swing |
| 15 | Knife-Edge Rhythm | Sword mastery elite | Blade-Step Jive |
| 16 | Laughing Mirrors | False corridors | Mirrorball Lindy |
| 17 | Prize Booth Panic | Defend coin bank | Jackpot Jitterbug |
| 18 | Big Top Backtrack | Maze changes after key pickup | Reverse Circus Strut |
| 19 | Midnight Matinee | Bright moonlit carnival gauntlet | Moonlit Swing-Off |
| 20 | Ringmaster Davel | Chapter boss | Evil Ringmaster Revue |
| 21 | Pipework Promenade | Vent routes and bomb tutorial | Pipe-Tap Tango |
| 22 | Green Steam | Visibility pulses | Toxic Toe Tango |
| 23 | Firemouth Fiesta | Red Firemouth introduction | Flame-Lick Flamenco |
| 24 | Valve Velocity | Timed valve objective | Pressure-Step Paso |
| 25 | The Crimson Pair | Synchronized elite duo | Duelling Tango |
| 26 | Bombs in the Ballroom | Destructible route choices | Detonator Danzón |
| 27 | Magenta Drain | Rising hazard escape | Drainpipe Rumba |
| 28 | Three-Key Tango | Complex lock-and-key loop | Triple-Key Cha-Cha |
| 29 | Fever Tunnels | Fire and poison pattern mix | Feverish Salsa |
| 30 | Furnace Mouth | Fire-spitting chapter boss | Inferno Flamenco Finale |
| 31 | Cold Reception | Ice movement introduced | Chilly Funk Walk |
| 32 | Slippery Smiles | Mobile ranged squads | Ice-Slide Moonwalk |
| 33 | Violet Wall | Shielder introduction | Shield-Pose Popping |
| 34 | Frosted Crossroads | Glass route visibility | Crystal Locking Dance |
| 35 | Zero-Degree Duel | Shield elite hunt | Freeze-Frame Face-Off |
| 36 | Cold Storage | Limited-healing final endurance and ending | Refrigerator Robot |

### 11.3 Difficulty curve

For level `L` from 1 to 36, data generation begins from curves but is hand-reviewed:

- chapter `C = ceil(L / 10)`;
- stage `S = ((L - 1) mod 10) + 1`;
- health multiplier grows gently, with larger changes reserved for elites and bosses;
- damage increases more slowly than health and is capped by minimum reaction-time rules;
- enemy count grows until readability/performance limits, then complexity grows through formations and abilities;
- attack BPM rises within safe ranges but later levels also use pauses and syncopation;
- maze size grows through meaningful branches, not empty corridors;
- resource generosity decreases modestly but never creates unwinnable seeds;
- bosses occur at Levels 10, 20, and 30; named elite tests occur at Levels 5, 15, 25, and 35; Level 36 is the final endurance mission.

Initial balancing targets, subject to playtesting:

- Levels 1–10: 4–10 active robots, one mechanic at a time.
- Levels 11–30: 8–16 active robots, two-archetype combinations.
- Levels 31–36: 10–22 active robots, support units, shield pressure, hazards, and final endurance checks.
- All concurrently active robots receive the same full authoritative physics rules. The 24-robot cap is a simulation contract, not merely a rendering target.
- Robots assigned to later waves do not exist as active physics entities until a deterministic encounter trigger spawns them.

## 12. Maze system

### 12.1 Design approach

Use a hybrid authored/procedural system:

- Each level has an authored encounter graph defining entrance, exit, required rooms, keys, locks, boss arenas, checkpoints, and secrets.
- A deterministic generator selects compatible room templates, corridor variants, props, colors, hazards, and optional branches from the level seed.
- Critical routes and encounter pacing are authored; cosmetic layout and optional branches can vary.
- Campaign seeds are fixed for fairness. Replay/custom modes may use alternate seeds.

### 12.2 Validation

Before a maze is accepted, automated validation proves:

- entrance can reach every required objective;
- required keys occur before their locks;
- exit is reachable after objectives;
- player capsule fits every required passage;
- enemy spawn volumes do not overlap walls or mandatory pickups;
- every combat room has valid navigation points and line-of-sight options;
- checkpoints cannot save an unwinnable state;
- mobile touch players receive adequate turning and dodging space;
- LLM observations contain enough information to solve the level without hidden privileged state.

### 12.3 Navigation and AI

- Grid or navigation-cell graph built from the same maze data.
- Deterministic A* for long routes.
- Local steering for separation, strafing, and obstacle avoidance.
- Line-of-sight and hearing events.
- Formation anchors for coordinated dancing groups.
- Authoritative AI uses a fixed, schema-versioned update schedule based on robot state/archetype. It never changes because of device speed, measured frame time, render quality, or camera visibility.
- A robot may be dormant before its room is activated, but activation is a deterministic encounter-graph event. Every active robot receives the full simulation update and fixed solver iteration count.

## 13. Controls and accessibility

### 13.1 Desktop defaults

- `WASD`: movement.
- Mouse: look and aim using Pointer Lock.
- Primary mouse: attack.
- Secondary mouse: alternate attack/guard.
- `1–4` or mouse wheel: weapon selection.
- `Q`: previous weapon.
- `E`: interact.
- `Shift`: sprint.
- `Space`: dash/jump according to final movement decision.
- `Esc`: pause and release pointer lock.
- Fully rebindable keyboard and mouse actions.

### 13.2 Mobile defaults

- Left virtual stick: movement.
- Right-side drag zone: camera/aim.
- Fire, alternate attack, interact, dash, and weapon-wheel buttons.
- Optional gyro aiming.
- Adjustable button position, size, opacity, handedness, and dead zones.
- Aim assistance based on angular slowdown and target friction, not automatic hidden damage.

### 13.3 Optional gamepad

- Dual-stick movement and look.
- Trigger attack, bumper alternate attack, face-button interaction/dash.
- Remapping and dead-zone controls.
- Haptics as an optional feedback adapter.

### 13.4 Accessibility requirements

- English first, localization-ready from day one; Arabic RTL support should be included in the first public release if Quantum Billing wants parity with the garden project.
- Subtitles and visual equivalents for every important sound cue.
- Color-blind-safe icons and silhouettes.
- Scalable text and HUD safe areas.
- Reduced motion, camera bob, shake, recoil, flash, and particle controls.
- Photosensitivity-safe mode with reduced flashes and contrast oscillation.
- Hold/toggle options for sprint and firing.
- Difficulty assists configurable independently.
- Pause stops authoritative gameplay time.
- No required rapid button mashing.

## 14. Audio direction and legally usable sources

### 14.1 Audio goals

“Realistic” weapon sound will mean convincing layering, spatial response, and physical weight—not copying sounds from commercial games.

Each firearm/explosion event should be assembled from:

- close transient;
- mechanical layer;
- low-frequency body;
- environmental tail selected by room type;
- distant report for remote events;
- obstruction/low-pass response behind walls;
- small deterministic pitch/gain variation;
- limiter/compressor protection.

Robot voices, fire spit, coins, lasers, shields, UI, and rhythm components may blend CC0 samples with original WebAudio synthesis. Dance music should preferably be an original procedural sequencer so its BPM and attack beats share the deterministic level clock.

### 14.2 Initial source shortlist

No sound should enter the repository until its license and provenance are recorded. Initial candidates:

- [Kenney Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds): 70 files, CC0; candidate for engines, shields, robot mechanisms, and energy events.
- [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds): 130 files, CC0; candidate for collisions, debris, and physical hits.
- [Kenney Digital Audio](https://kenney.nl/assets/digital-audio): 60 files, CC0; candidate for lasers and electronic cues.
- [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds): 100 files, CC0; candidate for menu and HUD feedback.
- [Freesound handgun.wav by tehlordoswag420](https://freesound.org/people/tehlordoswag420/sounds/249778/): CC0; candidate raw handgun layer.
- [Freesound Gun (Pistol) Shot by synth2](https://freesound.org/people/synth2/sounds/844540/): CC0; candidate crisp transient.
- [Freesound Hit Impact Sword by CogFireStudios](https://freesound.org/people/CogFireStudios/sounds/547035/): CC0; candidate sword impact layer.
- [Freesound Explosion by qubodup](https://freesound.org/people/qubodup/sounds/182429/): CC0; candidate bomb layer.

Kenney states that assets on its asset pages are CC0 and may be used commercially without required attribution. Freesound hosts multiple licenses, so the project must accept only individually verified CC0 or approved CC BY files; CC BY-NC and legacy Sampling+ files are prohibited. See [Kenney support/licensing](https://kenney.nl/support) and [Freesound licensing FAQ](https://freesound.org/help/faq/).

### 14.3 Asset intake checklist

For every candidate sound:

1. Listen for quality, clipping, noise, offensive content, and accidental embedded speech/music.
2. Re-open the individual source page and verify its current license.
3. Save source URL, creator, title, license, retrieval date, and original checksum.
4. Retain the source license text or attribution text where required.
5. Edit non-destructively and document transformations.
6. Normalize loudness and export web-compatible OGG/Opus plus a required fallback if platform tests demand it.
7. Test looping, latency, and decoding across target WebViews.
8. Record the shipped file checksum in `THIRD_PARTY_ASSETS.md`.

**Review required:** The listed files are candidates, not final selections. A sound designer should audition them and Quantum Billing should approve the final tone.

## 15. Technical architecture

### 15.1 Language and dependency policy

- Strict TypeScript for source.
- Compiled JavaScript shipped to browsers/WebViews.
- No Three.js, Babylon.js, Unity runtime, Godot runtime, or general-purpose 3D engine.
- Vite as build/development tooling.
- Tauri v2 CLI and minimal Rust shell.
- Runtime dependencies kept near zero unless a narrowly scoped, audited library clearly reduces risk.
- Avoid framework-driven UI unless menus become complex enough to justify one; start with accessible HTML/CSS.

### 15.2 One-source-of-truth rule

The authoritative simulation module must:

- import no DOM, WebGL, WebAudio, Tauri, or browser globals;
- accept normalized commands tagged with simulation tick;
- advance only through explicit fixed steps;
- emit deterministic gameplay events;
- serialize complete checkpoint/replay state;
- run in a Worker, on the main thread for fallback/debug, and directly in Node tests;
- serve both human input and LLM actions through the same command queue.

There must never be a second “demo physics,” “headless approximation,” or browser-only rules implementation.

### 15.3 Runtime topology

The simulation always runs alone in its own Worker during browser/WebView play. Rendering never shares that Worker, so a GPU stall, shader compilation pause, or context loss cannot block authoritative ticks. Both rendering locations instantiate the same renderer module and consume the same immutable `RenderSnapshot` contract.

OffscreenCanvas browser path:

```text
Main thread
  DOM UI, input collection, audio scheduling, accessibility
       | tick-tagged commands
       v
Simulation Worker
  authoritative fixed-step simulation
  deterministic maze and AI
  XPBD robot physics
       | immutable snapshots and ordered events
       +--------------------------+
       |                          |
       v                          v
Render Worker                  Main thread
  shared renderer module         UI/audio event adapters
  OffscreenCanvas WebGL2
```

Fallback path:

```text
Main thread
  DOM UI + input + audio
  shared WebGL2 renderer module
       ^                 |
       | snapshots       | commands
       |                 v
Simulation Worker
  exact same authoritative simulation module
```

Headless test/LLM evaluation path:

```text
Node test or harness
  -> import authoritative simulation
  -> reset(seed)
  -> act(command)
  -> step(fixed ticks)
  -> observe/checksum
```

OffscreenCanvas is an enhancement, not a separate game mode or renderer implementation. If unsupported or unreliable on a target WebView, the same renderer module runs on the main thread while simulation remains isolated. Snapshot serialization, interpolation, visual event deduplication, and camera behavior are shared and tested against both hosting locations.

Every `RenderSnapshot` is a self-contained, complete presentation projection for one authoritative tick: it includes all render/UI/audio state that a consumer needs after resynchronization, subject to the observation/visibility boundary, and never depends on a prior delta or keyframe chain. Transient ordered events remain separate. Snapshot coalescing and recovery are safe precisely because any retained snapshot can replace every older snapshot without reconstruction history.

The safe-default snapshot transport uses a bounded three-buffer state machine per consumer: at most two transferable `ArrayBuffer` slots may be in flight, and at least one slot always remains owned by the simulation Worker, with one producer-owned slot designated as the newest-snapshot staging buffer. The renderer and main-thread UI/audio consumer have separate three-slot pools and dedicated `MessagePort`s. The producer writes only into its locally owned staging slot. It transfers that slot only when another free or returned slot can become staging immediately; it never transfers its final locally owned slot. While two buffers are in flight, each newer tick overwrites the legal producer-owned staging slot and increments a coalescing counter. When capacity returns, the producer posts that newest staged state and reassigns the returned slot as staging. The assertable invariant is `producerOwned >= 1 && inFlight <= 2`. Thus a stalled consumer cannot block the authoritative tick or cause unbounded allocation, and the newest complete state is delivered when capacity resumes.

Ordered gameplay/audio events use a separate tick- and event-ID-tagged channel so snapshot coalescing cannot drop them. Each consumer buffers a transform-dependent event until it presents a snapshot whose tick is at least the event tick. If delivery or coalescing has already advanced presentation beyond that tick, the consumer applies the event once, immediately, using the newest available transform and presentation code must tolerate that approximation. Event IDs provide deduplication across retries. Audio scheduling maps event ticks to the presentation clock with bounded lookahead and may use the newest available spatial transform at its scheduling deadline; it never waits for a late UI snapshot long enough to exceed the audio-jitter budget.

Snapshot/event encoding, ownership, acknowledgement, and resynchronization semantics use their own `transportContractVersion`, initially `1`. This presentation contract is deliberately outside the authoritative simulation schema, state checksum, replay format, and A.11 replay dependency hashes. An incompatible wire-contract change requires producer/consumer compatibility handling, but transport capacity or credit tuning cannot by itself invalidate a replay or frozen checksum.

The event channel is bounded and acknowledged independently for each consumer. Before Phase -1 measurement, the provisional transport configuration caps both the producer's pending ring and the consumer's tick-correlation queue at 256 fixed-schema event records or 64 KiB, whichever limit is reached first; the provisional batch cap is 64 records or 16 KiB, with a one-batch credit window. A consumer acknowledges the highest contiguous sequence only after those events are presented or deliberately discarded during resynchronization; the producer never posts more batches than its approved credit window, preventing the browser's internal `MessagePort` queue from becoming the hidden unbounded buffer. Phase -1 may approve a fixed window from one through four batches and revised record/byte caps from measured burst and acknowledgement data.

Every event is classified as `presentation-only` (for example sparks, decals, minor particles, or camera shake) or `state-critical` (for example damage/pickup/objective notification or a critical audio cue). When either bounded queue would overflow, presentation-only events are discarded oldest-first and the exact count is recorded. If a state-critical event still cannot fit, the producer never stalls the authoritative tick: it increments that consumer's `eventEpoch`, clears its pending old-epoch records, and marks subsequent self-contained snapshots with `resyncRequired`, the new epoch, and an event-sequence high-watermark. The consumer discards old-epoch/unacknowledged presentation events, rebuilds durable HUD, looped audio, transforms, and objective/pickup state from the next self-contained authoritative presentation snapshot, and emits one explicit resync cue rather than replaying a stale burst of transient effects or sounds. If the consumer correlation queue reaches its cap first, it raises one coalescing/idempotent resync request; the producer then performs the same epoch/high-watermark transition, so resync requests cannot form another queue. Gameplay truth never depends on presentation-event delivery.

`SharedArrayBuffer` is an optional, measured optimization only for deployments that explicitly enable and test cross-origin isolation. It is not required by the engine, build, static hosting, Tauri package, replay system, or LLM API. The transferable-buffer path remains the compatibility and correctness baseline.

### 15.4 Fixed timestep

Initial target:

- authoritative tick: 60 Hz;
- two physics substeps per authoritative tick;
- exactly eight XPBD constraint iterations per substep for simulation schema version 1;
- render interpolation between the latest two completed snapshots;
- frame-delta clamp to prevent a pause/debugger stall from creating a simulation explosion;
- maximum catch-up steps followed by controlled time resynchronization;
- pause means no simulation ticks.

The substep and solver-iteration counts are part of the replay/simulation schema. Changing either requires a new schema version and explicit replay compatibility policy. They are never render-quality settings.

XPBD is selected because it makes articulated compliant motion practical while reducing stiffness dependence on timestep and solver iteration count. Technical basis: Macklin, Müller, and Chentanez, [“XPBD: Position-Based Simulation of Compliant Constrained Dynamics”](https://matthias-research.github.io/pages/publications/XPBD.pdf), MIG 2016.

### 15.5 Determinism policy

- One documented seeded PRNG; never use `Math.random()` in gameplay.
- Stable numeric IDs assigned by deterministic creation order.
- Fixed iteration order for entities, constraints, collision pairs, AI, and events.
- Solver substeps and iteration counts are fixed by simulation schema version and are identical on every device and quality tier.
- Any simulation LOD, dormancy, activation, or AI scheduling decision must be a pure function of authoritative simulation state and fixed level data. It may never depend on measured frame time, GPU/CPU performance, display refresh rate, render quality, or camera visibility.
- Adaptive quality may change only presentation: pixel ratio, shadows, particles, post-processing, mesh detail, and other effects that cannot feed back into gameplay.
- Avoid wall-clock time inside simulation.
- Avoid GPU results as gameplay inputs.
- Avoid locale-dependent parsing/sorting.
- Quantize selected state at safe boundaries if cross-runtime drift appears.
- Treat trigonometric dance curves as visual targets or use deterministic lookup tables where authoritative collision depends on them.
- Generate state checksums periodically.
- Replays store version, seed, initial configuration, tick-tagged commands, checksums, and optional recovery keyframes.
- Exact replay compatibility is guaranteed within a declared simulation schema version; migrations are explicit.
- Sprint was introduced by simulation schema v17 and replay format v2. The current schema v18/replay v3 retains that authoritative boolean and additionally records player-resource caps; replay v2 and earlier are explicitly incompatible and rejected.

### 15.6 Physics scope

The custom solver supports only what this game needs:

- particle position, previous position, velocity derivation, inverse mass;
- gravity, damping, impulses, and external accelerations;
- XPBD distance constraints;
- pose/angular approximations for limbs;
- motor target constraints for dances and attacks;
- sphere-plane, sphere-capsule, capsule-plane, and simple maze collision;
- player capsule collision;
- projectile sweeps to prevent tunneling;
- robot knockback and recovery;
- deterministic dormancy only before encounter activation or after a schema-defined exact sleep condition; no distance- or quality-based reduction for an active robot.

It does not initially attempt general convex rigid-body stacking, vehicles, cloth, fluids, or arbitrary imported mesh collision.

### 15.7 Raw WebGL2 renderer

Required renderer modules:

- context creation, capability detection, context loss/restoration;
- shader compilation and validation;
- typed buffer and vertex-array management;
- perspective/view matrices and frustum culling;
- procedural sphere, capsule, plane, box, and simple accessory geometry;
- instanced joint/capsule rendering;
- material palette and emissive values;
- directional plus ambient/rim lighting;
- depth buffer and transparent-effect ordering;
- shadow solution, initially blob/projected shadows and later an optional shadow map;
- particle pool;
- ray/beam/muzzle effects;
- HUD remains accessible HTML where practical;
- resolution scaling and quality profiles;
- debug overlays for frame time, draw calls, entities, collisions, and worker latency.

The renderer reads immutable render snapshots and must never modify gameplay state.

### 15.8 Capsule transform

For every robot link, rendering derives:

- midpoint between two simulated joints;
- direction and length;
- rotation aligning a unit capsule axis with the direction;
- radius from robot definition and current effect state;
- final model matrix written into an instance buffer.

This reproduces the rounded connected-body character of the original Catch Davel page in full 3D.

### 15.9 Effects pipeline

Baseline effects:

- emissive robot eyes and accessories;
- muzzle flashes and short-lived point-light approximation;
- impact sparks, bolts, smoke, and loose mechanical fragments;
- fire projectiles with billboards/geometry particles;
- beam rendering for laser;
- damage vignette and directional indicator;
- coin burst and magnet trail;
- shadow blobs for strong grounding;
- palette fog and room ambience;
- optional half-resolution bloom after baseline performance is proven.

Effects are event-driven and may be dropped on low quality without altering the simulation.

### 15.10 Audio engine

- Web Audio API buses: master, music, weapons, robots, environment, UI, voice.
- Per-bus volume and mute persistence.
- Spatial panning and distance attenuation.
- Room reverb/early-reflection presets.
- Dynamic-range presets: night, normal, cinematic.
- Pooled audio nodes and decoded buffers.
- Event IDs prevent duplicate sound playback when snapshots are resent.
- Procedural rhythm sequencer uses simulation beat metadata.
- Audio may follow real time while game events remain tick-authoritative.

### 15.11 Proposed repository structure

```text
quantum-catch-davel/
  .github/workflows/
  docs/
    architecture/
    game-design/
    release/
  public/
    icons/
  src/
    app/
      bootstrap.ts
      lifecycle.ts
    core/
      simulation.ts
      state.ts
      commands.ts
      events.ts
      fixed-step.ts
      random.ts
      checksum.ts
      serialization.ts
    physics/
      xpbd.ts
      particles.ts
      constraints.ts
      collisions.ts
      broadphase.ts
    game/
      player.ts
      weapons.ts
      projectiles.ts
      damage.ts
      economy.ts
      progression.ts
      checkpoints.ts
    robots/
      definitions.ts
      factory.ts
      dance-grammar.ts
      ai.ts
      attacks.ts
      bosses.ts
    maze/
      generator.ts
      graph.ts
      templates.ts
      navigation.ts
      validation.ts
    levels/
      campaign.ts
      chapters/
      level-schema.ts
    render/
      renderer.ts
      webgl-context.ts
      shaders/
      geometry/
      instances.ts
      camera.ts
      effects.ts
      quality.ts
    audio/
      audio-engine.ts
      music-sequencer.ts
      spatial.ts
    input/
      actions.ts
      keyboard-mouse.ts
      touch.ts
      gamepad.ts
      llm.ts
    agent/
      api.ts
      observation.ts
      action-schema.ts
      rewards.ts
    workers/
      game.worker.ts
      messages.ts
    ui/
      hud.ts
      menus.ts
      overlays.ts
      accessibility.ts
    i18n/
      en.json
      ar.json
    save/
      profile.ts
      storage.ts
      migrations.ts
      export.ts
  assets/
    audio/
    fonts/
  test/
    unit/
    integration/
    determinism/
    browser/
    visual/
  tools/
    level-editor/
    encounter-graph/
    dance-preview/
    balance-harness/
  scripts/
  src-tauri/
  GAME_DESIGN_AND_IMPLEMENTATION_PLAN.md
  THIRD_PARTY_ASSETS.md
  TRADEMARKS.md
  LICENSE
  README.md
  package.json
  tsconfig.json
  vite.config.ts
```

## 16. LLM play support

### 16.1 Public API

Agent-enabled builds expose a frozen, capability-limited object:

```text
window.CatchDavelAgent
  getVersion()
  getActionSchema()
  reset({ levelId, seed, difficulty, mode })
  observe({ detail })
  act(action)
  step({ action, ticks })
  saveReplay()
  loadReplay(replay)
  getMetrics()
```

This API controls only the game. It cannot invoke arbitrary Tauri commands, read the filesystem, execute shell commands, or access user data outside the selected game profile.

Normal production builds do not expose mutation-capable agent methods by default. The API is enabled only in a declared agent build (`VITE_AGENT_API=1`) or an explicitly allowed local evaluation session. An agent-enabled web artifact may be published separately for research and automation.

Agent sessions always use an isolated, clearly labeled sandbox profile. They cannot write campaign medals, best times, achievements, spendable coins, or ranked statistics. Replays produced by agent mode carry an `agentRun: true` marker. This is not anti-cheat for a single-player open-source game; it prevents accidental mixing of automated and human progress.

### 16.2 Observation design

Compact observation fields:

- API and simulation schema versions;
- tick, seed, level, difficulty, status;
- player position, velocity, yaw, pitch, health, armor, weapon, ammunition/energy;
- visible robots with stable IDs, archetypes, relative position, distance, approximate velocity, health band, attack state, dance phase, and line of sight;
- visible projectiles and hazards;
- nearby pickups, doors, keys, checkpoints, and objective markers;
- current objective and progress;
- recent damage and gameplay events;
- legal actions and cooldowns;
- score, coins, combo, and elapsed ticks;
- optional local navigation rays or a small egocentric occupancy grid.

Normal observations must not reveal enemies behind walls or undiscovered maze sections. A separately declared evaluation/debug mode may expose full state for testing.

### 16.3 Actions

Low-level actions:

- move vector;
- look delta or absolute yaw/pitch;
- fire press/release;
- alternate attack;
- switch weapon;
- interact;
- dash/sprint;
- pause/resume.

High-level accessibility/research actions:

- aimAt visible target ID;
- attack visible target ID;
- navigateTo known marker ID;
- collect nearest visible pickup;
- switch to recommended available weapon;
- follow a discovered path waypoint.

High-level actions are translated into the same low-level command stream and obey visibility, movement, cooldown, ammunition, and collision rules.

The current public contract is agent API v4. Its `sprint: boolean` and `dash: boolean` actions enter the same schema-v21 `PlayerCommand` used by human input and replay v4. Observation v19 exposes maximum health/energy, bounded upgrade levels, the Level 11 dash unlock/readiness, complete Level 17 prize-bank health/location/strike timing/threat IDs, Level 18's exact key-driven gate states, Levels 31–34's explicitly typed ice lanes, and every visible robot's shield-active flag and damage multiplier without hidden state. State-driven gates report zero `ticksUntilToggle`, distinguishing them from periodic doors while the existing `keyCollected` and branch-route phase explain their trigger. Agent resets use zero upgrades, and the browser verifier measures both the fixed 1.55 walk-to-sprint ratio and the 2.7-unit Chapter 2 dash through the live Worker.

### 16.4 Deterministic stepping

- `step()` advances an explicit number of fixed ticks without waiting for display frames.
- Real-time animation is paused during exclusive stepped evaluation.
- Maximum ticks per call prevent UI lockups or abuse.
- Observations are returned after stepping.
- Browser and Node harnesses use the same API adapter and simulation.
- Recorded action scripts must reproduce checksums for the declared simulation version.

### 16.5 Agent evaluation metrics

- completion rate;
- ticks/time to completion;
- damage taken;
- accuracy;
- ammo efficiency;
- coins collected;
- secrets found;
- path efficiency;
- illegal/failed action count;
- target-switch frequency;
- deterministic replay verification.

### 16.6 LLM-friendly level design

- Stable object IDs and explicit action schemas.
- Compact, quantized observations.
- Clear objective descriptions.
- No required OCR of HUD text.
- All important visual signals also appear as semantic state when legitimately visible.
- Fixed seeds for benchmark scenarios.
- Tutorial levels for movement, aiming, firing, weapon switching, doors, and boss phases.
- Agent behavior is still constrained by player field of view and game rules.

## 17. Save data, profiles, and replays

### 17.1 Storage

- Browser build: IndexedDB is the primary store for profiles, campaign progress, replays, and larger structured data.
- `localStorage` only for small bootstrap preferences when useful.
- Packaged Tauri builds: a versioned, atomic save file in the platform app-data directory becomes the primary store in Phase 9; IndexedDB may remain a cache/fallback but is not the only durable copy.
- Tauri file access is restricted to the game’s app-data/save directory through narrowly scoped commands; the web/agent API receives no arbitrary path access.
- Export/import is available through a user-selected file dialog and the same validated cross-platform schema.
- No cloud account required.
- Future cloud sync is explicitly out of scope for the initial release.

### 17.2 Saved profile data

- schema version and migration history;
- profile ID and display name;
- unlocked/completed levels;
- per-level medals, statistics, and best replay references;
- total and spendable Quantum Coins;
- weapon and player upgrades;
- cosmetics and achievements;
- settings, input mappings, accessibility, language, and audio mix;
- campaign checkpoint;
- last clean shutdown marker;
- integrity checksum for accidental-corruption detection, not anti-cheat security.

The current profile contract is v14. It stores `sprintMode: "hold" | "toggle"`, the `dash` input binding, bounded `maxHealth` and `maxEnergy` upgrade levels, and independent weapons/robots/environment/interface/voice volume values where zero is a persisted mute. Checksum-valid v9 profiles first migrate reserved upgrade fields under v10 and discard schema-v17 checkpoints that cannot resume under schema v18. The checksum-first v10→v11 presentation migration maps the legacy audio groups into five buses. The v11→v12 migration adds Space as the default dash binding, v12→v13 clears schema-v19 defense checkpoints, and v13→v14 preserves durable progress while clearing only schema-v20 checkpoints that cannot resume with the schema-v21 Shielder mechanic.

### 17.3 Reliability

- Atomic write pattern using new record then active pointer.
- Previous known-good profile retained for recovery.
- Versioned migrations tested against fixtures from every released schema.
- Human-readable JSON export and import with validation.
- Never silently discard a newer unknown save version.
- Reset progress and delete profile require explicit confirmation.

## 18. Cross-platform packaging

### 18.1 Web

- Static Vite build with relative asset paths.
- No runtime network dependency.
- Optional future service worker/PWA only after offline static loading is proven.
- Browser deployment can be hosted on GitHub Pages or Quantum Billing infrastructure.
- The default transferable-`ArrayBuffer` snapshot path needs no cross-origin isolation headers and therefore remains compatible with simple static hosting, including GitHub Pages.
- An optional `SharedArrayBuffer` build requires a verified cross-origin-isolated response policy—normally `Cross-Origin-Opener-Policy: same-origin` plus a compatible `Cross-Origin-Embedder-Policy`—and compatible third-party resources. Do not enable that build on a host that cannot control and test those headers.

### 18.2 Tauri desktop

- Same `dist` frontend embedded through `frontendDist`.
- Windows, Linux, and macOS targets.
- Minimal native commands: platform information, controlled close, optional settings import/export, optional haptics/fullscreen helpers.
- Capabilities restricted by least privilege.
- Content Security Policy enabled before release; do not repeat a permanent `csp: null` configuration.
- If the optional `SharedArrayBuffer` transport is evaluated, its isolation headers, asset-loading implications, and Tauri/WebView security configuration must be tested together on every packaged platform. CSP must remain least-privilege; the optimization is rejected if it requires weakening the release policy.

### 18.3 Android and iOS

- Same game and deterministic core in the system WebView.
- Touch safe areas, orientation, back-button behavior, suspend/resume, audio focus, and memory pressure tested explicitly.
- Android requires Android Studio/SDK/NDK and signing.
- iOS requires macOS, Xcode, provisioning, and Apple signing.
- OffscreenCanvas/WebGL2 worker rendering remains capability-detected; fallback rendering is mandatory.
- Real-device testing is optional future certification evidence and is not part of the active implementation goal; emulator, simulator, browser, and CI evidence remain the current gates.

Tauri documentation references:

- [Tauri overview](https://v2.tauri.app/start/)
- [Tauri prerequisites, including Android and iOS](https://v2.tauri.app/start/prerequisites/)
- [Tauri with Vite and frontendDist](https://v2.tauri.app/start/frontend/vite/)

## 19. Performance budgets

### 19.1 Provisional minimum device matrix

These named floors remain useful future certification targets. For the active implementation goal, development and release-candidate checks use clearly labeled development/CI, emulator, and simulator evidence; missing physical-device evidence blocks neither progress nor goal completion and only prevents an optional “physically certified on this baseline” label.

| Target | Concrete baseline | Runtime floor | Required result |
|---|---|---|---|
| Windows desktop | Intel Core i5-8250U, Intel UHD 620, 8 GB RAM, Windows 11 | Edge/WebView2 124 or newer | 60 Hz simulation; 60 FPS at Low/720p-equivalent internal resolution |
| Android mobile | Google Pixel 6a, 6 GB RAM, Android 14 | Chrome/System WebView 124 or newer | 60 Hz simulation; 60 FPS Low, with declared 30 FPS render fallback if sustained thermal testing requires it |
| iOS mobile | iPhone 12, 4 GB RAM, iOS 17.4 | Safari/WKWebView 17.4 or newer | 60 Hz simulation; 60 FPS Low, with declared 30 FPS render fallback if sustained thermal testing requires it |

Public web browser floors are Chromium-family 124+, Firefox 125+, and Safari 17.4+. Tauri packages use the platform WebView floors above. These are provisional product-support decisions, not statements that older browsers cannot run the game.

### 19.2 Frame, simulation, and memory budgets

Initial budgets are targets to validate in Phase -1, not promises:

- Desktop target: stable 60 FPS minimum; optional 120 FPS rendering while simulation remains 60 Hz.
- Mobile target: stable 60 FPS on supported mid-range devices; 30 FPS quality fallback only if required.
- Whole simulation-tick budget: p95 under 4 ms on the baseline desktop and under 7 ms on target mobile, including authoritative physics, AI, navigation, combat, hazards, objectives, economy, events, and snapshot construction.
- Desktop tick sub-budget: XPBD integration, constraints, and collision resolution use at most 2 ms p95 of the 4 ms tick; all remaining simulation work—including AI/pathfinding, broadphase, projectiles, hazards, objectives, economy, event production, and snapshot serialization—shares the remaining at-most-2 ms p95. Both the total and the component breakdown must pass; unused time in one component is headroom, not permission to hide a failing component.
- Snapshot fan-out budget: snapshot serialization is included in the simulation budget. With both consumers active, render-Worker post-to-receive latency initially targets at most 1.5 ms p95 desktop and 3 ms p95 mobile; during active, unpaused gameplay, main-thread UI/audio snapshot receipt has a looser diagnostic target of at most 5 ms p95 desktop and 8 ms p95 mobile because its task queue is less predictable. A late main-thread snapshot may never delay Render-Worker delivery or push audio timing outside its separate jitter budget. Buffer-pool saturation, coalesced snapshots by consumer, returned-buffer latency, bytes per snapshot, and event-channel backlog are reported.
- Audio event timing: tick-to-audio presentation error initially targets at most 10 ms p95 desktop and 20 ms p95 mobile. The audio scheduler consumes the ordered event stream with bounded lookahead independently of UI snapshot receipt and falls back to the newest spatial transform when necessary.
- Cross-modal rhythm sync: the audible onset and displayed pose/beat indicator for the same beat or attack event must differ by at most 15 ms p95 on every baseline device. Absolute latency may be calibrated, but independently passing audio and render budgets does not excuse greater audio-visual separation.
- Event transport budget per consumer: the pre-spike starting configuration is provisional—producer and consumer queues each cap at 256 records or 64 KiB, a batch caps at 64 records or 16 KiB, and the credit window is one unacknowledged batch. Phase -1 measures peak and p99 events per tick, bytes per tick, acknowledgement round-trip, and backlog during a worst-case pulse-bomb-plus-coordinated-squad burst, then approves queue/batch caps with documented headroom and a fixed credit window of one through four. The nominal approved stress run permits no state-critical resynchronizations; presentation-only drops, epoch changes, high-watermarks, acknowledgement latency, in-flight credits, and peak queue bytes are measured. Injected long-stall tests may force resync but must prove bounded memory and uninterrupted simulation. Changing these presentation-only settings updates the transport configuration/benchmark manifest and reruns transport tests; it does not change the simulation schema or invalidate replays.
- Main-thread UI/input/audio scheduling: under 3 ms typical frame.
- GPU frame: under 12 ms at selected resolution for 60 FPS headroom.
- Draw calls: target under 80, preferably under 40 through instancing.
- Concurrent active XPBD robots: hard campaign cap of 24, all using two substeps and eight constraint iterations per substep.
- Render detail may decrease with distance or quality because it cannot affect authoritative state; physics/AI detail may not.
- Particle pool: hard capacity with graceful dropping.
- Initial download: target under 50 MB, dominated by approved audio and fonts.
- Runtime memory: target under 250 MB desktop and under 180 MB mobile after a chapter transition.
- Zero unbounded arrays, timers, audio nodes, GPU buffers, or event listeners across level reloads.

### 19.3 Quality tiers

Quality tiers control presentation only:

- Low: reduced pixel ratio, blob shadows only, fewer particles, fewer dynamic lights, reduced robot visual detail.
- Medium: full resolution cap, richer particles, selected shadows.
- High: higher pixel ratio cap, optional shadow maps/bloom, maximum effects.
- Auto: chooses initial tier from capabilities and measured frame time, then changes conservatively.

No quality tier changes simulation tick rate, substeps, solver iterations, active-robot cap, collision shapes, AI schedule, attack timing, spawn timing, or replay state.

## 20. Testing strategy

### 20.1 Unit tests

- PRNG and seed derivation.
- Vector/matrix math.
- XPBD constraints and collision cases.
- fixed-step accumulator.
- weapon cooldown, damage, ammunition, and upgrade rules.
- robot attacks and state machines.
- coin calculations.
- save migrations.
- observation/action schemas.

### 20.2 Determinism tests

- Same seed and command stream produce the same checksum.
- Different render frame slicing does not alter simulation.
- Worker and direct Node execution agree.
- Replay survives pause/resume and checkpoint restore.
- Entity iteration is stable after creation/removal.
- All 36 campaign definitions produce repeatable starting states.

### 20.3 Maze tests

- Reachability, key/lock order, spawn validity, navigation connectivity.
- No required pickup inside walls.
- No exit before required objective unless intentionally designed.
- Generated variations stay within room count and path-length budgets.
- Property/fuzz tests over large seed sets.

### 20.4 Browser/render tests

- WebGL2 context startup and graceful unsupported message.
- Shader compilation on target GPU/WebView families.
- OffscreenCanvas path and main-thread fallback.
- Context loss/restoration.
- Visual snapshots for palettes, robot silhouettes, HUD, and effects.
- Injected render/main-consumer stalls prove `producerOwned >= 1 && inFlight <= 2`, ticks never stall, allocation stays bounded, and the newest coalesced snapshot is delivered when a slot returns.
- Independently delayed/reordered snapshot and event messages prove tick correlation, exactly-once event IDs, skipped-snapshot fallback transforms, Render-Worker independence, the absolute audio-jitter limit, and at most 15 ms p95 audio-visual separation for the same beat/attack.
- Long consumer stalls prove producer and consumer event queues, configured in-flight credits, and browser message backlog remain bounded; presentation-only overflow drops oldest-first, state-critical overflow advances `eventEpoch`, and the next self-contained snapshot produces a correct resync without replaying stale event bursts.
- Pointer Lock, keyboard, mouse, touch, gyro if enabled, and gamepad.
- Desktop/mobile viewport and safe-area tests.
- Network-blocked offline load.

### 20.5 Gameplay tests

- Every level can start, checkpoint, complete, replay, and unload.
- Every campaign level declares one or more agent-validation runs with a seed, difficulty/assist profile, validation mode, and maximum tick budget.
- Every ordinary released level must pass a live baseline-agent run on Standard. A boss or named elite level may instead use a reviewed reference replay when the general planner cannot express bespoke phase mechanics; this exception is explicit in level data and code review.
- Story, Hard, and supported assist combinations receive static reachability/resource analysis for every level plus live-agent or reference-replay spot checks on the named benchmark subset. The plan does not claim that one Standard run proves every difficulty/assist combination.
- CI uses the production simulation for every run. Failure to complete within the declared tick budget, an illegal action, a stuck-state timeout, or checksum drift on the frozen checksum subset fails the build.
- Agent completion proves reachability and regression safety, not human fun or balance; human playtesting remains required for pacing, clarity, and enjoyment.
- Every boss phase is reachable and defeatable.
- Every weapon can damage intended targets.
- Difficulty/assist settings affect only declared variables.
- Coin and upgrade economy cannot soft-lock progression.
- Pause freezes gameplay timers and projectiles.
- Save/load does not duplicate rewards.

### 20.6 LLM tests

- Observation schema and quantization.
- Legal and illegal actions.
- Visibility boundary does not leak hidden enemies.
- Raw movement/look/fire control.
- High-level actions translate through normal rules.
- Deterministic stepping and maximum-step limit.
- A scripted baseline agent completes tutorial levels and the campaign-validation harness can execute every released level without rendering.
- Reference replays carry simulation schema, policy/replay format, level-data, and balance hashes. A change to any simulation-affecting input invalidates the replay until its named owner reviews and re-records it; the updating pull request explains the cause and includes before/after results.
- Agent API cannot access arbitrary browser, OS, filesystem, or Tauri capabilities.

### 20.7 Tauri/release tests

- Desktop launch and offline play.
- Installer launch/uninstall smoke tests.
- Android emulator play; physical-device play is optional later evidence.
- iOS simulator play when signing hardware is available; physical-device play is optional later evidence.
- Suspend/resume, rotation, audio interruption, low-memory recovery.
- Save compatibility across web and packaged builds where export/import is supported.

### 20.8 CI performance gates

- `perf:sim` runs the authoritative simulation without rendering using a fixed stress seed, 24 active robots, two substeps, eight solver iterations, and 6,000 measured ticks after warm-up.
- Phase -1 runs the identical frozen `perf:sim` scenario on both the named baseline desktop and the pinned CI runner, but records independent distributions rather than assuming one scalar converts different workload shapes between CPUs. The checked-in benchmark manifest stores hardware/runtime metadata, workload and simulation schema hashes, warm-up/sample counts, whole-tick and named-component median/p95 costs, total duration, and approved runner margins.
- When available, the baseline desktop can provide optional absolute certification: its measured whole-tick p95 must remain at or below 4 ms and its XPBD/collision p95 at or below 2 ms. Android and iOS hardware can similarly certify their declared absolute budgets. These optional labels are never inferred from CI hardware and are not required by the active implementation goal.
- The pinned runner is a regression gate against its own Phase -1 reference. CI fails if whole-tick or named-component median regresses by more than 20%, if a p95 exceeds that runner component's recorded p95 plus its reviewed noise margin, or if total duration exceeds the runner-specific hard threshold. No cross-machine calibration factor is used.
- Changing runner or baseline hardware, OS/runtime version, power policy, frozen workload, or benchmark instrumentation invalidates the affected reference. Implementation and release-candidate work proceed when named devices are unavailable, provided results identify their actual environment and no optional physical-certification claim is made. Performance-sensitive simulation/serialization changes add runner-local runs rather than replacing that cadence. Reference or margin changes require a pull-request explanation and before/after measurements.
- Ordinary hosted CI also runs a shorter regression smoke but does not pretend noisy shared-runner timing is a hardware certification.
- Separate browser smoke records render FPS, GPU time where available, worker snapshot latency, memory, and draw calls on the device matrix.
- Performance-baseline changes require a pull-request explanation and before/after measurements; developers may not silently raise thresholds.

## 21. Implementation phases and gates

No phase should begin by building all 36 levels. Prove the engine and a representative vertical slice first.

### Phase -1: 24-robot feasibility spike

This disposable spike happens before performance budgets or production architecture are approved. It may be kept on a separate branch and is not the production engine.

Deliverables:

- bare-page TypeScript prototype with 24 articulated XPBD robots;
- 60 Hz fixed simulation, two substeps, and eight iterations per substep;
- raw WebGL2 sphere/capsule instancing sufficient only to measure cost;
- representative deterministic AI/pathfinding, broadphase, projectile/hazard, objective/economy/event, and snapshot workloads rather than an XPBD-only tick;
- simulation-only and combined simulation/render measurements, with whole-tick and component timings proving XPBD/collision at or below 2 ms p95 and all other tick work within the remaining 2 ms p95 on the desktop baseline;
- transferable-buffer snapshot construction and two-consumer fan-out measurements covering serialization cost, bytes, post-to-receive p95 latency, returned-buffer latency, pool misses, coalescing, and ordered-event backlog;
- bounded-event transport stress covering the worst-case pulse-bomb-plus-coordinated-squad burst, peak/p99 event records and bytes per tick, acknowledgement round-trip, candidate one-to-four-batch credit windows, presentation drops, state-critical epoch resync, and long consumer stalls without simulation blockage or memory growth; the report selects fixed approved caps/window with measured headroom;
- same-event audio onset versus rendered pose/beat-indicator measurements proving at most 15 ms p95 separation, alongside the absolute audio and render timings;
- measurements on all three provisional baseline devices where hardware is available;
- the identical frozen workload on the pinned CI runner, plus the baseline desktop when optionally available, producing runner-local whole-tick/component reference distributions, noise margins, and hard thresholds;
- benchmark report covering tick median/p95 and component breakdown, render frame time, worker messaging, snapshot fan-out, event transport, absolute and relative audio-visual timing, memory, thermal behavior, and failure modes.

Exit gate:

- the representative fixed 24-robot workload must meet deterministic, bounded-transport, and development regression checks before Phase 0; unavailable physical-device measurements create no open implementation work, and production must not rely on adaptive solver iterations.

### Phase 0: approval and repository foundation

Deliverables:

- approve this document and resolve open decisions;
- approve license/trademark policy;
- initialize TypeScript/Vite test tooling;
- establish CI, formatting, linting, and contribution rules;
- create asset provenance templates.

Exit gate:

- architecture and game scope approved;
- repository builds an empty offline shell;
- tests run in CI;
- no unapproved third-party assets.

### Phase 1: deterministic simulation kernel

Deliverables:

- fixed-step clock;
- seeded PRNG;
- command/event/state model;
- serialization and checksums;
- Worker and Node execution adapters.

Exit gate:

- same scripted run produces identical checksums independent of render timing.

### Phase 2: XPBD Davel prototype

Deliverables:

- articulated robot particles and constraints;
- ground/wall collision;
- one dance motor;
- impulses, stagger, fall, and recovery;
- headless physics tests.

Exit gate:

- robot preserves the original elastic appeal in 3D at stable cost.

### Phase 3: raw WebGL2 renderer

Deliverables:

- context/shaders/matrices;
- procedural sphere and capsule geometry;
- instanced robot rendering;
- camera, floor, lighting, fog, and shadows;
- context-loss recovery and quality controls.

Exit gate:

- representative robot count meets performance budget on baseline desktop and mobile hardware.

### Phase 4: player, input, and first weapon

Deliverables:

- first-person capsule movement;
- desktop keyboard/mouse and Pointer Lock;
- mobile touch controls;
- pulse gun, hit detection, damage, recoil, and effects;
- pause and accessibility motion controls.

Exit gate:

- moving, aiming, shooting, and hitting a dancing robot feel responsive on desktop and mobile.

### Phase 5: maze vertical slice

Deliverables:

- maze graph/templates/generation/validation;
- navigation and first AI;
- pickups, doors, keys, checkpoint, exit;
- one complete level using original/provisional sounds.

Exit gate:

- a new player can finish Level 1 from launch to results without developer tools.

### Phase 6: combat vertical slice

Deliverables:

- four weapons;
- four robot archetypes including Firemouth;
- coin economy and initial upgrades;
- audio layering and room response;
- one elite and one boss;
- replay capture/playback.

Exit gate:

- Levels 1–10 form a coherent, balanced first chapter.

### Phase 6.5: content-production tooling

Deliverables:

- schema-aware level editor for internal use;
- encounter-graph visualizer with keys, locks, checkpoints, triggers, and critical path;
- deterministic maze preview and validation report;
- dance-preset previewer with beat/attack/vulnerability timeline;
- robot-wave and coin-economy balance harness;
- one-command agent solvability run with replay inspection;
- diff-friendly canonical level serialization;
- documentation and templates for content designers;
- assigned ownership for choreography/music systems and an audio/dance production schedule.

Exit gate:

- after training, a content designer can author, validate, agent-test, and submit a normal Chapter 1-quality level in less than one working day, excluding new bespoke art/audio;
- invalid schemas, unreachable graphs, missing localization, missing provenance, or failed agent tick budgets block export.

### Phase 7: LLM interface

Deliverables:

- public API, schema, observations, low/high-level actions;
- headless and real-time modes;
- sample harness and baseline scripted agent;
- campaign QA runner that validates every released level against its declared tier, runs, seeds, difficulty/assist profiles, modes, and maximum tick budgets;
- live Standard baseline-agent coverage for ordinary levels and a reviewed, versioned reference-replay path for boss/named-elite exceptions;
- replay recorder/inspector, canonical replay format, simulation/level/balance hashes, and invalidation detection;
- six-level frozen checksum benchmark set spanning the campaign, with completion/tick gates for all other levels;
- named replay-maintenance ownership and a pull-request workflow for re-recording invalidated references after simulation, level, or balance changes;
- visibility/security tests and evaluation metrics.

Exit gate:

- external harness can reset, observe, act, step, replay, and complete tutorial scenarios using the production simulation; the full campaign runner enforces the declared live-agent/reference-replay tiers and detects stale replay dependencies.

### Phase 8: persistence and progression

Deliverables:

- versioned profile save;
- medals/statistics/upgrades;
- atomic recovery and export/import;
- save migration fixtures;
- unconditional save-schema, chapter, and stable level-ID reservations through Level 36.

Exit gate:

- progress survives restart, version migration, retry, and packaged builds without reward duplication.

### Phase 9: Tauri desktop and mobile shell

Deliverables:

- Tauri v2 configuration and minimum capabilities;
- Windows/Linux/macOS builds where hardware permits;
- Android project and test build;
- iOS project/build when Mac signing environment is available;
- suspend/resume and fullscreen behavior;
- atomic file-backed saves in the platform app-data directory, migration fixtures, corruption recovery, and user-driven export/import.

Exit gate:

- same offline web assets run correctly in selected packaged targets, and progress survives restart and WebView-storage clearing because the packaged save file is authoritative.

### Phase 10: complete campaign content

Deliverables:

- Levels 11–36;
- remaining core weapons and major archetypes;
- chapter bosses and palette/effect families;
- expanded accessibility and localization.

Exit gate:

- all 36 campaign levels are complete, fun, balanced, and produced through the repeatable content pipeline.

### Phase 11: campaign integration and final balance

Deliverables:

- full-campaign progression, economy, pacing, and difficulty review;
- story conclusion and Level 36 ending;
- complete music/dance system and secrets for the 36 released levels.

Exit gate:

- all 36 levels pass automated solvability, performance, completion, and content review.

### Phase 12: polish and release

Deliverables:

- final audio mix and asset audit;
- optimization and device matrix;
- onboarding, store assets, credits, documentation;
- security review, CSP, privacy statement;
- signed packages and open-source release.

Exit gate:

- release checklist passes with no critical issues and all distributed assets have verified licenses.

## 22. Estimated scope

Very rough planning range after design approval. The estimates assume a small focused team, not one person doing every discipline sequentially:

- Vertical slice through Level 10: approximately 10–16 person-months depending on developer graphics/audio experience and target-device requirements.
- Full polished 36-level release: approximately 14–24 person-months, including content, testing, audio, localization, and packaging.
- Planning team assumption: 3–5 contributors covering gameplay/graphics, tools/content design, choreography/music/audio, and QA/release, with roles combined only where experience supports it.
- A solo full-time developer should interpret 14–24 person-months literally as roughly 1.2–2 years before contingency, platform certification, and part-time specialist help.
- Choreography/procedural music is an explicitly staffed content discipline. Ownership includes the dance grammar, 36 presets, beat/attack timelines, procedural sequencer, mix review, and accessibility equivalents.

The 36-level goal remains a substantial content-production challenge. Data-driven room templates, dance grammar, robot modifiers, and automated validation are required to keep it feasible.

## 23. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Raw WebGL2 engine scope expands | Schedule and stability | Implement only game-required features; enforce phase gates |
| 36 levels become repetitive | Player retention | Four distinct chapter identities, objective variety, modifiers, secrets, bosses, unique dance presets |
| 36 levels take too long to author | Release delay | Data schemas, reusable encounter grammar, automated validation, ship only when polished |
| XPBD robots become unreadable | Combat fairness | Pose constraints, silhouette tests, capped impulses, recovery states |
| Physics cost is high on mobile | Frame drops | Phase -1 spike, hard 24-active-robot cap, staged waves, fixed solver budget, render-only LOD, instancing |
| Worker/WebView behavior differs | Platform bugs | Capability detection, main-thread renderer fallback, real-device gates |
| “Realistic” sounds conflict with funny tone | Inconsistent identity | Realistic physical layers plus stylized robot/music layers; review audio bible |
| Third-party audio license is unclear | Distribution/legal risk | CC0-first policy, provenance manifest, hash every source, reject ambiguous assets |
| Determinism drifts across runtimes | Broken replays/LLM eval | Fixed ordering, CPU-only authority, checksums, quantization/LUTs as needed |
| Browser and headless games diverge | Invalid tests/agents | One simulation package; architectural test forbids duplicate gameplay implementations |
| Difficulty becomes health inflation | Boring combat | Increase combinations, formation intelligence, hazards, and timing before health |
| Color-dependent recognition excludes players | Accessibility | Unique shapes, icons, animation, sounds, and color-blind modes |
| Company branding is reused misleadingly | Trademark confusion | `TRADEMARKS.md`, clear official/fork wording, separate logo permissions |

## 24. Analytics and privacy

Initial release should require no analytics and no account. All progress remains local.

If telemetry is considered later:

- explicit opt-in;
- plain-language disclosure;
- no recording of raw input, voice, personal files, or LLM prompts;
- aggregate performance/crash metrics only;
- easy disable/delete controls;
- separate design and privacy review before implementation.

## 25. Release scope and definition of done

### 25.1 Release-scope decision

The owner selected one complete 36-level campaign on 20 August 2026. There are no planned post-Level-36 chapters in the scope of this product or implementation goal. No release may be marketed as complete until all 36 levels pass the same automated, agent, performance, accessibility, asset, and human-playtest gates.

Phase 8 implements save continuity and stable ID reservations through Level 36. Content beyond that envelope requires a future product decision and a reviewed schema migration rather than an implied roadmap promise.

### 25.2 Definition of done for the complete 36-level campaign

- 36 completable, reviewed campaign levels.
- Four polished weapons with distinct roles.
- The implemented core robot archetypes, rare modifiers, named elites, three chapter bosses, and the Level 36 final endurance encounter.
- Unique data-defined dance preset and palette treatment for every level.
- Deterministic fixed-step simulation shared by human play, replay, tests, and LLM agents.
- Raw WebGL2 renderer with no Three.js.
- Worker simulation and tested OffscreenCanvas enhancement/fallback.
- Desktop keyboard/mouse, mobile touch, and optional gamepad support.
- Versioned persistent progress, upgrades, medals, and replay support.
- Offline Vite web build.
- Tauri packages for the selected release platforms.
- LLM reset/observe/act/step/replay API and sample harness.
- Accessibility baseline and approved locales.
- Performance budgets met in the declared reproducible development/CI matrix; physical-device certification remains optional evidence.
- All assets have recorded provenance and compatible licenses.
- Open-source license, contribution documentation, credits, and trademark policy approved.
- No copied commercial-game assets or runtime network dependencies.

## 26. Review decisions and blocking phases

Not every product decision blocks the feasibility spike. A decision must be resolved before the phase shown; later decisions may be discussed earlier without delaying unrelated engineering.

| # | Decision | Must be resolved before |
|---:|---|---|
| 1 | Approve the title/subtitle. | Phase 10 public branding/release work |
| 2 | Approve the family-safe mechanical-violence tone. | Phase 0 content and contribution rules |
| 3 | Confirm whether defeated robots are described as destroyed, deactivated, or cleansed. | Phase 0 terminology/localization foundation |
| 4 | Approve TypeScript as the source language. | Phase 0 repository tooling |
| 5 | Decide whether jumping is present or movement uses sprint plus dash only. | Phase 4 player controller |
| 6 | Confirm initial languages; recommendation is English and Arabic first. | Phase 10 localization completion |
| 7 | Decide whether gamepad support is required for the first public release. | Phase 10 release scope |
| 8 | Approve the four chapter identities and 36-level catalog. | Phase 6.5 content-production tooling |
| 9 | Approve the four-weapon scope and upgrade philosophy. | Phase 6 combat vertical slice |
| 10 | Approve the no-microtransaction coin economy. | Phase 6 combat/economy slice |
| 11 | Decide the first supported desktop/mobile release platforms. | Phase 9 packaging |
| 12 | Approve the proposed MIT code license and asset/trademark policy. | Phase 0 repository/public contribution setup |
| 13 | Identify the official Quantum Billing logo, robot references, colors, and permission owner. | Phase 10 public branding/release assets |
| 14 | Approve use of shortlisted CC0 sound sources or commission original replacements. | Phase 6 production audio work |
| 15 | Decide whether alternate endings are version 1.0 or a later update. | Phase 10 content lock |
| 16 | Confirm deterministic hitscan for the pulse gun rather than a player projectile. | Phase -1 representative workload |
| 17 | Confirm simulation schema version 1 uses 60 Hz, two substeps, and exactly eight XPBD iterations per substep on every device. | Phase -1 feasibility spike |
| 18 | Confirm the simulation-only Worker topology, shared renderer hosting, bounded transferable-buffer fan-out, and optional-isolated `SharedArrayBuffer` policy. | Phase -1 feasibility spike |
| 19 | Approve the hard cap of 24 concurrently active full-physics robots and deterministic staged waves for larger encounters. | Phase -1 feasibility spike |
| 20 | Approve the provisional minimum device/browser matrix in Section 19 or supply replacement hardware. | Phase -1 measurement run |
| 21 | Approve Phase 6.5 internal content tooling and its one-working-day authoring gate. | Phase 6.5 tooling implementation |
| 22 | Owner-approved complete 36-level scope; no post-Level-36 chapters are promised. | Resolved 2026-08-20 |
| 23 | Confirm agent-enabled builds use isolated progress and normal production builds do not expose mutation-capable agent methods. | Phase 7 LLM interface |
| 24 | Assign named ownership or contracted support for choreography, procedural music, sound design, content tools, replay maintenance, and device QA. | Phase 0 staffing/ownership gate |

## 27. References and lessons used

### Original interactive reference

- [FacePrintLab Catch Davel](https://www.faceprintlab.com/catch-davel.html): reference for articulated point/link bodies, procedural dance motion, rounded limb rendering, pointer interaction, worker rendering, OffscreenCanvas enhancement, and main-thread fallback. Its code and presentation should be treated as inspiration/reference; confirm its reuse license before copying any implementation text.

### Cross-platform and LLM reference repository

- Local sibling repository: `../quantum-garden-game/`.
- Useful patterns to retain:
  - Vite offline build;
  - local assets;
  - Tauri v2 packaging and release workflows;
  - versioned persistence concepts;
  - input abstraction;
  - browser LLM hook and Playwright harness;
  - accessibility and viewport smoke tests.
- Important issue to avoid:
  - its shipped browser `main.js` and modular headless simulation currently operate as parallel implementations. Catch Davel must connect the production renderer and input directly to the one authoritative deterministic simulation.

### Technical references

- [WebGL2RenderingContext — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
- [OffscreenCanvas — MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)
- [HTMLCanvasElement.transferControlToOffscreen — MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen)
- [Web Workers API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [XPBD paper](https://matthias-research.github.io/pages/publications/XPBD.pdf)
- [Tauri v2 documentation](https://v2.tauri.app/)
- [Vite documentation](https://vite.dev/guide/)
- [TypeScript documentation](https://www.typescriptlang.org/docs/)

### Audio and licensing references

- [Kenney licensing support](https://kenney.nl/support)
- [Kenney Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds)
- [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds)
- [Kenney Digital Audio](https://kenney.nl/assets/digital-audio)
- [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds)
- [Freesound licensing FAQ](https://freesound.org/help/faq/)
- Individual CC0 candidates listed in Section 14.

## 28. Immediate next step after approval

After this plan is reviewed and the decisions tagged “Phase -1” in Section 26 are resolved, technical work begins with the disposable Phase -1 feasibility spike. Each remaining decision must be resolved by its own listed phase gate. Phase 0 may begin after deterministic, bounded-transport, and development-regression evidence is recorded; unavailable physical devices defer platform certification but do not stop implementation. The first production visual milestone is one articulated Davel dancing and reacting to impulses in a simple test room. The first product milestone is a polished ten-level Chapter 1—not a rushed generation of all 36 levels.

## Appendix A. Level data schema contract

This appendix defines the content/engine boundary that must be approved before Phase 5. It is a design contract, not an implementation. The eventual TypeScript types, JSON Schema, editor forms, validators, canonical serializer, campaign tests, and agent harness must all represent the same fields and invariants.

### A.1 Schema principles

- Level data is declarative; it cannot contain executable JavaScript callbacks.
- Every record declares `schemaVersion` and uses explicit stable IDs.
- Campaign content is serialized canonically so code review shows meaningful diffs.
- Unknown fields fail validation during development instead of being silently ignored.
- Runtime defaults are permitted only when declared in the schema documentation and materialized by the editor before release export.
- Every random choice is derived from the declared level seed and a named deterministic RNG stream.
- Localized text is referenced by keys; level data does not duplicate visible prose across languages.
- Asset references use manifest IDs, never arbitrary URLs or filesystem paths.
- Simulation-affecting values are finite numbers with declared units and bounds.
- Quality-tier or device-specific simulation overrides are forbidden.

### A.2 Root `LevelDefinition`

Reusable content uses one binding shape rather than alternating silently between an inline object and a bare string ID:

```text
PresetBinding<T>:
  presetId: string
  override?: Partial<T>
```

`presetId` resolves through the versioned content manifest. `override` is reserved for reviewed bespoke cases and may contain only fields the referenced preset schema marks overridable; arbitrary inline objects and unknown keys fail validation. Release export records the resolved preset version and content hash and materializes the canonical effective data used by simulation/replays, so a later preset edit cannot silently reinterpret an old replay. Arrays of bindings retain stable declared order. This rule applies equally to globally shared presets and approved level-scoped manifest records.

| Field | Type | Required | Constraints and meaning |
|---|---|---:|---|
| `schemaVersion` | integer | Yes | Starts at `1`; controls validation and migration |
| `id` | string | Yes | Stable pattern `level-001` through `level-036`; never reused |
| `number` | integer | Yes | `1..36`; must agree with `id` |
| `chapterId` | string | Yes | Stable chapter reference such as `chapter-01` |
| `nameKey` | string | Yes | Localization key for the level name |
| `briefingKey` | string | Yes | Localization key for the short briefing |
| `seed` | string | Yes | Fixed campaign seed; custom/replay seed may override only in declared modes |
| `palette` | `PresetBinding<PaletteSpec>` | Yes | Manifest preset plus optional reviewed override; visual values only |
| `maze` | `MazeSpec` | Yes | Encounter graph and generation limits |
| `objectives` | `ObjectiveSpec[]` | Yes | At least one primary objective; stable order |
| `encounters` | `EncounterSpec[]` | Yes | Spawn triggers, waves, room ownership, completion rules |
| `dance` | `DanceLevelSpec` | Yes | Default choreography/beat contract for the level |
| `difficulty` | `PresetBinding<DifficultySpec>` | Yes | Explicit bounded multipliers and timing values |
| `economy` | `PresetBinding<EconomySpec>` | Yes | Pickup and reward budgets |
| `checkpoints` | `PresetBinding<CheckpointSpec>[]` | Yes | Stable manifest records; may be empty only for an approved short level |
| `audio` | `PresetBinding<AudioLevelSpec>` | Yes | Music graph, ambience, and reverb IDs |
| `mastery` | `PresetBinding<MasterySpec>[]` | Yes | Optional medal/challenge rules; may be empty |
| `agentValidation` | `AgentValidationSpec` | Yes | Tiered live-agent/reference-replay runs and budgets |
| `performance` | `PerformanceSpec` | Yes | Hard content budgets, including active robot cap |
| `story` | `StorySpec` | No | Intro/outro/log references with skippable flags |
| `tags` | string array | Yes | Search/filter tags from a controlled vocabulary |

### A.3 `PaletteSpec`

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Stable palette preset ID |
| `background` | RGB hex string | Opaque six-digit color |
| `fog` | RGB hex string | Opaque six-digit color |
| `floor` | RGB hex string | Opaque six-digit color |
| `walls` | RGB hex array | One to eight colors |
| `accents` | RGB hex array | One to eight colors |
| `hazard` | RGB hex string | Must pass contrast/readability validation |
| `objective` | RGB hex string | Must remain distinguishable from hazard |
| `colorBlindProfile` | enum | Approved profile such as `shape-first`, `deuteranopia-safe` |

Palette values affect presentation only. Robot archetypes retain shape/icon/audio identifiers even when level palette treatment shifts their shades.

### A.4 `MazeSpec`

| Field | Type | Constraints |
|---|---|---|
| `templateSetId` | string | References an approved room/corridor template set |
| `generatorVersion` | integer | Pins deterministic generator behavior |
| `criticalPathRooms` | integer range | Minimum/maximum inclusive, positive |
| `optionalRooms` | integer range | Includes secrets and reward rooms |
| `maxBranchDepth` | integer | Bounded by chapter complexity |
| `secretCount` | integer | Must agree with mastery rules that count all secrets |
| `entranceNodeId` | string | Existing graph node |
| `exitNodeId` | string | Existing graph node and not the entrance |
| `nodes` | `MazeNodeSpec[]` | Stable node IDs, room template roles, encounter references |
| `edges` | `MazeEdgeSpec[]` | Directed/undirected links, locks, phase state, traversal rules |
| `keys` | `KeySpec[]` | Stable IDs and placement nodes |
| `hazards` | `HazardSpec[]` | Deterministic timing and collision references |
| `generationAttempts` | integer | Fixed upper bound; failure is explicit |
| `validationProfile` | string | Selects approved solvability rules, never arbitrary code |

`MazeNodeSpec` declares node ID, role, allowed template tags, size class, encounter IDs, pickup IDs, checkpoint ID, story IDs, and whether it belongs to the critical path. `MazeEdgeSpec` declares its endpoints, directionality, lock/key requirement, door type, traversal cost, and state-transition trigger.

### A.5 `ObjectiveSpec`

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Unique within level |
| `type` | enum | `deactivate`, `recover-keys`, `shutdown`, `survive`, `hunt`, `defend`, `escape`, `boss` |
| `required` | boolean | At least one required objective per level |
| `titleKey` | string | Localized HUD label |
| `targetIds` | string array | References encounters/entities/nodes as appropriate |
| `targetCount` | integer or null | Required for count objectives |
| `durationTicks` | integer or null | Required for timed objectives; never seconds/floats |
| `dependsOn` | string array | Objective IDs forming an acyclic dependency graph |
| `completionMode` | enum | `all`, `any`, `count`, `timer`, `reach` |
| `markerPolicy` | enum | `always`, `discovered`, `nearby`, `none` |

### A.6 `EncounterSpec` and spawn waves

Each encounter declares:

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Unique stable encounter ID |
| `roomNodeId` | string | Existing maze node |
| `trigger` | enum/spec | `on-enter`, `on-objective`, `on-interact`, `on-tick`, `on-wave-complete` |
| `triggerRef` | string or null | Referenced objective/entity/wave where required |
| `arenaLock` | boolean | Whether connected combat doors lock during encounter |
| `waves` | `WaveSpec[]` | At least one wave |
| `completion` | enum | `all-defeated`, `timer`, `target-defeated`, `objective-event` |
| `rewardId` | string or null | References economy reward bundle |
| `checkpointOnComplete` | string or null | Existing checkpoint ID |

Each `WaveSpec` declares:

- stable `id`;
- deterministic start condition;
- `SpawnGroupSpec[]`;
- maximum concurrently active robots contributed by the wave;
- inter-group delay in ticks;
- optional music/dance transition ID;
- completion condition;
- fallback/error policy if a spawn point is invalid.

Each `SpawnGroupSpec` declares:

- archetype ID;
- count;
- approved modifier IDs;
- spawn-point set or deterministic placement rule;
- level-default or override dance preset ID;
- fixed AI profile ID;
- fixed reward profile ID;
- deterministic RNG stream name;
- elite/boss flag;
- accessibility icon/silhouette verification reference.

Across all simultaneously live waves, active robot count must never exceed `performance.maxActiveRobots`, which is at most 24. A later wave is queued rather than represented by simplified active physics.

### A.7 `DanceLevelSpec`

| Field | Type | Constraints |
|---|---|---|
| `presetId` | string | Unique campaign dance preset for this level |
| `grammarVersion` | integer | Pins deterministic dance grammar behavior |
| `bpm` | integer | Approved accessible range; validated against reaction windows |
| `timeSignature` | enum | Approved values such as `4/4`, `3/4`, `7/8` |
| `barsPerPhrase` | integer | Positive and bounded |
| `footPatternId` | string | Approved pattern manifest ID |
| `torsoPatternId` | string | Approved pattern manifest ID |
| `armPatternId` | string | Approved pattern manifest ID |
| `headAccentId` | string | Approved pattern manifest ID |
| `pathPatternId` | string | Approved movement-path ID |
| `attackBeats` | beat-index array | Sorted, unique, inside phrase |
| `vulnerableBeats` | beat-index array | Sorted, unique, inside phrase |
| `transitionIds` | string array | Approved transitions; deterministic conditions live in data |
| `visualIntensity` | bounded number | Presentation hint only |
| `reducedMotionPresetId` | string | Required accessibility equivalent with identical combat timing |

Authoritative attacks use tick-resolved beat metadata derived from the fixed simulation clock. Audio latency or render frames never decide attack timing.

### A.8 `DifficultySpec`

All values are explicit finite numbers within schema bounds:

- player incoming-damage multiplier;
- robot health multiplier;
- robot movement-speed multiplier;
- projectile-speed multiplier;
- reaction/telegraph ticks;
- spawn delay ticks;
- resource multiplier;
- aim-assist defaults by supported difficulty;
- boss phase thresholds;
- maximum simultaneous attack tokens;
- AI profile IDs;
- fixed rules for Story, Standard, Hard, and optional custom assists.

Difficulty cannot override simulation tick, substeps, solver iterations, collision geometry, active-robot cap, or entity update schedule.

### A.9 `EconomySpec`

| Field | Type | Constraints |
|---|---|---|
| `baseCoinBudget` | integer | Expected normal-play award before mastery |
| `rewardBundles` | record | Stable IDs mapping to deterministic rewards |
| `pickupBudget` | record | Health, armor, cells, bombs, laser energy |
| `comboRulesId` | string | Versioned shared rule set |
| `checkpointBanking` | enum | Approved banking behavior |
| `masteryCoinCap` | integer | Prevents farming bugs |
| `expectedSpendBand` | integer range | Balance-tool warning range, not runtime enforcement |

The balance harness verifies that required combat does not demand more ammunition than the level can provide under declared accuracy assumptions.

### A.10 Checkpoints, audio, mastery, and story

`CheckpointSpec` declares a stable ID, trigger node/event, full-state serialization policy, banked rewards, respawn anchor, encounter reset list, and one-way state transitions. A checkpoint cannot capture an already unwinnable key/ammo/objective state.

`AudioLevelSpec` declares original music graph ID, tempo source, ambience asset IDs, room-reverb preset map, boss transition cues, and accessibility cue map. It contains no raw URL and no unverified asset file.

`MasterySpec` declares ID, localized text key, rule enum, threshold, comparison, reward, and whether assists invalidate the medal. Mastery rules read emitted gameplay metrics; they do not alter combat.

`StorySpec` declares skippable intro/outro IDs, log IDs, dialogue cue IDs, and localization keys. Skipping story never skips authoritative objective setup.

### A.11 `AgentValidationSpec`

The root specification declares the level's validation tier and an explicit list of runs:

| Field | Type | Constraints |
|---|---|---|
| `tier` | enum | `ordinary`, `boss`, or `named-elite`; controls permitted validation modes |
| `runs` | `AgentValidationRunSpec[]` | At least one; unique stable run IDs |
| `owner` | string | Team/maintainer responsible for policy and replay upkeep |

Each `AgentValidationRunSpec` declares:

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Stable run ID unique within the level |
| `mode` | enum | `live-agent` or `reference-replay` |
| `policyId` | string or null | Required for `live-agent`; versioned baseline planner ID |
| `policyVersion` | integer or null | Required for `live-agent` and pinned for reproducible CI |
| `referenceReplayId` | string or null | Required for `reference-replay`; null for live runs |
| `seed` | string | Normally equals the fixed campaign seed |
| `difficulty` | enum | Story, Standard, Hard, or an approved custom profile |
| `assistProfileId` | string or null | Explicit assist combination; null means difficulty defaults |
| `maxTicks` | integer | Numeric hard completion budget established by balance tooling |
| `stuckTimeoutTicks` | integer | No-progress failure threshold |
| `maxIllegalActions` | integer | Normally zero |
| `requiredObjectiveIds` | string array | Must match required objectives |
| `expectedCompletion` | boolean | True for every released campaign validation run |
| `expectedChecksum` | string or null | Non-null only for the frozen checksum benchmark set |
| `parTicks` | integer | Balance comparison, distinct from hard max |
| `dependencyHashes` | record | Simulation schema, post-resolution canonical effective level data hashes (full content and simulation-affecting subset, including preset versions/content), balance data, and policy/replay format |

Every ordinary released level requires at least one `live-agent` Standard run. Boss and named-elite levels should use that mode when practical but may substitute a reviewed `reference-replay` run for bespoke mechanics. Every difficulty and supported assist combination receives static graph, objective, lock/key, resource, and timing validation; selected named benchmark levels also receive Story/Hard/assist execution spot checks.

Only the canonical runs in the versioned frozen benchmark manifest pin `expectedChecksum`. The current six-level set is `level-001`, `level-003`, `level-005`, `level-006`, `level-008`, and `level-010`; the complete 36-level live-agent suite separately gates every campaign level on completion, objective set, legality, stuck timeout, tick budget, and repeated deterministic checksum. Changing the frozen set is a reviewed benchmark change rather than an automatic consequence of adding content.

Dependency hashing occurs after every `PresetBinding` is resolved and canonical effective level data is materialized. The manifest records both full resolved-content provenance and a simulation-affecting effective-data hash; editing a shared difficulty, economy, checkpoint, or other simulation-affecting preset therefore invalidates every dependent replay/checksum, while a proven presentation-only change need not create simulation checksum churn. Any simulation-schema, simulation-affecting balance, effective level-data, policy, or replay-format change that alters a replay dependency requires the named owner to review and re-record the affected reference; the pull request explains the invalidation and provides before/after validation results. A level can still fail human review for being confusing, boring, unfair, or badly paced.

### A.12 `PerformanceSpec`

| Field | Type | Constraints |
|---|---|---|
| `maxActiveRobots` | integer | `1..24`; never exceeded by encounters |
| `maxActiveProjectiles` | integer | Fixed bounded pool budget |
| `maxActivePickups` | integer | Fixed bounded pool budget |
| `maxHazards` | integer | Fixed bounded simulation budget |
| `maxMazeNodes` | integer | Bounds navigation and snapshot size |
| `maxRenderInstances` | integer | Presentation/content warning; does not change simulation |
| `expectedPeakDrawCalls` | integer | Validation target |
| `expectedPeakMemoryMb` | integer | Validation target |
| `benchmarkScenarioIds` | string array | Required stress/replay scenarios |

### A.13 Root validation invariants

Release export fails unless all invariants pass:

1. Level IDs and numbers are unique, contiguous, and agree from 1 through the released maximum.
2. Chapter membership and chapter boss rules are consistent.
3. Every reference resolves to the correct type.
4. Objective dependency graphs and encounter trigger graphs are acyclic unless an explicitly supported loop type is declared.
5. Maze solvability, key/lock ordering, critical route, player clearance, spawn validity, and exit reachability pass.
6. Static graph, objective, lock/key, resource, and timing analysis passes for every supported difficulty/assist combination; declared Story/Hard/assist benchmark runs pass their individual budgets.
7. Concurrent robot count never exceeds 24; queued waves are not active entities.
8. Attack telegraphs meet accessibility and reaction-time floors after difficulty multipliers.
9. Dance attack/vulnerability beats map exactly to fixed simulation ticks.
10. Economy/ammunition analysis shows a conservative completion path.
11. Every visible string key exists in every release locale or approved fallback.
12. Every asset ID exists in the provenance manifest with an approved license.
13. Every checkpoint restores a solvable, reward-consistent state.
14. Every declared agent-validation run completes within its `maxTicks`, produces its approved result and any checksum required by the frozen subset, has current dependency hashes, and uses no hidden state.
15. Performance/content budgets pass the fixed stress harness.
16. Canonical serialization is stable and produces a reviewable diff.

### A.14 Minimal conceptual Level 1 record

This non-executable illustration shows how the fields connect; exact serialization is generated by the tooling phase. Its numeric values are illustrative draft inputs, not approved balance targets. Agent tick budgets come from measured agent runs and safety margins, never by converting the human 5–12-minute session target into ticks:

```text
schemaVersion: 1
id: level-001
number: 1
chapterId: chapter-01
nameKey: levels.001.name
briefingKey: levels.001.briefing
seed: campaign-level-001-v1
palette: { presetId: neon-workshop-01 }
maze:
  templateSetId: workshop-basic
  criticalPathRooms: 4..5
  optionalRooms: 1..1
  entranceNodeId: room-entry
  exitNodeId: room-exit
objectives:
  - id: deactivate-scouts
    type: deactivate
    required: true
encounters:
  - id: tutorial-wave
    roomNodeId: room-floor
    waves: [wave-001]
dance:
  presetId: wobble-march
  bpm: 96
  timeSignature: 4/4
difficulty: { presetId: standard-tutorial-001 }
economy: { presetId: economy-tutorial-001 }
checkpoints:
  - { presetId: checkpoint-entry }
  - { presetId: checkpoint-before-exit }
audio: { presetId: audio-neon-workshop-001 }
mastery:
  - { presetId: accuracy-bronze }
  - { presetId: par-time }
  - { presetId: all-secrets }
agentValidation:
  tier: ordinary
  owner: gameplay-qa
  runs:
    - id: standard-live
      mode: live-agent
      policyId: baseline-campaign-agent
      policyVersion: 1
      referenceReplayId: null
      seed: campaign-level-001-v1
      difficulty: Standard
      assistProfileId: null
      maxTicks: 18000
      stuckTimeoutTicks: 900
      maxIllegalActions: 0
      requiredObjectiveIds: [deactivate-scouts]
      expectedCompletion: true
      expectedChecksum: null
      parTicks: 9000
      dependencyHashes: generated-by-release-export
performance:
  maxActiveRobots: 6
  maxActiveProjectiles: 16
tags: [tutorial, workshop, gun, scouts]
```

Before Phase 5 exits, this conceptual contract must become one strict TypeScript definition, one generated JSON Schema, one canonical serializer, and one validator suite used by the engine, editor, CI, and campaign data.
