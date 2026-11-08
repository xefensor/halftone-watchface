# Readable supporting text — 8 November 2026

Halftone's supporting text now uses the normal foreground colour. This removes
the grey wash from explanatory/help text and secondary labels: black on white,
white on black and the saved text colour on a custom watchface palette.

The change affects text ink, including inverted selection text where applicable.
Font sizes, layout, saved appearance choices, artwork, decorative separators,
source validity and action availability remain unchanged.

Current candidate: `build/candidate/Halftone-1.9.0.pbw`. SHA-256:
`2447492215549e6a4cc438980f58fa0ab1d96f81e610138c0d146a28c0cc7057`.

`npm test`, `npm run build`, `npm run check:artifact` and
`npm run check:config` passed. 24 native previews were recaptured at actual OS Medium, covering light/dark, both clock formats, music, timer, notification and Peek states.
Evidence: `build/qa/text-contrast/native-previews/previews.json`. Native runs used verified Emery 4.45.0 assets;
phone APIs/providers are simulated and no new physical-device test is claimed.

The phone preview assets were regenerated from those native captures, then
rebuilt and audited against the same native code/resources with SDK timestamp
normalization. Packaged settings passed the installed Chromium checks in
`build/qa/text-contrast-browser/report.json`. These use a simulated phone bridge.
The before/after comparison keeps the complete idle/Peek frames and the watch
clock in activity layouts unchanged. Supporting glyphs now use the configured
foreground instead of a blended grey.
The same comparison also preserves the outer dot-border columns in all 24 presets.

Existing checkpoint hashes describe their original candidates; this is a new
local candidate. No version bump or release archive was created.
