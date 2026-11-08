# Compact layout checkpoint — 2026-11-09

Halftone plans both visible numeric readings together, choosing the largest
complete shared size within the existing pose range. Measurement and drawing
reuse the same two fits, including unit placement, required symbols and captions.
Empty, text-only, bitmap-only and unavailable homes do not shrink a sole number.
Unfittable numbers use the existing overflow label. Wrapped overflow also reserves
its second line before placing the clock/activity; a production measurement
regression covers this case. Face fonts, clock sizes, artwork, palettes, provider
values/units and public protocols remain unchanged.

Candidate: `build/candidate/Halftone-1.9.0.pbw`

SHA-256: `7a4cef97c41c57d572814e69e0d8064eaf43b7ec597a294624ae0f028a8c94a0`.

`npm test`, `npm run build`, `npm run check:artifact` and
`npm run check:config` passed. Portable checks cover equal points, largest-fit
boundaries, slot reversal, required symbols/captions, single numeric homes and
full overflow. The production measurement entry point is compiled separately to
regress overflow line reservation.

`build/qa/compact-matrix/` contains hash-bound native captures at actual OS
Small/Medium/Large, both themes and idle/activity/Peek. 6 runs / 468 captures passed. Each combination covers
1°C/35%, reversal, negatives/decimals, 100%, long/overflow values, either single
home, numeric plus text/bitmap/unavailable and accented captions. Halftone also
runs Bigger Text/depth/shadow off and on. `reading-review.png` boards assemble
untouched frames. These use synthetic public readings through the production
phone host and wire encoder; no live provider is implied.

All 24 phone preview frames were regenerated from native screenshots and embedded
in `src/pkjs/settings-preview.js` and the packaged configuration. Their capture
record is in `build/qa/compact-preview-source/native-previews/`; package audits
verify that their native renderer and resources match this candidate exactly.

Source checks use the available Node 26.12.0 / Python 3.13.16 and the existing
workspace recovery environment; the exact contributor runtime pins were not
available. Native builds use SDK 4.33.1 / CLI 5.0.40. Emulator firmware is v4.33.2.
No physical watch, real paired phone/provider, or actual Czech/German language
pack was tested. Candidate versions and public identities remain unchanged.
No release, push or publication is part of this checkpoint.
