# Halftone parity candidate — 2026-11-07

This is a local development candidate, with SDK version label 1.9.0. The published
v1.9.0-rc.6 files, release tags and historical validation remain unchanged.
This development implementation is separate from the frozen prerelease. No new
release archive or store submission is part of the source update.

Candidate: `build/candidate/Halftone-1.9.0.pbw`

SHA-256: `1181ac753d34d25cc831004d031660d252362d5412a41fe45778e6c977117abb`

## Changes

Core 0.5.2, Activities 0.4.4 and UI 0.1.1 bring current readings, activity priorities,
Timer/plugin support, presentation-confirmed Open Activity navigation, transient private
context and reliable settings delivery. Halftone retains its UUID, original key numbers,
cache namespace, centered Fira clock/value shapes, black dot border, Big text, depth
and shadow. Real SDK numeric preference keys (10000-based) migrate alongside named keys.
Legacy private cache records are scrubbed before source discovery; public validity is
preserved without renewal. New notifications and additional vibration default Off.

Visual review corrected content-layer clipping, date overlap in Big text, and notification
body fitting. Previews use native Halftone images and explicitly identify their standard
text/three-step/no-shadow sample style. CI selects the committed Node/Python versions;
configuration generation reads the locked Clay ZIP directly on fresh installs.

## Verification

- Node 22.23.4 / Python 3.12.15: **264 JavaScript tests, 20 strict C99 suites and two
  native callback tests pass**. Workflow guards pass (seven checks; two library-only
  checks skipped). Eighteen release-helper tests and two dependency-pin tests pass.
- SDK 4.33.1 builds and permission packaging pass. Artifact checks verify source
  fingerprints, UUID, message-key numbering, permissions, navigation manifest,
  configuration, exact SDK payloads and linked Fira point/contour/glyph tables.
  Fira regeneration and bundled configuration checks pass.
- Exact installed Core, Activities and UI files match their committed archives.
  A fresh `npm ci` was not completed: this sandbox's offline registry cache lacks
  some registry archives. The existing locked dependencies were reused for this build.
- Fresh Emery/QEMU evidence covers **24 native previews**, **68 activity compositions**,
  four independent clock updates without fixture resends, and ten standard/Big optical
  combinations. Relaunch produces identical public readings/appearance and advances
  the native session. These are injected fixtures, without a live phone runtime.
- Motion capture contains intermediate idle/activity layout frames. Peek and the brief
  replacement dissolve were observed at endpoints; screenshot timing did not establish
  their intermediate frames or physical-watch timing. Portable tests cover bounded
  motion, repeated snapshots and covered-view scheduling.
- The final PBW's native binary and resources match the captured candidate byte for
  byte. Its native manifest differs only in `generatedAt` after refreshing packaged
  JavaScript/configuration. Capture records retain their original package hashes.
- Application/source whitespace checks pass. The imported Roboto OFL notice keeps
  its original bytes, including upstream trailing whitespace. Published artifact directories have no changes.

Disposable evidence is under `build/qa/`: `final.json`, `artifact.json`, `fonts.json`,
`native-previews/`, `activities/`, `compatibility/` and `motion/`. The contact sheet is
`build/qa/halftone-review.png`. A clean SDK build can remove this disposable evidence.

## Remaining verification

Chromium exits before creating a debugging endpoint because this sandbox denies a
crash-handler socket operation (`setsockopt: Operation not permitted`). Actual Clay
serialization/configuration tests pass; fresh browser interaction remains unverified.
Physical Android/Pebble delivery, live providers, hardware motion, runtime heap/stack
high-water marks and battery consumption were not tested. SDK footprint/resource
reports are build-time measurements and do not establish those properties.

## Settings preview correction

Custom recoloring now fills the spaces between the black bezel dots, removing the white
edge bands. Accent fallback follows native contrast rules, provider artwork keeps its
palette, and the canvas retains its aspect ratio on narrow screens. Four regression
checks were added; all 264 JavaScript tests pass. The SDK bundle and artifact/configuration
checks pass. Native binary/resources are unchanged from the validated candidate above.

Fresh Emery captures verify the recolored bezel pixel-for-pixel in Idle, Music and Peek
(15,808 / 15,808 / 13,072 checked pixels, zero differences). Evidence is in
`build/qa/settings-preview-fix/`; its comparison shows preview pixel output alongside
native captures. Chromium remains blocked by the same sandbox socket restriction;
this comparison is not a browser interaction or physical-device claim.

## Localization verification — 8 November 2026

The existing 17-language watch/settings catalogues remain complete. The current
portable suite, dependency verification, configuration generation and candidate
artifact checks pass. This verification does not replace the native preview or
physical-device scope recorded above.
