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

Ordinary web builds continue to use the verified alternating-record IndexedDB repository. A bundled Tauri webview selects `PackagedProfileRepository` through Tauri's runtime marker and calls a narrow Rust profile bridge:

- `load_packaged_profile` returns the current and previous candidates from the app-specific data directory;
- `store_packaged_profile` accepts at most 4 MiB of JSON, durably writes a pending file, rotates the current file to the recovery path, activates the pending file, and synchronizes the directory where supported.
- `export_packaged_profile` accepts only the validated profile text, opens a native save picker, and writes only the path chosen in that invocation;
- `import_packaged_profile` opens a native single-file picker and returns at most 4 MiB of UTF-8 text for strict TypeScript validation.

The TypeScript side still performs the authoritative strict profile/schema/checksum validation. It tries the previous file only when the current candidate is absent or corrupt, and it reads back and verifies the activated profile after every write or import. Fixed save paths are resolved entirely in Rust under Tauri's `app_data_dir()/profiles/default`; transfer paths come only from a native dialog and are never supplied by or returned to the webview. Clearing WebView storage therefore does not clear packaged campaign progress. Browser builds expose the same human-readable JSON contract through a download and user file picker.

## Capability and lifecycle policy

The only declared window capability is `core:default`; no generic dialog, filesystem, or shell command is exposed to JavaScript. The native dialog/filesystem plugins are registered solely so the dedicated Rust transfer commands can support desktop paths and mobile content URIs. The CSP permits bundled scripts/styles, IPC, the local Vite development connection, data icons, WebAudio media, and same-origin/blob workers needed by the simulation and OffscreenCanvas renderer. Background visibility pauses realtime authority, clears held input, and queues a checksum-sealed profile with `lastCleanShutdown: true`. Resuming a live human session marks it active again and resumes only if the game—not a campaign menu, terminal state, or agent—was running before suspension. This makes an OS kill after a completed suspend save recoverable without relying on an asynchronous `pagehide` write.

Coarse-pointer devices receive a safe-area-aware virtual movement stick, drag-to-aim on the game view, hold/toggle sprint and firing, alternate-attack, and unlocked-weapon-cycle controls. These controls normalize into the same bounded `PlayerCommand` submitted by keyboard, mouse, gamepad, replay, and LLM play; there is no mobile-only simulation or replay path. A mobile Chromium production profile verifies the four-button touch layout, RUN/fire toggle behavior, and start gesture, while physical-device feel and lifecycle certification remain deferred until hardware is available and never blocks implementation.

## Native build evidence for milestone `a771b2a`

On the Windows development host:

- optimized x86_64 executable: 10,998,784 bytes, SHA-256 `11cfb2cbed939b0fade749075efa0482ce5de1b41840ba1ea1d00270aad2ca80`;
- x86_64 MSI: 3,633,152 bytes, SHA-256 `5fcbf34036353cc3cb99a6e8f63219f396f2c96201346520042f71dde685cb95`;
- x86_64 NSIS setup executable: 2,485,855 bytes, SHA-256 `52f1337cd6151418dab4b28689d7f7cde573943b37c0b2b289cc9f492cb89bb9`;
- ARM64 debug APK: 128,285,738 bytes, SHA-256 `64bb6df60ceb1f0d24778e8fe0b663ea9e17ba4b0d85536c808ae56b49443f50`;
- x86_64 debug APK: 128,715,759 bytes, SHA-256 `87667e00fab162bc84bfb39afbdd298eac6c63dbcfa1d1df2808c4ce21ab6baf`;
- five Rust rotation/interruption/bounds/native-transfer tests and six TypeScript corruption/fallback/read-back/transfer tests pass.
- current packaged smoke launch opened a responsive `Quantum Catch Davel` window (process 17900 for this run) and retained its valid profile at `%APPDATA%/com.quantumbilling.catchdavel/profiles/default/profile.json`.

Build artifacts and native target caches are intentionally ignored. These hashes identify milestone `a771b2a`; later source changes require a fresh hash set before release. Installer restart, native picker behavior, Android emulator/device behavior, touch feel, OS lifecycle edge cases, and signed release bundles require their named validation gates. Physical-device absence does not block further implementation and is never represented as certification.

The shell follows Tauri's official [project structure](https://v2.tauri.app/start/project-structure/), [capability](https://v2.tauri.app/security/capabilities/), [configuration](https://v2.tauri.app/reference/config/), [dialog](https://v2.tauri.app/plugin/dialog/), and [filesystem](https://v2.tauri.app/plugin/file-system/) contracts.
