# Catch Davel release checklist

This checklist separates reproducible engineering evidence from owner approvals, human review, signing, and distribution actions. A checked engineering item is not a claim of platform certification or company approval.

## Reproducible engineering gate

- [x] All 36 authored levels pass schema, localization, provenance, reachability, deterministic campaign-agent, balance, and difficulty validation.
- [x] The same fixed-step simulation serves human input, Workers, tests, replays, and LLM agents.
- [x] The production renderer is raw WebGL2 and has OffscreenCanvas enhancement, main-thread fallback, and context-loss recovery.
- [x] The production web build is offline and has no runtime network dependency.
- [x] Default production builds hide mutation-capable agent APIs; agent sessions use isolated progress.
- [x] Versioned save migration, alternating recovery, import/export, and packaged file-backed persistence are tested.
- [x] Windows development-host executable/MSI/NSIS and Android debug APK build paths have been exercised.
- [x] English and Arabic/RTL presentation and the accessibility settings baseline are covered by automated browser checks.
- [x] Asset provenance is complete and the current build distributes no third-party media.
- [x] The canonical Level 36 conclusion is localized and appears only after the final authoritative victory result.
- [x] Web and Tauri frontend builds embed byte-identical license, credits, privacy, security, source-offer, trademark, and asset notices; the release-evidence tool rejects missing or altered copies.
- [x] A fail-closed release-evidence command records the exact commit, HTTPS source location, and SHA-256/size of every uniquely named selected artifact.

Run the current local gate from the repository root:

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
npm run game:release:evidence:test
npm run game:tauri:test
```

## Human and owner gates

- [ ] Quantum Billing approves the final title, logo/robot permission record, MIT code license, original-asset license, and [trademark policy](../../TRADEMARKS.md).
- [ ] Named owners accept choreography/music, content tooling, replay maintenance, and release QA responsibilities.
- [ ] A trained content designer completes the one-working-day Phase 6.5 acceptance session and signs its report.
- [ ] Human playtest reviewers sign off Level 1 onboarding, desktop/mobile control feel, all-level fun/readability, economy/pacing, and the Level 36 ending.
- [ ] English and Arabic language reviewers approve player-facing text.
- [ ] The final audio mix is reviewed at Wide, Balanced, and Night dynamic ranges.
- [ ] Security and privacy reviewers approve [SECURITY.md](../../SECURITY.md), [PRIVACY.md](../../PRIVACY.md), CSP, capabilities, and import/export behavior.

## Packaging and distribution gates

- [ ] Select the official release targets and version number.
- [ ] Rebuild installers/APKs from the release commit and record artifact hashes.
- [ ] Apply release signing/notarization using owner-controlled credentials; never commit credentials.
- [ ] Smoke-test every selected package, restart persistence, import/export pickers, suspend/resume, fullscreen, and offline launch.
- [ ] When desired, record optional physical-device certification without retroactively changing development evidence.
- [ ] Capture final screenshots, icons, descriptions, accessibility disclosures, and store metadata for each selected distributor.
- [ ] Confirm the built-in [CREDITS.md](../../CREDITS.md), [LICENSE](../../LICENSE), asset notices, [source offer](../../SOURCE.md) and manifest URL, privacy notice, and trademark notice are present in every selected final artifact.
- [ ] Publish source and packages from the exact reviewed tag, then verify checksums and download/install paths.

The release gate passes only after every applicable unchecked item has a named approver, dated evidence, and no critical unresolved issue.
