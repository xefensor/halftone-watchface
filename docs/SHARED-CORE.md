# Shared core migration — 1.9.0 rc.6

Halftone now consumes [Pebble Watchface Core 0.1.0](https://github.com/xefensor/pebble-watchface-core).
The shared package contains the C data/lifecycle engine and the phone-side
JavaScript source coordinators. [Dynamic](https://github.com/xefensor/dynamic-watchface)
uses the same release with its own borderless renderer.

## Ownership

| Shared core | Halftone host |
| --- | --- |
| Complication/context packet validation and state | Dot border, layers, geometry and fonts |
| Source subscriptions and serialized transport | Clay form, translations and saved appearance settings |
| Confirmation leases, expiry and cache chunks | SDK timers/services and one AppMessage dispatcher |
| Reconnect/session and notification-baseline bookkeeping | Existing UUID, permission manifest and session-key persistence |

The compatibility headers and phone-side adapter files under `src/` keep the
existing project paths. They delegate to the package rather than maintaining
independent copies of the engine. The complication adapter passes the legacy
`halftone-complications-v1` phone cache key. Native cache chunks retain their
existing key range, and the host persists the session token under its existing
key. Source timestamps and expiry times are preserved when loading cached data.

The extraction keeps the two selected horizontal readings, Timeline Peek
behavior, notification privacy defaults, artwork sizing/alignment and Halftone
appearance. Font fitting and generated glyph metrics remain in this repository;
they belong to its exact compiled font resources. Build-specific test and
rendering results are recorded in [validation](VALIDATION.md).

## Pinned dependency

`package.json` references `vendor/pebble-watchface-core-0.1.0.tgz` with a `file:`
dependency. The lockfile pins the archive's integrity, and `vendor/CORE.json`
records upstream/version/checksum provenance. `npm ci` installs that exact
release; building does not fetch a moving branch or require an npm account.

To update the dependency, first build/test a new core release. Copy its exact
tarball into `vendor/`, update the dependency and lockfile, and refresh the
provenance record. Then run Halftone's portable tests, SDK build, packaged-font
checks and native layout comparisons before releasing a new PBW. Keep the
previous release artifact until the replacement has passed those checks.

The shared code is bundled in the PBW. Updating its repository alone does not
change installed watchfaces; each app is rebuilt and released independently.
The project's existing noncommercial/attribution license still applies.
