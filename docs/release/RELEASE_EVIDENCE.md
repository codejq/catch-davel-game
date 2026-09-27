# Release artifact evidence

This procedure creates the machine-readable checksum record used for a reviewed Zama Sniper release. It does not select targets, sign artifacts, or publish anything.

## Contract

`release-evidence.json` records:

- schema version, product version, exact Git commit, and whether tracked files were dirty;
- the official HTTPS corresponding-source URL;
- target, filename, repository-relative path, byte length, and SHA-256 for every selected artifact;
- byte length and SHA-256 for every required notice embedded in `game/dist/legal/`.

The command fails when the tracked worktree is dirty, a target is duplicated, an artifact is missing or not a regular file, a notice is missing or differs from its repository source, the version is not explicit semantic versioning, the source URL is not HTTPS, or the output already exists. `--allow-dirty` and `--force` exist only for rehearsal; evidence produced with `trackedWorktreeDirty: true` is not releasable.

## Reviewed-release procedure

1. Select and record the official version and target set in the release checklist.
2. Update package metadata, commit it, run the complete reproducible engineering gate, and confirm `git status --short` is empty.
3. Build every selected package from that commit and apply owner-controlled signing outside the repository.
4. Generate evidence from the repository root. Repeat `--artifact` once per uniquely named target:

```powershell
npm run game:release:evidence -- `
  --version 0.1.0 `
  --source-url https://example.invalid/quantum-zama-sniper/releases/v0.1.0 `
  --artifact windows-msi=game/src-tauri/target/release/bundle/msi/Quantum-Zama-Sniper_0.1.0_x64_en-US.msi `
  --artifact android-arm64=path/to/app-arm64-v8a-release.apk `
  --output release-evidence.json
```

The URL above is syntax-only and must be replaced by Quantum Billing's real source location. Never publish an evidence file containing `example.invalid`.

5. Review the JSON, smoke-test the exact hashed files, publish their exact source tag/archive, then verify downloaded copies against the manifest hashes.

Run `npm run game:release:evidence:test` to test strict arguments, notice equality, and tamper rejection without producing release evidence.
