# Working on Halftone

Halftone is a Pebble Time 2 / Emery-only watchface (200 × 228). Read the
[README](README.md), [current validation](docs/VALIDATION.md) and the relevant
feature guide before changing behavior. Keep historical validation results
attached to their version; record new results separately.

## Ownership and compatibility

- `src/c/halftone.c`, `watch_layout.h`, `reading_presentation.h`, fonts and
  `context_text_metrics.h` own Halftone's rendering. Preserve the black zig-zag
  dot border, rounded corners and three/four-step depth options unless a design
  change is requested. Dot spacing is 10 px; neighboring rings have alternating
  half-step phases. Evaluate border changes in actual native renders.
- There is one adaptive layout with a saved **Big text** option. The first two
  global complications have fixed left/right positions; both remain above
  music, notifications and native Timeline Peek. Choices 3–5 are ignored by
  subscriptions, display and the phone cache. Do not copy another face's text
  mode or layout rules into Halftone.
- [Pebble Watchface Core](docs/SHARED-CORE.md) owns subscriptions, serialized
  transport and native data/cache/session logic. Halftone pins **0.1.0** in
  `vendor/`, `package.json`, `package-lock.json` and `vendor/CORE.json`. Other
  consumers select their own versions. Update this pin deliberately and run
  host tests/renders; never edit installed `node_modules` as the source fix.
- Keep the UUID `d4dd5046-53be-4624-99e8-46e0b377fe66`, existing persistent key
  ranges, session token and legacy `halftone-complications-v1` cache namespace.
  AppMessage keys are append-only: do not remove, reorder or repurpose the 31
  existing keys, including retired weather keys. Keep the v1/v2 decoder and
  reconnect-session contract documented in [dynamic content](docs/DYNAMIC-CONTENT.md).

## Data, privacy and presentation

- Weather comes from the two global source choices, with provider formatting
  and units preserved. Do not add a weather HTTP client, provider override,
  local temperature conversion, hourly cache or implicit fallback. Only a
  recognized weather precipitation probability gets the rain treatment;
  arbitrary percentages must not become rain. See [weather setup](docs/PLUGIN-WEATHER.md).
- A selected unavailable reading is `--`; an unconfigured one is blank without
  moving the other. Preserve source confirmation/expiry: generic readings last
  at most two hours and replay does not renew them. Series-only data is unsupported.
- Contextual music/phone state has a 120-second maximum confirmation lease;
  notifications last at most 12 seconds. Notifications take priority over music,
  paused music yields after five seconds and Timeline Peek owns its native panel.
  Notification summaries/body are opt-in and default off. Preserve baseline
  suppression across start, reconnect and reconfiguration, plus immediate
  privacy/expiry/disconnect clears. Halftone adds no notification vibration.
- Context panels are not persisted or logged. A music/notification property
  selected as a global complication follows Core 0.1.0's separate generic cache
  rules; do not promise newer Core exclusions. See [privacy](store/PRIVACY.md).
- Preserve artwork limits and fitting: incoming images max 24 px; context art
  boxes 32 px standard/40 px Big for two lines, 28 px for one. Music crops to a
  centered square; notification/generic art uses contain-fit. Align visible art
  to fitted text ink, excluding shadows and transparent padding. System emoji
  follow firmware baselines. Long titles use ellipsis and may hide artwork.
- Keep the 180 ms dissolve bounded and limited to real incoming content changes.
  Clock/date/bezel stay still during frames; repeated snapshots do not replay it.
  Settings must remain readable in light/dark modes and existing translations.
- The documented plugin contract targets mobile 1.16.0.5 with preview enabled;
  built-in music/notifications are Android features. `ReadMusic` is declared;
  other selected-source access is handled through Pebble. Do not claim emulator
  fixtures establish live phone/plugin or physical PT2 coverage.

## Verification and release

```sh
npm ci --ignore-scripts
npm test
python3 -m unittest discover -s tests -p test_github_release.py
```

`npm test` verifies the pinned Core archive, runs JavaScript tests and compiles
the strict native suites. For native/font changes, also run:

```sh
pebble clean
pebble build
python3 scripts/package-beta.py
python3 scripts/check-clock-fonts.py --pbw dist/Halftone-1.9.0-rc.6.pbw
```

Use the intended release filename after a version change. Regenerate context
metrics with the font checker's `--write-context-metrics` option when font inputs
change, then rebuild/package and verify again. Review affected native states,
both text sizes, localized dates, images and Peek. Reuse unchanged measured
results; do not present historical or unperformed checks as a fresh run.

Follow [GitHub releases](docs/GITHUB-RELEASES.md): test/package the PBW and matching
archives, update checksums/notes, commit locally, run the release-helper `prepare`
against committed `HEAD`, then push to `main`. The workflow publishes checked
files; it does not build the SDK project. Preserve existing tags and published
asset bytes; changed packages need a new version/candidate. Documentation-only
changes do not require repacking the published rc.6. Appstore submission is
separate and remains subject to the [publishing checklist](store/PUBLISHING.md).
