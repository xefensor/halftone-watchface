# Music and Text Size checkpoint — 2026-11-09

Halftone retains its existing genuine-item dissolve. Music artwork loading uses
the existing artwork home and does not alter the title or artist geometry.

Both faces reserve the 28 px media artwork home before image bytes arrive. A
canonical music-note symbol occupies it until artwork is available (and also
serves as the fallback when no artwork exists). Arriving artwork replaces only
that home. Paused/required-caption precedence remains the same.

Text Size accepts the existing individual `TEXT_SIZE`, `APPEARANCE_MODE` and
`MANUAL_APPEARANCE` message keys as well as the atomic display snapshot. A verified
appearance save invalidates both activity and background drawing immediately.
Previously individual Text Size messages were ignored. Explicit appearance mode
keys take precedence over the legacy Night Palette boolean when both are present. Font roles and the main
clock design retain their established sizing rules.

Candidate: `build/candidate/Halftone-1.9.0.pbw`

SHA-256: `ae0ef26bc749e35c789a8c3e712c4fb93eebfd619e4f630fb85785dd8abdd00e`.

`npm test`, `npm run build`, `npm run check:artifact` and
`npm run check:config` passed. Portable regressions cover pending/loaded artwork
geometry; production fixtures preserve media identity across artwork changes.
Dynamic also covers outgoing-copy ownership, offsets, interruption, expiry,
disconnection and provider withdrawal. Existing lifecycle/navigation and native
display persistence checks pass.

Native media checks are in `build/qa/media-motion/`: 7 size/optics/Peek runs,
154 actual screenshots, both themes. Dynamic intermediate frames were
matched pixel-for-pixel to translated outgoing and incoming primary screenshots;
its static secondary was separately compared. Snapshot transfer can miss a short
intermediate frame, so only observed offsets are reported. GIFs contain actual
captured frames at a fixed review cadence and do not measure hardware latency.

`scripts/emulator-font-size-direct.py` reproduces the ignored key against the
previous candidate and passes against this one. It checks immediate native
application receipts, different Small/Large date pixels, Medium versus actual
Follow-Pebble OS size and persistence after relaunch. The packaged plugin/PKJS
bridge additionally passes all three manual sizes in idle and music layouts,
including conflicting OS settings and reopen. Phone SDK/storage are simulated;
Emery's AppMessage transport and native persistence/rendering are real emulator
execution. See `build/qa/font-size-direct/` and `build/qa/preferences-bridge/`.

All 24 phone preview images were refreshed from native rendering. The final
repack has identical tested native binary and resource bytes; the native manifest
changes only its SDK `generatedAt` metadata. The comparison and final hashes are
recorded in `build/qa/music-font-repack-provenance.json`, with a consolidated
`build/qa/music-font-summary.json` and logs in `build/qa/music-font-logs/`.

SDK 4.33.1 / emulator firmware v4.33.2; available Node 26.12.0 / Python 3.13.16
with the existing workspace recovery environment. Physical watch and real paired
phone checks remain pending. No version bump, push or publication occurred.
Earlier compact-layout reports retain their original candidate hashes.

The bridge fixture now drains the phone queue and waits for its injected
activity ACK before pumping another packet, preserving the same one-in-flight
rule as the product. Earlier interleaved QA senders could lose an ACK and time
out the test; serialized idle/music bridge runs pass.
