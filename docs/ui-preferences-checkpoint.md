# Halftone display preferences checkpoint — 2026-11-08

Local candidate only; no version change, push or publication. The preceding
[native type checkpoint](native-type-checkpoint.md) covers the original supporting
profiles, glyphs, Peek, activity layouts and preserved Fira/dot design.

## Result

Text Size independently selects Follow Pebble, Small, Medium or Large. Follow
Pebble reads the OS size on launch; manual choices select the same supporting
profiles. Bigger Text remains an independent explicit Fira clock/value control.

Appearance selects Follow Pebble, Follow Quiet Time or Manual. Manual Light/Dark
selects the saved Day/Night palette. Both palettes and all optical flags survive
mode changes. Legacy Quiet Time users migrate to Follow Quiet Time, including
supported boolean/string/numeric encodings. Other saved palettes stay Manual Light.
Raw RGB values survive before GColor quantization. A fresh phone with no explicit
native choices adopts the watch snapshot before delivering defaults.

SDK 4.33.1 has no supported system appearance API. Follow Pebble Appearance stays
saved and uses the last Manual Light/Dark fallback; the page explains this limit.
Scheduled/system appearance remains pending for a supported public SDK/API.
Quiet Time and explicit modes remain independent of unsupported system appearance.

The phone distinguishes Saved on phone from Applied on watch. Only an exact
native revision and complete 17-field receipt after persistence readback permits
Applied. Transport ACKs, previous revisions, failed saves and unrelated source
traffic cannot establish it. Failed revision storage prevents a reusable revision
from being sent. Pending choices survive reopening; bounded Retry/reconnect uses
the existing queue. Polling preserves drafts and contradictory reads clear Applied.
Each Bigger Text/depth/shadow/dissolve toggle now independently enables Save and
survives reopening; Discard restores the last confirmed optical choices.

## Candidate and verification

`build/candidate/Halftone-1.9.0.pbw` SHA-256:
`927ec1e80c1c0d7008dfb3d20d6eaa263da1c2d3c114ed87aa283a65a961a9e7`.
SDK 4.33.1 / CLI 5.0.40; Node 26.12.0 / Python 3.13.16 were available locally.
The documented Node 22 / Python 3.12 pair was unavailable.

- `npm test`, `npm run build`, `npm run check:artifact` and `npm run check:config`
  pass. The suite includes 275 JS cases, 21 portable native C programs, actual
  lifecycle callbacks and the production display codec/store/palette/profile
  routines. Coverage includes all 16 optical combinations, all manual/OS mappings,
  both Quiet Time boolean states, independent Manual/unsupported Follow modes,
  failed/readback-corrupt storage, raw RGB and optical migration, stale receipts,
  bounded retries, late callbacks and normalized older boolean encodings.
- `node scripts/check-display-migration.cjs` executes the exact packaged plugin
  and PKJS against all eight older boolean encodings. Read-only loading preserves
  old settings and raw colours; the native-bound frame selects the correct mode.
  Its exact receipts/transport are simulated. Evidence:
  `build/qa/display-migration/report.json`.
- `python3 scripts/emulator-preferences-bridge.py --optics 0/1` runs the exact
  optimized packaged PKJS/plugin against the final native payload. All three
  manual sizes match corresponding actual OS-size date/activity pixels and
  survive relaunch with a conflicting OS size. Changing from another live type
  profile remeasures the activity. Both palettes, retained Follow/Night fallback,
  stored Quiet Time mode and all four optical choices survive relaunch. Source
  observation is fixed at its original fixture timestamp through preference changes.
  Phone SDK/storage are simulated; native protocol, persistence and painting run
  in QEMU. Evidence:
  `build/qa/preferences-bridge/1794168227373314581/report.json` (4.45.0, optics off),
  `build/qa/preferences-bridge/1794168227388258395/report.json` (4.45.0, optics on),
  `build/qa/preferences-bridge/1794168227372758760/report.json` (4.33.2, optics on).
- `node scripts/check-settings-stay-open.cjs` passes 12 checks with 13 raw Chromium
  captures of the exact final HTML/PKJS/plugin. Coverage includes 320/360px,
  Light/Dark, English/Czech and all 17 dictionaries, raw palettes, independent
  Android stores, active-writer handoff, Save/Discard/reopen/failures, enlarged text,
  Manual Night, unavailable Follow, Quiet Time, pending/applied state, contradictory
  reads and all four optical controls. Evidence:
  `build/qa/settings-stay-open/report.json`.
- Six current-firmware native matrices cover actual OS sizes 1/2/3 with Bigger
  Text/depth/shadow off and on. Each has 24 actual idle, activity and Peek scenes,
  both themes and both clock formats. All 144 clock/dot comparisons against the
  accepted preceding candidate pass at matching settings/data. Evidence:
  `build/qa/preferences-size-{1,2,3}-optics-{0,1}/size-checks.json` and its
  `native-previews/previews.json`, summarized by
  `build/qa/preferences-comparisons.json`. A labelled comparison without rescaling
  device pixels is `build/qa/preferences-before-after-large.png`.
- Active preview assets come from the fresh Medium/classic native matrix. The
  final package has the same native code/resources, differing only at the verified
  SDK resource timestamp. Live timer values may advance during transfer; their
  reports require equality outside the stated running value region and do not
  claim all-pixel equality. Raw PNGs remain untouched. Other scenes settle fully.
- The artifact audit confirms original Fira point/contour/metric tables and eight
  complete Roboto PFOs. Resources remain 260,444 bytes. Compact key references,
  field validation, weekday language codes and narrower constant tables preserve
  all values while fitting the unchanged SDK limit: native virtual/static extent
  65,482 bytes, **53 bytes below** 65,535. No glyphs or optical choices were removed.
- `python3 scripts/emulator-display-heap.py` measures final native startup after
  loading all eight fonts on 4.45.0: native state 15,352 bytes, free heap 43,004.
  Evidence: `build/qa/preferences-heap/report.json`. This is a startup measurement,
  not a repeated-settings peak/leak measurement.

## Remaining cross-project and physical scope

Published-build upgrades, mixed-version Timer delivery and provider-to-face weather
acceptance remain in the cross-project stage. No physical phone or Time 2 was
available. The emulator bridge stores/reloads Quiet Time mode; portable tests
exercise the actual palette resolver with both Quiet Time states. It does not
claim an actual system Quiet Time toggle run.

On hardware, retain custom Day/Night colours, Bigger Text/depth/shadow settings
and an activity's original expiry. Disconnect, save a size and Manual Dark, reopen
settings, reconnect and check pending becomes applied. Relaunch against another
OS size, then restore Follow Pebble text. Toggle actual Quiet Time in Follow Quiet
Time, Manual and unsupported Follow, checking only the selected mode switches.
Open/close Peek with both optical extremes, confirm clear dates/labels/units and
correct painted navigation roles, then verify the activity keeps its original expiry.
