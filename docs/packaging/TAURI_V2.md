# Tauri v2 packaging and packaged persistence

Date: 2026-08-16

The production Vite output is embedded unchanged in a Tauri v2 shell. The browser remains responsible for presentation and input; the Rust layer owns only the native window and the fixed-path packaged profile transaction. No Three.js or native game engine is introduced.

## Commands

From the repository root:

```powershell
npm run game:tauri:check
npm run game:tauri:test
npm run game:tauri:build:binary
npm run game:tauri:build
npm run game:tauri:android:init
npm run game:tauri:android:debug
```

`game:tauri:build:binary` creates the optimized executable without installer bundling. `game:tauri:build` creates the configured desktop bundles. `game:tauri:android:debug` targets ARM64 devices and x86_64 emulators. Tauri normally symlinks compiled Rust libraries into the generated Android project; on Windows hosts without Developer Mode/symlink privilege, the checked-in script verifies that each library was produced, copies it into the bounded generated `jniLibs` path, and runs the same Gradle variants while excluding only the redundant Rust tasks.

## Persistence boundary

Ordinary web builds continue to use the verified alternating-record IndexedDB repository. A bundled Tauri webview selects `PackagedProfileRepository` through Tauri's runtime marker and calls only two Rust commands:

- `load_packaged_profile` returns the current and previous candidates from the app-specific data directory;
- `store_packaged_profile` accepts at most 4 MiB of JSON, durably writes a pending file, rotates the current file to the recovery path, activates the pending file, and synchronizes the directory where supported.

The TypeScript side still performs the authoritative strict profile/schema/checksum validation. It tries the previous file only when the current candidate is absent or corrupt, and it reads back and verifies the activated profile after every write. Paths are resolved entirely in Rust under Tauri's `app_data_dir()/profiles/default`; the webview cannot supply a filename or receive broad filesystem permission. Clearing WebView storage therefore does not clear packaged campaign progress.

## Capability and lifecycle policy

The only declared window capability is `core:default`; no filesystem plugin or shell access is exposed. The CSP permits bundled scripts/styles, IPC, the local Vite development connection, data icons, WebAudio media, and same-origin/blob workers needed by the simulation and OffscreenCanvas renderer. Background visibility pauses realtime authority, clears held input, queues a profile save, and resumes only if the game—not a campaign menu, terminal state, or agent—was running before suspension.

Coarse-pointer devices receive a safe-area-aware virtual movement stick, drag-to-aim on the game view, hold-to-fire, alternate-attack, and unlocked-weapon-cycle controls. These controls normalize into the same bounded `PlayerCommand` submitted by keyboard and mouse; there is no mobile-only simulation or replay path. A mobile Chromium production profile verifies the touch layout and start gesture, while physical-device feel and lifecycle certification remain deferred until hardware is available.

## Current build evidence

On the Windows development host:

- optimized x86_64 executable: 9,071,616 bytes, SHA-256 `6e3e3c0bf9a5215396fda9ad502d26d027adcc7aa20f9110a2ab89c43ecd83c7`;
- x86_64 MSI: 3,194,880 bytes, SHA-256 `5e6335dd3bd1dbbaa8305067ee445375a81b811cc78b6fa4b5797317d7bf3d0d`;
- x86_64 NSIS setup executable: 2,197,808 bytes, SHA-256 `ac2c9c7b9820e5ba212e1b41021c08dd5ac84e9f41abfdfe99f3ba5200c8c052`;
- ARM64 debug APK: 121,262,485 bytes, SHA-256 `ecc6189ef31a3a47b1b9c2860492bc3ac3b0310525fbca420d51b33352dfd498`;
- x86_64 debug APK: 121,652,930 bytes, SHA-256 `1eb240ed7731e118321e682a08066ace200fa2bd5f9c4def8883deb7921267e9`;
- three Rust rotation/interruption/bounds tests and three TypeScript corruption/fallback/read-back tests pass.
- packaged smoke launch opened a responsive `Quantum Catch Davel` window and created a valid 844-byte profile at `%APPDATA%/com.quantumbilling.catchdavel/profiles/default/profile.json`.

Build artifacts and native target caches are intentionally ignored. These hashes identify this development build only. Installer restart, Android emulator/device behavior, touch feel, OS lifecycle edge cases, and signed release bundles require their named validation gates. Physical-device absence does not block further implementation and is never represented as certification.

The shell follows Tauri's official [project structure](https://v2.tauri.app/start/project-structure/), [capability](https://v2.tauri.app/security/capabilities/), and [configuration](https://v2.tauri.app/reference/config/) contracts.
