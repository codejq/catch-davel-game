# Security policy

## Supported release

Security fixes target the latest source revision and the latest official packaged release. Unofficial forks and modified distributions are maintained by their distributors.

## Reporting a vulnerability

Do not publish exploitable details, private data, signing material, or secrets in a public issue. Report the problem privately to the Quantum Billing project owner through the private channel associated with the repository. Include the affected revision or package version, platform, reproduction steps, impact, and any safe proof of concept.

If no private repository reporting channel is configured, contact Quantum Billing through its official business contact and ask for the Catch Davel security maintainer. A public issue may state only that a private security report is pending.

## Security boundary

The game is offline-first and does not require accounts or runtime servers. Production web builds omit mutation-capable agent methods. The Tauri shell exposes only its minimum core capability and dedicated bounded profile commands; it does not expose a generic filesystem or shell API. Content data cannot contain executable callbacks, and profile/replay imports are versioned, size-bounded, and strictly validated.

