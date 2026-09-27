# Privacy

Zama Sniper is offline-first. The current release requires no account, analytics, advertising, telemetry, cloud save, or runtime network service.

Campaign progress, settings, upgrades, medals, and replay data stay on the player's device. Browser builds use local IndexedDB storage. Packaged Tauri builds use an app-specific local profile file; import and export occur only after the player chooses a file through the user interface.

Development-only agent-enabled builds can expose the documented local LLM control interface to software on the same page. Normal production builds do not expose mutation-capable agent methods. The game does not transmit LLM prompts or gameplay observations.

If telemetry is proposed later, it requires a separate design and privacy review, explicit opt-in, plain-language disclosure, deletion and disable controls, and a new revision of this notice before collection begins.

