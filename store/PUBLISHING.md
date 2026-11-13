# Store review kit

This directory prepares Halftone 1.10.1 for Time 2 and Round 2. Duo is deferred.
The kit is local and has not been submitted or published.

Run `npm run store:prepare`, then `npm run store:check`. Both use the exact
checked candidate PBW. `listing.json` contains the proposed fields;
`capture-provenance.json` binds the current raw screenshots to its native code
and resources. Screenshots contain synthetic sample data, with no added frame,
labels or modified pixels. Each target has its own native dimensions.

Pebble now documents plugin publishing in its
[publishing guide](https://developer.repebble.com/guides/plugins/publishing-plugins/).
The former blanket preview restriction is historical. Current phone versions
still require enabling Plugins / permissions preview as described in the
[preview guide](https://developer.repebble.com/guides/plugins/preview/).
Music and notification integration requires Android.

Xef accepted this reviewed implementation for stable release preparation on
2026-11-13. Physical coverage remains recorded separately. Before publication,
verify Dashboard ownership, an unused version and live app-owned GitHub
support/privacy URLs. Upload the exact frozen PBW after GitHub publication.
A successful local kit check establishes package consistency only.

Files with the old `emery_` naming and the old asset manifest/provenance belong
to earlier releases; they are excluded from the new kit. Historical archives,
checksums and download links remain unchanged. Current capture names use hyphens.
